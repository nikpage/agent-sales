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
import { parseEmailCommand } from '../../lib/email/commandParser';

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
  if (emailData.from !== ctx.client.email) {
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

  // Process all collected message IDs
  console.log(`DEBUG: Found ${messageIds.length} message IDs to process`);

  for (const messageId of messageIds) {
    console.log('DEBUG: ===== Processing message', messageId, '=====');

    const emailData = await ingestEmail(ctx, { id: messageId });
    if (!emailData) {
      console.log('DEBUG: ingestEmail returned null, skipping');
      continue;
    }
    console.log('DEBUG: Got emailData from:', emailData.from, 'subject:', emailData.subject);

    // CHECK FOR COMMAND FIRST - if it's a command, skip all normal processing
    console.log('DEBUG: Checking if email is a command...');
    const wasCommand = await checkForCommand(ctx, emailData);
    if (wasCommand) {
      console.log('DEBUG: Email was a command, marking as read and skipping normal ingestion');
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
      continue; // Skip to next message
    }
    console.log('DEBUG: Not a command, continuing normal processing');

    // Fetch full message to check labels
    console.log('DEBUG: Fetching message labels...');
    const fullMsg: any = await withRetry(
      () => ctx.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'minimal',
      }),
      'gmail.get'
    );

    const labels = (fullMsg as any).data.labelIds ?? [];
    console.log('DEBUG: Message labels:', labels);

    // Filter: must be INBOX and UNREAD
    if (!labels.includes('INBOX') || !labels.includes('UNREAD')) {
      console.log('DEBUG: Message missing INBOX or UNREAD label, skipping');
      continue;
    }
    console.log('DEBUG: Labels OK (INBOX + UNREAD)');

    // AI whitelist check
    console.log('DEBUG: Running AI whitelist check...');
    const isAllowed = await checkWhitelist(ctx, emailData);
    console.log('DEBUG: Whitelist result:', isAllowed);
    if (!isAllowed) {
      console.log('DEBUG: Whitelist blocked this message, skipping');
      continue;
    }

    console.log('DEBUG: Resolving CP from:', emailData.from);
    const cpId = await resolveCp(ctx.supabase, ctx.client.id, emailData.from, emailData.cleanedText);
    console.log('DEBUG: CP resolved to:', cpId);

    // Check if CP is blacklisted
    console.log('DEBUG: Checking if CP is blacklisted...');
    const { data: cpData, error: cpError } = await ctx.supabase
      .from('cps')
      .select('is_blacklisted')
      .eq('id', cpId)
      .single();

    if (cpError) {
      console.error('DEBUG: Failed to check blacklist status:', cpError);
      continue;
    }

    console.log('DEBUG: CP blacklist status:', cpData?.is_blacklisted);
    if (cpData?.is_blacklisted) {
      console.log('DEBUG: CP is blacklisted, marking as read and skipping');
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
    console.log('DEBUG: Storing message in DB...');
    const storeResult = await storeMessage(ctx.supabase, ctx.client.id, cpId, emailData);
    console.log('DEBUG: storeMessage result - isDuplicate:', storeResult.isDuplicate, 'msgId:', storeResult.id);

    // If duplicate, skip all further processing
    if (storeResult.isDuplicate) {
      duplicateCount++;
      console.log('DEBUG: Message is duplicate, skipping further processing');
      continue;
    }

    const msgId = storeResult.id;

    // Generate embedding
    console.log('DEBUG: Generating embedding...');
    let embedding;
    try {
      embedding = await generateEmbedding(emailData.cleanedText || '');
      console.log('DEBUG: Embedding generated, length:', embedding?.length);
    } catch (error) {
      console.error('DEBUG: Failed to generate embedding:', error);
      continue;
    }

    if (!embedding) {
      console.error('DEBUG: Embedding is null, skipping message');
      continue;
    }

    // Store embedding
    console.log('DEBUG: Storing embedding...');
    await storeEmbedding(ctx.supabase, msgId, embedding);
    console.log('DEBUG: Embedding stored');

    // Find or create conversation
    console.log('DEBUG: Finding or creating conversation...');
    const conversationId = await findOrCreateConversation(ctx.supabase, ctx.client.id, cpId, embedding);
    console.log('DEBUG: Conversation ID:', conversationId);

    // Attach conversation to message
    console.log('DEBUG: Attaching message to conversation...');
    await attachMessageToConversation(ctx.supabase, msgId, conversationId);
    console.log('DEBUG: Message attached to conversation');

    // Save classification tags to message
    console.log('DEBUG: Saving classification tags...');
    const classification = { importance: 'REGULAR', type: 'FOLLOW_UP' };
    await ctx.supabase
      .from('messages')
      .update({
        tag_primary: classification.type,
        tag_secondary: classification.importance
      })
      .eq('id', msgId);
    console.log('DEBUG: Classification tags saved');

    console.log('DEBUG: Running threadEmail...');
    try {
      await threadEmail(ctx, cpId, emailData.cleanedText || '', msgId, { importance: 'REGULAR' }, emailData, conversationId);
      console.log('DEBUG: threadEmail complete');
    } catch (error) {
      console.error('DEBUG: threadEmail FAILED:', error);
      console.error('DEBUG: Error details:', error instanceof Error ? error.message : String(error));
      // Continue anyway - don't let threadEmail failure stop processing
    }

    processedMessages++;
    console.log('DEBUG: Incrementing processedMessages to:', processedMessages);

    console.log('DEBUG: Marking message as read...');
    try {
      await withRetry(
        () => ctx.gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: { removeLabelIds: ['UNREAD'] },
        }),
        'gmail.modify'
      );
      console.log('DEBUG: Message marked as read');
    } catch (error) {
      console.error('Failed to modify message labels:', error);
    }

    console.log('DEBUG: ===== Message processing complete =====');
  }

  console.info('ingest_end', {
    clientId: ctx.client.id,
    newCursor: newHistoryId,
    inserted: processedMessages,
    skipped: duplicateCount
  });

  return { processedMessages, newHistoryId };
}
