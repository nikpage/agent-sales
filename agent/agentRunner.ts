// agent/agentRunner.ts

import { renewIfExpiring } from '../lib/calendar-setup';
import { createAgentContext } from './agentContext';
import { runIngestion } from './agents/ingestion';
import { supabase as globalDb } from '../lib/supabase';
import { saveAgentError } from '../lib/agentErrors';

export async function runAgentForClient(clientId: string): Promise<{
  clientId: string;
  processedMessages: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processedMessages = 0;

  try {
    const ctx = await createAgentContext(clientId);
    if (!ctx) throw new Error('Failed to create agent context');

    const settings = ctx.client.settings || {};
    if (settings.agent_paused === true) return { clientId, processedMessages: 0, errors: ['Agent paused'] };

    const tokens = typeof ctx.client.google_oauth_tokens === 'string'
      ? JSON.parse(ctx.client.google_oauth_tokens)
      : ctx.client.google_oauth_tokens;

    await renewIfExpiring(ctx.supabase, ctx.client.id, tokens, settings);

    processedMessages = await runIngestion(ctx);
    return { clientId, processedMessages, errors };
  } catch (e: any) {
    const msg = String(e?.message || e || 'Agent failed');
    await saveAgentError(globalDb, clientId, 'agent_runner', msg);
    return { clientId, processedMessages: 0, errors: [msg] };
  }
}
