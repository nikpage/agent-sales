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

export async function runIngestion(ctx: AgentContext): Promise<{
  processedMessages: number;
  newHistoryId: string | null;
}> {
  const model = ctx.bulkMode ? AI_MODELS.whitelistBulk : AI_MODELS.whitelist;
  console.log(`Ingestion mode: ${ctx.bulkMode ? 'BULK' : 'NORMAL'}, using model: ${model}`);

  let processedMessages = 0;
  let duplicateCount = 0;
  const settings = ctx.client.settings || {};
  const currentHistoryId = settings.gmail_watch_history_id || null;

  console.info('ingest_start', { clientId: ctx.client.id, cursor: currentHistoryId });

  let newHistoryId: string | null = null;
  let messageIds: string[] = [];

  // First run: seed with messages.list
  if (!currentHistoryId) {
    const resList: any = await withRetry(
      () => ctx.gmail.users.messages.list({
        userId: 'me',
        labelIds: ['INBOX'],
        q: 'in:inbox is:unread',
        maxResults: 50,
      }),
      'gmail.list'
    );

    messageIds = (resList.data.messages ?? []).map(m => m.id!);
    newHistoryId = resList.data.historyId || null;

  } else {
    // Subsequent runs: use history.list with pagination
    let pageToken: string | null | undefined = undefined;
    let maxHistoryItemId = 0;

    do {
      const historyRes: any = await withRetry(
        () => ctx.gmail.users.history.list({
          userId: 'me',
          startHistoryId: currentHistoryId,
          pageToken: pageToken || undefined,
        }),
        'gmail.history.list'
      );

      const history = historyRes.data.history ?? [];

      // Extract message IDs and track max historyItem.id
      for (const historyItem of history) {
        // Track max history item ID
        if (historyItem.id) {
          const itemId = parseInt(historyItem.id);
          if (itemId > maxHistoryItemId) {
            maxHistoryItemId = itemId;
          }
        }

        // Collect message IDs from messagesAdded
        if (historyItem.messagesAdded) {
          for (const added of historyItem.messagesAdded) {
            if (added.message?.id) {
              messageIds.push(added.message.id);
            }
          }
        }
      }

      pageToken = historyRes.data.nextPageToken;
    } while (pageToken);

    newHistoryId = maxHistoryItemId > 0 ? maxHistoryItemId.toString() : null;
  }

  // Process all collected message IDs
  for (const messageId of messageIds) {
    const emailData = await ingestEmail(ctx, { id: messageId });
    if (!emailData) continue;

    // Fetch full message to check labels
    const fullMsg: any = await withRetry(
      () => ctx.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'minimal',
      }),
      'gmail.get'
    );

    const labels = fullMsg.data.labelIds ?? [];

    // Filter: must be INBOX and UNREAD
    if (!labels.includes('INBOX') || !labels.includes('UNREAD')) {
      continue;
    }

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
            id: messageId,
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
      duplicateCount++;
      continue;
    }

    const msgId = storeResult.id;

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
    await storeEmbedding(ctx.supabase, msgId, embedding);

    // Find or create conversation
    const conversationId = await findOrCreateConversation(ctx.supabase, ctx.client.id, cpId, embedding);

    // Attach conversation to message
    await attachMessageToConversation(ctx.supabase, msgId, conversationId);

    await threadEmail(ctx, cpId, emailData.cleanedText || '', msgId, { importance: 'REGULAR' }, emailData, conversationId);

    processedMessages++;

    try {
      await withRetry(
        () => ctx.gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: { removeLabelIds: ['UNREAD'] },
        }),
        'gmail.modify'
      );
    } catch (error) {
      console.error('Failed to modify message labels:', error);
    }
  }

  console.info('ingest_end', {
    clientId: ctx.client.id,
    newCursor: newHistoryId,
    inserted: processedMessages,
    skipped: duplicateCount
  });

  return { processedMessages, newHistoryId };
}
