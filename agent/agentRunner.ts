// agent/agentRunner.ts
import { renewIfExpiring } from '../lib/calendar-setup';
import { createAgentContext } from './agentContext';
import { runIngestion } from './agents/ingestion';

export async function runAgentForClient(clientId: string): Promise<{
  clientId: string;
  processedMessages: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processedMessages = 0;

  const ctx = await createAgentContext(clientId);
  if (!ctx) return { clientId, processedMessages: 0, errors: ['Failed to create agent context'] };

  try {
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
    return { clientId, processedMessages: 0, errors: [msg] };
  }
}
