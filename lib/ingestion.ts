// lib/ingestion.ts

import { gmail_v1 } from 'googleapis';
import { withRetry } from '../agent/retryPolicy';

interface EmailData {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  timestamp: string;
  occurredAt: string | null;
  rawText: string;
  cleanedText: string;
  rfcMessageId: string | null;
}

interface StoreMessageResult {
  id: string;
  isDuplicate: boolean;
}

export async function getEmailDetails(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<EmailData> {
  const response = await withRetry(
    () => gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    }),
    'gmail.get'
  );

  const msg = response.data;
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

  const from = getHeader('from');
  const to = getHeader('to');
  const subject = getHeader('subject');
  const rfcMessageId = getHeader('message-id')
  ? `GMAIL:${getHeader('message-id')}`
  : null;

  let rawText = '';
  let htmlText = '';
  const parts = msg.payload?.parts || [msg.payload];
  for (const part of parts) {
    if (part?.mimeType === 'text/plain' && part.body?.data) {
      rawText += Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
    if (part?.mimeType === 'text/html' && part.body?.data) {
      htmlText += Buffer.from(part.body.data, 'base64').toString('utf-8');
    }
  }

  if (!rawText && htmlText) {
    rawText = htmlText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  }

  const cleanedText = rawText.replace(/\r\n/g, '\n').trim();
  const timestamp = new Date(parseInt(msg.internalDate || '0')).toISOString();

  let occurredAt: string | null = null;
  if (msg.internalDate) {
    occurredAt = new Date(parseInt(msg.internalDate)).toISOString();
  } else {
    const dateHeader = getHeader('date');
    if (dateHeader) {
      occurredAt = new Date(dateHeader).toISOString();
    }
  }

  return {
    id: msg.id!,
    threadId: msg.threadId!,
    from,
    to,
    subject,
    timestamp,
    occurredAt,
    rawText,
    cleanedText,
    rfcMessageId,
  };
}

export async function storeMessage(
  supabase: any,
  userId: string,
  cpId: string,
  emailData: EmailData,
  direction: 'inbound' | 'outbound' = 'inbound'
): Promise<StoreMessageResult> {
  // Check for duplicate by universal_message_id first
  if (emailData.rfcMessageId) {
    const { data: existing, error } = await supabase
      .from('messages')
      .select('id')
      .eq('universal_message_id', emailData.rfcMessageId)
      .maybeSingle();

    if (error) throw error;
    if (existing) return { id: existing.id as string, isDuplicate: true };
  }

  // Check for duplicate by external_id
  const { data: existingByExternal, error: extError } = await supabase
    .from('messages')
    .select('id')
    .eq('external_id', emailData.id)
    .maybeSingle();

  if (extError) throw extError;
  if (existingByExternal) return { id: existingByExternal.id as string, isDuplicate: true };

  // Insert new message without conversation_id
  const { data: inserted, error } = await supabase
    .from('messages')
    .insert({
      user_id: userId,
      cp_id: cpId,
      direction: direction,
      raw_text: emailData.rawText,
      cleaned_text: emailData.cleanedText,
      timestamp: emailData.timestamp,
      occurred_at: emailData.occurredAt,
      external_id: emailData.id,
      external_thread_id: emailData.threadId,
      universal_message_id: emailData.rfcMessageId,
    })
    .select('id')
    .single();

  // Handle race condition: another process inserted same message
  if (error && error.code === '23505') {
    // Re-select by universal_message_id first
    if (emailData.rfcMessageId) {
      const { data: raceExisting, error: raceErr } = await supabase
        .from('messages')
        .select('id')
        .eq('universal_message_id', emailData.rfcMessageId)
        .maybeSingle();

      if (raceErr) throw raceErr;
      if (raceExisting) return { id: raceExisting.id as string, isDuplicate: true };
    }

    // If not found by universal_message_id, re-select by external_id
    const { data: raceExistingExt, error: raceExtErr } = await supabase
      .from('messages')
      .select('id')
      .eq('external_id', emailData.id)
      .maybeSingle();

    if (raceExtErr) throw raceExtErr;
    if (raceExistingExt) return { id: raceExistingExt.id as string, isDuplicate: true };

    // Neither found — should never happen
    throw new Error('Duplicate conflict but could not find existing row by universal_message_id or external_id');
  }

  if (error) throw error;
  if (!inserted || !inserted.id) {
    throw new Error('Insert succeeded but no id returned');
  }
  return { id: inserted.id as string, isDuplicate: false };
}
