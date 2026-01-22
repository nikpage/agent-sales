// lib/email/send-gmail.ts

import { supabase } from '../supabase';
import { google } from 'googleapis';

// Validate required environment variables
const requiredEnvVars = ['GMAIL_USER', 'GMAIL_REFRESH_TOKEN', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const GMAIL_USER = process.env.GMAIL_USER!;
const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN!;
const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID!;
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!;

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

export async function sendGmail(params: SendEmailParams): Promise<void> {
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
      .select('email_unsubscribed, email_enabled')
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

    // 5. Send via Gmail API
    const oauth2Client = new google.auth.OAuth2(
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: GMAIL_REFRESH_TOKEN
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const rawMessage = createRawMessage(
      GMAIL_USER,
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

    // 6. Success: Update to sent
    const { error: updateError } = await supabase
      .from('emails')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        message_id: sendResult.data.id
      })
      .eq('id', emailRecordId);

    if (updateError) throw updateError;

    console.log(`Email sent successfully: ${sendResult.data.id}`);

  } catch (error: any) {
    // 7. Failure: Update retry count and error
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
