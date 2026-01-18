// agent/agents/outboundIngestion.ts

import type { AgentContext } from '../agentContext';
import { storeMessage, getEmailDetails } from '../../lib/ingestion';
import { generateEmbedding, storeEmbedding } from '../../lib/embeddings';
import { threadEmail } from '../agentSteps/thread';
import { resolveCp } from '../../lib/cp';
import { findOrCreateConversation } from '../../lib/conversation';

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

  const resList = await ctx.gmail.users.messages.list({
    userId: 'me',
    labelIds: ['SENT'],
    maxResults: 50,
  });

  const messages = resList.data.messages ?? [];

  for (const msgStub of messages) {
    try {
      const emailData = await getEmailDetails(ctx.gmail, msgStub.id!);
      if (!emailData) continue;

      const recipients = extractRecipients(emailData.to, '');
      if (recipients.length === 0) continue;

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

      for (const recipientEmail of recipients) {
        const cpId = await resolveCp(ctx.supabase, ctx.client.id, `<${recipientEmail}>`, emailData.cleanedText);
        const conversationId = await findOrCreateConversation(ctx.supabase, ctx.client.id, cpId, embedding);
        const messageId = await storeMessage(ctx.supabase, ctx.client.id, cpId, emailData, conversationId, 'outbound');
        if (!messageId) continue;

        await storeEmbedding(ctx.supabase, messageId, embedding);
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
