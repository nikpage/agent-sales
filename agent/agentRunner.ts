// agent/agentRunner.ts

import { renewIfExpiring } from '../lib/calendar-setup';
import { createAgentContext } from './agentContext';
import { runIngestion } from './agents/ingestion';
import { supabase as globalDb } from '../lib/supabase';
import { saveAgentError } from '../lib/agentErrors';

export async function runIngestIfNeeded(
  userId: string,
  reason: 'webhook' | 'manual' | 'calendar' | 'retry',
  bulkMode: boolean = false
): Promise<void> {
  try {
    const ctx = await createAgentContext(userId, bulkMode);
    if (!ctx) throw new Error('CONTEXT_INIT_FAILED');

    const settings = ctx.client.settings || {};

    if (settings.agent_paused === true) {
      return;
    }

    const tokens =
      typeof ctx.client.google_oauth_tokens === 'string'
        ? JSON.parse(ctx.client.google_oauth_tokens)
        : ctx.client.google_oauth_tokens;

    await renewIfExpiring(ctx.supabase, ctx.client.id, tokens, settings);

    const result = await runIngestion(ctx!);

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
        .eq('id', userId);
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'INGEST_FAILED';
    await saveAgentError(globalDb, userId, 'ingestion', msg);
  }
}

export async function runAgentForClient(clientId: string, bulkMode: boolean = false): Promise<{
  clientId: string;
  processedMessages: number;
  errors: string[];
}> {
  console.log(`DEBUG: runAgentForClient called with bulkMode=${bulkMode}`);

  try {
    await runIngestIfNeeded(clientId, 'manual', bulkMode);
    return { clientId, processedMessages: 0, errors: [] };
  } catch (err) {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : 'AGENT_FAILED';
    return { clientId, processedMessages: 0, errors: [msg] };
  }
}
