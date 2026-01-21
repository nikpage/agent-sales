// agent/agentRunner.ts

import { renewIfExpiring } from '../lib/calendar-setup';
import { createAgentContext } from './agentContext';
import { runIngestion } from './agents/ingestion';
import { supabase as globalDb } from '../lib/supabase';
import { saveAgentError } from '../lib/agentErrors';

export async function runAgentForClient(clientId: string, bulkMode: boolean = false): Promise<{
  clientId: string;
  processedMessages: number;
  errors: string[];
}> {
  console.log(`DEBUG: runAgentForClient called with bulkMode=${bulkMode}`);

  let processedMessages = 0;
  const errors: string[] = [];

  try {
    const ctx = await createAgentContext(clientId, bulkMode);
    if (!ctx) throw new Error('CONTEXT_INIT_FAILED');

    const settings = ctx.client.settings || {};
    if (settings.agent_paused === true) {
      return { clientId, processedMessages: 0, errors: ['Agent paused'] };
    }

    const tokens =
      typeof ctx.client.google_oauth_tokens === 'string'
        ? JSON.parse(ctx.client.google_oauth_tokens)
        : ctx.client.google_oauth_tokens;

    await renewIfExpiring(ctx.supabase, ctx.client.id, tokens, settings);

    const result = await runIngestion(ctx);
    processedMessages = result.processedMessages;

    // Update cursor if ingestion succeeded
    if (result.newHistoryId) {
      const currentHistoryId = settings.gmail_watch_history_id;
      const newHistoryId = Math.max(
        parseInt(currentHistoryId || '0'),
        parseInt(result.newHistoryId)
      ).toString();

      await ctx.supabase
        .from('users')
        .update({
          settings: {
            ...settings,
            gmail_watch_history_id: newHistoryId
          }
        })
        .eq('id', clientId);
    }

    return { clientId, processedMessages, errors };
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : 'AGENT_FAILED';
    console.error('Error running agent for client:', err);
    await saveAgentError(globalDb, clientId, 'agent_runner', msg);
    return { clientId, processedMessages: 0, errors: [msg] };
  }
}
