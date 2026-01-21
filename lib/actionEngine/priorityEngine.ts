// lib/actionEngine/priorityEngine.ts

import { Action, ActionType, Context } from './types';

export function scoreAction(action: Action, context: Context): number {
  // Score is now derived from action.urgency
  // Keep for backwards compatibility but priority is action.urgency
  return action.urgency;
}

export function shouldSuppress(score: number, context?: Context): boolean {
  // Hard suppression rule: blacklisted contacts
  if (context?.cp?.is_blacklisted) {
    return true;
  }

  // No score threshold - urgency alone determines priority
  return false;
}

export function getOutcomeKey(action: Action): string | null {
  const payload = action.payload as any;
  const targetId = payload.target_id ?? payload.thread_id ?? null;

  if (!targetId) {
    return null;
  }

  return `${action.type}:${targetId}`;
}

export function suppressCompetingActions(actions: Action[]): Action[] {
  // Group by outcome key, keep highest urgency
  const byOutcome = new Map<string, Action>();
  const noOutcomeKey: Action[] = [];

  for (const action of actions) {
    const key = getOutcomeKey(action);

    if (key === null) {
      noOutcomeKey.push(action);
      continue;
    }

    const existing = byOutcome.get(key);

    if (!existing || action.urgency > existing.urgency) {
      byOutcome.set(key, action);
    }
  }

  return [...Array.from(byOutcome.values()), ...noOutcomeKey];
}

export function filterVisibleActions(actions: Action[], now = new Date()): Action[] {
  return actions.filter(a => {
    if (a.status === 'DISMISSED') return false;
    if (a.status === 'APPROVED') return false;
    if (a.status === 'SNOOZED') {
      if (!a.snoozed_until) return false;
      return new Date(a.snoozed_until) <= now;
    }
    return true; // PENDING
  });
}

export function rankActions(actions: Action[]): Action[] {
  // Sort by urgency DESC only, no caps
  return [...actions].sort((a, b) => b.urgency - a.urgency);
}
