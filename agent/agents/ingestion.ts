// agent/agents/ingestion.ts

import type { AgentContext } from '../agentContext';
import { storeMessage } from '../../lib/ingestion';
import { generateEmbedding, storeEmbedding } from '../../lib/embeddings';
import { threadEmail } from '../agentSteps/thread';
import { resolveCp } from '../../lib/cp';
import { ingestEmail } from '../agentSteps/ingest';
import { whitelistPrompt } from '../../lib/ai/prompts/whitelist';
import { AI_MODELS, AI_CONFIG } from '../../lib/ai/config';
import { generateText } from '../../lib/ai/google';

async function checkWhitelist(ctx: AgentContext, emailData: any): Promise<boolean> {
  const bodySnippet = (emailData.cleanedText || '').slice(0, AI_CONFIG.whitelist.bodyCharLimit);
  const prompt = whitelistPrompt(emailData.from, emailData.subject || '', bodySnippet);

  const model = ctx.bulkMode ? AI_MODELS.whitelistBulk : AI_MODELS.whitelist;

  try {
    const response = await generateText(prompt, {
      model,
      temperature: AI_CONFIG.whitelist.temperature,
    });
    return response.toUpperCase().includes('ALLOW');
  } catch (error) {
    console.error('Whitelist check failed:', error);
    return true; // Default to allowing on error (false positive bias)
  }
}

export async function runIngestion(ctx: AgentContext): Promise<number> {
  const model = ctx.bulkMode ? AI_MODELS.whitelistBulk : AI_MODELS.whitelist;
  console.log(`Ingestion mode: ${ctx.bulkMode ? 'BULK' : 'NORMAL'}, using model: ${model}`);

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

    // AI whitelist check
    const isAllowed = await checkWhitelist(ctx, emailData);
    if (!isAllowed) continue;

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
