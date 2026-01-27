// agent/agents/ingestion.ts

import type { AgentContext } from '../agentContext';
import { withRetry } from '../retryPolicy';
import { storeMessage } from '../../lib/ingestion';
import { generateEmbedding, storeEmbedding } from '../../lib/embeddings';
import { threadEmail } from '../agentSteps/thread';
import { resolveCp, getSenderEmail, normalizeGmailAddress } from '../../lib/cp';
import { ingestEmail } from '../agentSteps/ingest';
import { whitelistPrompt } from '../../lib/ai/prompts/whitelist';
import { AI_MODELS, AI_CONFIG } from '../../lib/ai/config';
import { generateText } from '../../lib/ai/google';
import { findOrCreateConversation, attachMessageToConversation } from '../../lib/conversation';
import { parseEmailCommand } from '../../lib/email/commandParser';
import { sendConversationNotifications } from '../../lib/notifications/sendConversationNotifications';
import { assertMessageNotProcessed } from '../idempotency';

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

/**
 * Check if email is a command reply and execute it
 * Returns true if it was a command (skip normal processing)
 */
async function checkForCommand(ctx: AgentContext, emailData: any): Promise<boolean> {
  // Only check emails FROM the user (not TO the user)
  if (!ctx.client.email) {
    return false;
  }

  const fromEmail = getSenderEmail(emailData.from);
  const userEmail = normalizeGmailAddress(ctx.client.email.toLowerCase());
  if (fromEmail !== userEmail) {
    return false;
  }

  // Try to parse command
  const parsed = parseEmailCommand(emailData.cleanedText || emailData.rawText || '');

  if (!parsed.actionId || !parsed.command) {
    return false;
  }

  console.log(`Command detected: ${parsed.command} for action ${parsed.actionId}`);

  // Command found - route to command API
  try {
    const response = await fetch(`${process.env.APP_URL}/api/cmd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderEmail: emailData.from,
        emailBody: emailData.cleanedText || emailData.rawText || '',
      }),
    });

    if (!response.ok) {
      console.error('Command execution failed:', await response.text());
      return false;
    }

    console.log('Command executed successfully:', parsed.command);
    return true;
  } catch (error) {
    console.error('Error routing command:', error);
    return false;
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

    messageIds = ((resList as any).data.messages ?? []).map(m => m.id!);
    newHistoryId = (resList as any).data.historyId || null;

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

      const history = (historyRes as any).data.history ?? [];

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

      pageToken = (historyRes as any).data.nextPageToken;
    } while (pageToken);

    newHistoryId = maxHistoryItemId > 0 ? maxHistoryItemId.toString() : null;
  }

  // Sort messageIds by timestamp (oldest first) to build conversations correctly
  const messagesWithTimestamps: { id: string; timestamp: number }[] = [];

  for (const messageId of messageIds) {
    try {
      const msg: any = await withRetry(
        () => ctx.gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'minimal'
        }),
        'gmail.get'
      );
      const internalDate = parseInt(msg.data.internalDate || '0');
      messagesWithTimestamps.push({ id: messageId, timestamp: internalDate });
    } catch (error) {
      console.error(`Failed to fetch message ${messageId} for sorting:`, error);
      // Add with timestamp 0 so it doesn't get lost
      messagesWithTimestamps.push({ id: messageId, timestamp: 0 });
    }
  }

  // Sort oldest first
  messagesWithTimestamps.sort((a, b) => a.timestamp - b.timestamp);
  messageIds = messagesWithTimestamps.map(m => m.id);

  // Process all collected message IDs
  for (const messageId of messageIds) {

    try {

    const isNew = await assertMessageNotProcessed(ctx.supabase, messageId);
    if (!isNew) {
      continue;
    }

    const emailData = await ingestEmail(ctx, { id: messageId });
    if (!emailData) {
      continue;
    }

    // SKIP USER EMAILS FIRST - before any CP resolution or processing
    if (ctx.client.email) {
      const fromEmail = getSenderEmail(emailData.from);
      const userEmail = normalizeGmailAddress(ctx.client.email.toLowerCase());
      console.log(`DEBUG: Comparing emails - from: "${fromEmail}" vs user: "${userEmail}"`);
      if (fromEmail === userEmail) {
        console.log(`DEBUG: Skipping user's own email`);
        continue;
      }
    } else {
      console.log(`DEBUG: ctx.client.email is null/undefined`);
    }

    // CHECK FOR COMMAND FIRST - if it's a command, skip all normal processing
    const wasCommand = await checkForCommand(ctx, emailData);
    if (wasCommand) {
      continue;
    }

    // Fetch full message to check labels
    const fullMsg: any = await withRetry(
      () => ctx.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'minimal',
      }),
      'gmail.get'
    );

    const labels = (fullMsg as any).data.labelIds ?? [];

    // Filter: must be INBOX and UNREAD
    if (!labels.includes('INBOX') || !labels.includes('UNREAD')) {
      continue;
    }

    // AI whitelist check
    const isAllowed = await checkWhitelist(ctx, emailData);
    if (!isAllowed) {
      continue;
    }

    const cpId = await resolveCp(ctx.supabase, ctx.client.id, emailData.from, emailData.cleanedText, ctx.client.email);

    // Check if CP is blacklisted
    const { data: cpData, error: cpError } = await ctx.supabase
      .from('cps')
      .select('is_blacklisted')
      .eq('id', cpId)
      .single();

    if (cpError) {
      console.error('DEBUG: Failed to check blacklist status:', cpError);
      continue;
    }

    if (cpData?.is_blacklisted) {
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
      console.error('DEBUG: Failed to generate embedding:', error);
      continue;
    }

    if (!embedding) {
      console.error('DEBUG: Embedding is null, skipping message');
      continue;
    }

    // Store embedding
    await storeEmbedding(ctx.supabase, msgId, embedding);

    // Find or create conversation
    const conversationId = await findOrCreateConversation(ctx.supabase, ctx.client.id, cpId, embedding);

    // Attach conversation to message
    await attachMessageToConversation(ctx.supabase, msgId, conversationId);

    try {
      await threadEmail(ctx, cpId, emailData.cleanedText || '', msgId, { importance: 'REGULAR' }, emailData, conversationId);
    } catch (error) {
      console.error('DEBUG: threadEmail FAILED:', error);
      console.error('DEBUG: Error details:', error instanceof Error ? error.message : String(error));
    }

    processedMessages++;

    } finally {
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

  }

  console.info('ingest_end', {
    clientId: ctx.client.id,
    newCursor: newHistoryId,
    inserted: processedMessages,
    skipped: duplicateCount
  });

  // Send conversation notifications for any new action proposals
  if (processedMessages > 0) {
    try {
      await sendConversationNotifications(ctx.client.id, ctx.client.email);
    } catch (error) {
      console.error('DEBUG: Failed to send notifications:', error);
      // Don't fail ingestion if notifications fail
    }
  }

  return { processedMessages, newHistoryId };
}
