// lib/actionEngine/schemas.ts

import { z } from 'zod';
import { Action, ActionType } from './types';

const TodoPayloadSchema = z.object({
  target_id: z.string(),
  description: z.string(),
  urgency: z.enum(['TODAY', 'TOMORROW', 'SOON']),
});

const ReplyDraftPayloadSchema = z.object({
  target_id: z.string(),
  draft_text: z.string(),
  tone: z.enum(['formal', 'friendly', 'urgent', 'neutral']),
});

const CalendarIntentPayloadSchema = z.object({
  target_id: z.string(),
  intent: z.enum(['accept', 'propose', 'suggest']),
  proposed_time: z.string().optional(),
  duration_minutes: z.number().optional(),
});

const NegotiationPayloadSchema = z.object({
  target_id: z.string(),
  suggestion: z.enum(['counter', 'fallback', 'hold']),
  details: z.string(),
});

const ActionSchema = z.object({
  type: z.nativeEnum(ActionType),
  payload: z.union([
    TodoPayloadSchema,
    ReplyDraftPayloadSchema,
    CalendarIntentPayloadSchema,
    NegotiationPayloadSchema,
  ]),
  priority_score: z.number().min(0).max(100),
  rationale: z.string().max(200),
  confidence: z.number().min(0).max(1).optional(),
});

export function validateAction(action: unknown): Action | null {
  const result = ActionSchema.safeParse(action);
  if (result.success) {
    return result.data as Action;
  }
  return null;
}

export function validatePayloadForType(type: ActionType, payload: unknown): boolean {
  switch (type) {
    case ActionType.TODO:
      return TodoPayloadSchema.safeParse(payload).success;
    case ActionType.REPLY_DRAFT:
      return ReplyDraftPayloadSchema.safeParse(payload).success;
    case ActionType.CALENDAR_INTENT:
      return CalendarIntentPayloadSchema.safeParse(payload).success;
    case ActionType.NEGOTIATION:
      return NegotiationPayloadSchema.safeParse(payload).success;
    default:
      return false;
  }
}
