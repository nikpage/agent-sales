// agent/agents/ingestion.ts

import type { AgentContext } from '../agentContext';
import { withRetry } from '../retryPolicy';
import { storeMessage } from '../../lib/ingestion';
import { generateEmbedding, storeEmbedding } from '../../lib/embeddings';
import { threadEmail } from '../agentSteps/thread';
import { resolveCp } from '../../lib/cp';
import { ingestEmail } from '../agentSteps/ingest';
import { whitelistPrompt } from '../../lib/ai/prompts/whitelist';
import { AI_MODELS, AI_CONFIG } from '../../lib/ai/config';
import { generateText } from '../../lib/ai/google';
import { findOrCreateConversation, attachMessageToConversation } from '../../lib/conversation';

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

  const resList = await withRetry(
    () => ctx.gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX'],
      q: 'in:inbox is:unread',
      maxResults: 50,
    }),
    'gmail.list'
  );

  const messages = resList.data.messages ?? [];

  for (const msgStub of messages) {
    const emailData = await ingestEmail(ctx, msgStub);
    if (!emailData) continue;

    // AI whitelist check
    const isAllowed = await checkWhitelist(ctx, emailData);
    if (!isAllowed) continue;

    const cpId = await resolveCp(ctx.supabase, ctx.client.id, emailData.from, emailData.cleanedText);

    // Check if CP is blacklisted
    const { data: cpData, error: cpError } = await ctx.supabase
      .from('cps')
      .select('is_blacklisted')
      .eq('id', cpId)
      .single();

    if (cpError) {
      console.error('Failed to check blacklist status:', cpError);
      continue;
    }

    if (cpData?.is_blacklisted) {
      // Mark as read and skip
      try {
        await withRetry(
          () => ctx.gmail.users.messages.modify({
            userId: 'me',
            id: msgStub.id,
            requestBody: { removeLabelIds: ['UNREAD'] },
          }),
          'gmail.modify'
        );
      } catch (error) {
        console.error('Failed to modify message labels:', error);
      }
      continue;
    }

    // Store message FIRST (dedupe happens here)
    const storeResult = await storeMessage(ctx.supabase, ctx.client.id, cpId, emailData);

    // If duplicate, skip all further processing
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

    processedMessages++;

    try {
      await withRetry(
        () => ctx.gmail.users.messages.modify({
          userId: 'me',
          id: msgStub.id,
          requestBody: { removeLabelIds: ['UNREAD'] },
        }),
        'gmail.modify'
      );
    } catch (error) {
      console.error('Failed to modify message labels:', error);
    }
  }

  return processedMessages;
}
