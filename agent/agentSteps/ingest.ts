// Path: agent/agentSteps/ingest.ts

import { getEmailDetails } from '../../lib/ingestion';
import { AgentContext } from '../agentContext';
import { retry } from '../retryPolicy';

export async function ingestEmail(ctx: AgentContext, msgStub: any): Promise<any | null> {
  const emailData = await retry(() => getEmailDetails(ctx.gmail, msgStub.id));
  return emailData;
}
