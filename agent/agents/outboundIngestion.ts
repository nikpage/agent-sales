// agent/agents/outboundIngestion.ts

import type { AgentContext } from '../agentContext';
import { withRetry } from '../retryPolicy';
import { storeMessage, getEmailDetails } from '../../lib/ingestion';
import { generateEmbedding, storeEmbedding } from '../../lib/embeddings';
import { threadEmail } from '../agentSteps/thread';
import { resolveCp } from '../../lib/cp';
import { findOrCreateConversation, attachMessageToConversation } from '../../lib/conversation';

function extractRecipients(toHeader: string, ccHeader: string): string[] {
  const recipients: string[] = [];

  if (toHeader) {
    const toEmails = toHeader.split(',').map(e => {
      const match = e.match(/<(.+?)>/);
      return (match ? match[1] : e).trim().toLowerCase();
    });
    recipients.push(...toEmails);
  }

  if (ccHeader) {
    const ccEmails = ccHeader.split(',').map(e => {
      const match = e.match(/<(.+?)>/);
      return (match ? match[1] : e).trim().toLowerCase();
    });
    recipients.push(...ccEmails);
  }

  return recipients.filter(e => e.length > 0);
}

export async function runOutboundIngestion(ctx: AgentContext): Promise<number> {
  console.log('Outbound ingestion mode: processing sent emails');
  let processedMessages = 0;

  const resList = await withRetry(
    () => ctx.gmail.users.messages.list({
      userId: 'me',
      labelIds: ['SENT'],
      maxResults: 50,
    }),
    'gmail.list'
  );

  const messages = resList.data.messages ?? [];

  for (const msgStub of messages) {
    try {
      const emailData = await getEmailDetails(ctx.gmail, msgStub.id!);
      if (!emailData) continue;

      const recipients = extractRecipients(emailData.to, '');
      if (recipients.length === 0) continue;

      for (const recipientEmail of recipients) {
        const cpId = await resolveCp(ctx.supabase, ctx.client.id, `<${recipientEmail}>`, emailData.cleanedText);

        // Store message FIRST (dedupe happens here)
        const storeResult = await storeMessage(ctx.supabase, ctx.client.id, cpId, emailData, 'outbound');

        // If duplicate, skip to next recipient
        if (storeResult.isDuplicate) {
          continue;
        }

        const messageId = storeResult.id;

        // Generate embedding
        let embedding;
        try {
          embedding = await generateEmbedding(emailData.cleanedText || '');
        } catch (error) {
          console.error('Failed to generate embedding, skipping message:', error);
          continue;
        }

        if (!embedding) {
          console.error('Embedding is null, skipping message');
          continue;
        }

        // Store embedding
        await storeEmbedding(ctx.supabase, messageId, embedding);

        // Find or create conversation
        const conversationId = await findOrCreateConversation(ctx.supabase, ctx.client.id, cpId, embedding);

        // Attach conversation to message
        await attachMessageToConversation(ctx.supabase, messageId, conversationId);

        await threadEmail(ctx, cpId, emailData.cleanedText || '', messageId, { importance: 'REGULAR' }, emailData, conversationId);
      }

      processedMessages++;
    } catch (error) {
      console.error('Error processing outbound message:', error);
      continue;
    }
  }

  return processedMessages;
}
