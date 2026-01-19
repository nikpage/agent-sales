// lib/ai/schemas.ts

import { z } from 'zod';

// Classification schema
export const ClassificationSchema = z.object({
  relevance: z.enum(['SALES', 'BUSINESS', 'PERSONAL', 'OPPORTUNITY', 'NOISE']),
  importance: z.enum(['CRITICAL', 'HIGH', 'REGULAR', 'LOW']),
  type: z.enum(['EVENT', 'TODO', 'INFO']),
  summary_czech: z.string(),
  event_details: z.object({
    duration_minutes: z.number(),
    requested_time: z.string().nullable(),
  }).optional(),
  todo_details: z.object({
    description: z.string(),
    urgency: z.enum(['TODAY', 'TOMORROW', 'SOON']),
  }).optional(),
});

export type Classification = z.infer<typeof ClassificationSchema>;

// Thread summary schema
export const ThreadSummarySchema = z.object({
  context: z.string(),
  current_state: z.string(),
  next_steps: z.array(z.string()),
  risks: z.array(z.string()),
  last_touch: z.object({
    participant: z.string(),
    timestamp: z.string(),
  }),
});

export type ThreadSummary = z.infer<typeof ThreadSummarySchema>;

// Default fallbacks
export const CLASSIFICATION_FALLBACK: Classification = {
  relevance: 'BUSINESS',
  importance: 'REGULAR',
  type: 'INFO',
  summary_czech: 'Chyba analýzy.',
};

// Parse JSON safely: strip code fences, handle wrapped JSON
export function parseJsonSafe(raw: string): unknown | null {
  if (!raw || typeof raw !== 'string') return null;

  let cleaned = raw.trim();

  // Strip markdown code fences
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.trim();

  // Try to extract JSON object if there's extra text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// Validate with schema, retry once if invalid, then fallback
export async function validateClassification(
  raw: string,
  retryFn: () => Promise<string>,
  ctx: { supabase: any; clientId: string }
): Promise<Classification> {
  // First attempt
  const parsed = parseJsonSafe(raw);
  if (parsed) {
    const result = ClassificationSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
  }

  // Retry once with stricter prompt
  try {
    const retryRaw = await retryFn();
    const retryParsed = parseJsonSafe(retryRaw);
    if (retryParsed) {
      const retryResult = ClassificationSchema.safeParse(retryParsed);
      if (retryResult.success) {
        return retryResult.data;
      }
    }
  } catch {
    // Retry failed, continue to fallback
  }

  // Log error and return fallback
  await ctx.supabase.from('agent_errors').insert({
    user_id: ctx.clientId,
    agent_type: 'classify',
    message_user: 'Failed to parse classification',
    message_internal: `Raw: ${raw.substring(0, 500)}`,
  });

  return CLASSIFICATION_FALLBACK;
}

// Validate thread summary, return null on failure (caller skips DB update)
export async function validateThreadSummary(
  raw: string,
  retryFn: () => Promise<string>,
  ctx: { supabase: any; clientId: string },
  threadId: string
): Promise<ThreadSummary | null> {
  // First attempt
  const parsed = parseJsonSafe(raw);
  if (parsed) {
    const result = ThreadSummarySchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
  }

  // Retry once with stricter prompt
  try {
    const retryRaw = await retryFn();
    const retryParsed = parseJsonSafe(retryRaw);
    if (retryParsed) {
      const retryResult = ThreadSummarySchema.safeParse(retryParsed);
      if (retryResult.success) {
        return retryResult.data;
      }
    }
  } catch {
    // Retry failed, continue to fallback
  }

  // Log error and return null
  await ctx.supabase.from('agent_errors').insert({
    user_id: ctx.clientId,
    agent_type: 'thread',
    message_user: 'Failed to parse thread summary',
    message_internal: `ThreadId: ${threadId}, Raw: ${raw.substring(0, 500)}`,
  });

  return null;
}
