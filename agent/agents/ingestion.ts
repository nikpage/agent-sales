// Path: agent/agents/ingestion.ts
import type { AgentContext } from '../agentContext';
import { storeMessage } from '../../lib/ingestion';
import { generateEmbedding, storeEmbedding } from '../../lib/embeddings';
import { threadEmail } from '../agentSteps/thread';
import { resolveCp } from '../../lib/cp';
import { ingestEmail } from '../agentSteps/ingest';
export async function runIngestion(ctx: AgentContext): Promise<number> {
  let processedMessages = 0;
  const resList = await ctx.gmail.users.messages.list({
    userId: 'me',
    labelIds: ['INBOX'],
    q: 'in:inbox is:unread',
    maxResults: 50,
  });
  const messages = resList.data.messages ?? [];
  for (const msgStub of messages) {
    const emailData = await ingestEmail(ctx, msgStub);
    if (!emailData) continue;
    const cpId = await resolveCp(ctx.supabase, ctx.client.id, emailData.from);
    const messageId = await storeMessage(ctx.supabase, ctx.client.id, cpId, emailData);
    if (!messageId) continue;
    const embedding = await generateEmbedding(emailData.cleanedText || '');
    if (embedding) {
      await storeEmbedding(ctx.supabase, messageId, embedding);
      await threadEmail(ctx, cpId, emailData.cleanedText || '', messageId, { importance: 'REGULAR' }, emailData);
    }
    processedMessages++;
    try {
      await ctx.gmail.users.messages.modify({
        userId: 'me',
        id: msgStub.id,
        requestBody: { removeLabelIds: ['UNREAD'] },
      });
    } catch (error) {
      console.error('Failed to modify message labels:', error);
    }
  }
  return processedMessages;
}
