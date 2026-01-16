// lib/ingestion.ts

import { gmail_v1 } from 'googleapis';

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

export async function getEmailDetails(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<EmailData> {
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  });

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
  conversationId: string,
  direction: 'inbound' | 'outbound' = 'inbound'
): Promise<string | null> {
  if (!conversationId || conversationId.length === 0) {
    throw new Error('conversationId is required');
  }

  if (emailData.rfcMessageId) {
    const { data: existing, error } = await supabase
      .from('messages')
      .select('id')
      .eq('universal_message_id', emailData.rfcMessageId)
      .maybeSingle();

    if (error) throw error;
    if (existing) return existing.id as string;
  } else {
    const { data: existing, error } = await supabase
      .from('messages')
      .select('id')
      .eq('external_id', emailData.id)
      .maybeSingle();

    if (error) throw error;
    if (existing) return existing.id as string;
  }

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
      conversation_id: conversationId,
      external_id: emailData.id,
      external_thread_id: emailData.threadId,
      universal_message_id: emailData.rfcMessageId,
    })
    .select('id')
    .single();

  if (error && error.code === '23505') {
    return null;
  }
  if (error) throw error;
  return inserted.id as string;
}
