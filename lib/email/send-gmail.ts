// lib/email/send-gmail.ts

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Get Gmail client with user's OAuth tokens
 */
async function getGmailClient(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('google_oauth_tokens, email')
    .eq('id', userId)
    .single();

  if (!user?.google_oauth_tokens) {
    throw new Error('No OAuth tokens found');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials(user.google_oauth_tokens);

  return {
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
    userEmail: user.email,
  };
}

/**
 * Create encoded email message for Gmail API
 * Uses threadId field for threading, not In-Reply-To/References headers
 */
function createEmailMessage(to: string, subject: string, body: string): string {
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\n');

  return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Create a draft reply to the counterparty in Gmail (USER → CP outbound path)
 * Performs idempotency check: returns existing draft if status === 'drafted'
 */
export async function createOutboundDraftToCp(actionId: string): Promise<{ draftId: string; wasExisting: boolean }> {
  // Fetch proposal with all needed data
  const { data: proposal, error } = await supabase
    .from('action_proposals')
    .select('id, user_id, cp_id, status, draft_subject, draft_body_text, conversation_id')
    .eq('id', actionId)
    .single();

  if (error || !proposal) {
    throw new Error(`Action proposal not found: ${actionId}`);
  }

  // Idempotency check - if already drafted, return no-op
  if (proposal.status === 'drafted') {
    console.log(`Draft already exists for action ${actionId}, skipping creation`);
    return { draftId: '', wasExisting: true };
  }

  if (!proposal.draft_subject || !proposal.draft_body_text) {
    throw new Error('Draft content not available');
  }

  // Get CP email address
  const { data: cp } = await supabase
    .from('cps')
    .select('primary_identifier')
    .eq('id', proposal.cp_id)
    .single();

  if (!cp) {
    throw new Error('Counterparty not found');
  }

  // Get external_thread_id for proper threading
  const { data: messages } = await supabase
    .from('messages')
    .select('external_thread_id')
    .eq('conversation_id', proposal.conversation_id)
    .not('external_thread_id', 'is', null)
    .order('timestamp', { ascending: false })
    .limit(1);

  const externalThreadId = messages?.[0]?.external_thread_id || undefined;

  // Create Gmail client
  const { gmail } = await getGmailClient(proposal.user_id);

  // Create draft with proper threading via threadId field
  const emailMessage = createEmailMessage(
    cp.primary_identifier,
    proposal.draft_subject,
    proposal.draft_body_text
  );

  const response = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: {
        raw: emailMessage,
        threadId: externalThreadId,
      },
    },
  });

  // Update status to drafted
  await supabase
    .from('action_proposals')
    .update({ status: 'drafted' })
    .eq('id', actionId);

  return { draftId: response.data.id!, wasExisting: false };
}

/**
 * Send notification email to the user (USER → USER notification path)
 * Forces recipient to be the user's own email address
 */
export async function sendNotificationToUser(
  userId: string,
  subject: string,
  body: string
): Promise<void> {
  const { gmail, userEmail } = await getGmailClient(userId);

  const emailMessage = createEmailMessage(userEmail, subject, body);

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: emailMessage,
    },
  });
}

/**
 * Send email via Gmail (used by send-pending-emails route)
 */
export async function sendGmail(
  userId: string,
  to: string,
  subject: string,
  textBody: string,
  htmlBody?: string
): Promise<void> {
  const { gmail } = await getGmailClient(userId);

  const body = htmlBody || textBody;
  const emailMessage = createEmailMessage(to, subject, body);

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw: emailMessage,
    },
  });
}
