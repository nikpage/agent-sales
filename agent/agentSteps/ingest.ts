// Path: agent/agentSteps/ingest.ts

import { getEmailDetails } from '../../lib/ingestion';
import { AgentContext } from '../agentContext';
import { retry } from '../retryPolicy';

export async function ingestEmail(ctx: AgentContext, msgStub: any): Promise<any | null> {
  const emailData = await retry(() => getEmailDetails(ctx.gmail, msgStub.id));

  const { data: existing, error } = await ctx.supabase
    .from('messages')
    .select('id')
    .eq('external_id', emailData.id)
    .maybeSingle();

  if (error) throw error;
  if (existing) return null;

  return emailData;
}
