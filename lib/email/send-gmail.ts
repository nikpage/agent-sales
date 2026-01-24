// lib/email/send-gmail.ts

import { supabase as defaultSupabase } from '../supabase';
import { google } from 'googleapis';
import type { SupabaseClient } from '@supabase/supabase-js';

// Validate required environment variables
const requiredEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

const MAX_RETRIES = 3;
const GMAIL_SEND_DELAY_MS = 1000;

interface SendEmailParams {
  action_id: string;
  user_id: string;
  to: string;
  subject: string;
  text_body: string;
  html_body: string;
}

interface EmailRecord {
  id: string;
  action_id: string;
  status: string;
  retry_count: number;
  last_retry_at: string | null;
  created_at: string;
}

export async function sendGmail(params: SendEmailParams, supabase: SupabaseClient = defaultSupabase): Promise<void> {
  let emailRecordId: string | null = null;

  try {
    // 1. Check for existing email record (idempotency)
    const { data: existing, error: fetchError } = await supabase
      .from('emails')
      .select('id, action_id, status, retry_count, last_retry_at, created_at')
      .eq('action_id', params.action_id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let emailRecord: EmailRecord;

    if (existing) {
      emailRecord = existing as EmailRecord;
      emailRecordId = emailRecord.id;

      // Stop if already sent or bounced
      if (emailRecord.status === 'sent' || emailRecord.status === 'bounced') {
        console.log(`Email already processed: ${emailRecord.status}`);
        return;
      }

      // Hard stop: max retries reached
      if (emailRecord.retry_count >= MAX_RETRIES) {
        await supabase
          .from('emails')
          .update({ status: 'failed' })
          .eq('id', emailRecord.id);
        console.log(`Max retries reached for action_id: ${params.action_id}`);
        return;
      }
    } else {
      // 2. Create pending record first
      const { data: newEmail, error: insertError } = await supabase
        .from('emails')
        .insert({
          action_id: params.action_id,
          user_id: params.user_id,
          to: params.to,
          subject: params.subject,
          text_body: params.text_body,
          html_body: params.html_body,
          status: 'pending',
          retry_count: 0,
          bounced: false
        })
        .select('id, action_id, status, retry_count, last_retry_at, created_at')
        .single();

      if (insertError) throw insertError;
      emailRecord = newEmail as EmailRecord;
      emailRecordId = emailRecord.id;
    }

    // 3. Throttling check (applies to all attempts including first)
    const lastAttempt = emailRecord.last_retry_at || emailRecord.created_at;
    const timeSinceLastAttempt = Date.now() - new Date(lastAttempt).getTime();

    if (timeSinceLastAttempt < GMAIL_SEND_DELAY_MS) {
      console.log(`Throttling: ${GMAIL_SEND_DELAY_MS - timeSinceLastAttempt}ms remaining`);
      return;
    }

    // 4. Pre-send check: user email settings
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email_unsubscribed, email_enabled, settings')
      .eq('id', params.user_id)
      .single();

    if (userError) throw userError;

    if (user.email_unsubscribed || !user.email_enabled) {
      await supabase
        .from('emails')
        .update({
          status: 'failed',
          last_error: 'User unsubscribed or email disabled'
        })
        .eq('id', emailRecordId);
      console.log(`Email sending aborted for user ${params.user_id}: unsubscribed or disabled`);
      return;
    }

    // 5. Get user's Google tokens from settings
    const googleTokens = user.settings?.google_tokens;
    if (!googleTokens?.refresh_token || !googleTokens?.email) {
      await supabase
        .from('emails')
        .update({
          status: 'failed',
          last_error: 'User has not connected Google account or email missing'
        })
        .eq('id', emailRecordId);
      console.log(`Email sending aborted for user ${params.user_id}: no Google tokens or email`);
      return;
    }

    // 6. Send via Gmail API
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: googleTokens.refresh_token,
      access_token: googleTokens.access_token,
      expiry_date: googleTokens.expiry_date
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const rawMessage = createRawMessage(
      googleTokens.email,
      params.to,
      params.subject,
      params.text_body,
      params.html_body
    );

    const sendResult = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage
      }
    });

    // 7. Success: Update to sent
    const { error: updateError } = await supabase
      .from('emails')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        message_id: sendResult.data.id,
        thread_id: sendResult.data.threadId
      })
      .eq('id', emailRecordId);

    if (updateError) throw updateError;

    console.log(`Email sent successfully: ${sendResult.data.id}`);

  } catch (error: any) {
    // 8. Failure: Update retry count and error
    if (!emailRecordId) {
      console.error(`Email send failed for action_id ${params.action_id} (no record ID):`, error.message);
      return;
    }

    const isPermanentFailure = checkPermanentFailure(error);

    const { data: currentEmail } = await supabase
      .from('emails')
      .select('retry_count')
      .eq('id', emailRecordId)
      .single();

    const newRetryCount = (currentEmail?.retry_count || 0) + 1;

    await supabase
      .from('emails')
      .update({
        status: isPermanentFailure ? 'bounced' : 'failed',
        bounced: isPermanentFailure,
        retry_count: newRetryCount,
        last_retry_at: new Date().toISOString(),
        last_error: error.message || String(error)
      })
      .eq('id', emailRecordId);

    console.error(`Email send failed for action_id ${params.action_id}:`, error.message);
  }
}

function createRawMessage(
  from: string,
  to: string,
  subject: string,
  textBody: string,
  htmlBody: string
): string {
  const boundary = '----=_Part_0_' + Date.now();

  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Reply-To: ${from}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
    '',
    `--${boundary}--`
  ].join('\r\n');

  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function checkPermanentFailure(error: any): boolean {
  const errorMessage = error.message?.toLowerCase() || '';
  const permanentErrors = [
    'recipient address rejected',
    'user unknown',
    'mailbox not found',
    'invalid recipient',
    'does not exist'
  ];

  return permanentErrors.some(err => errorMessage.includes(err));
}
