// lib/actionEngine/priorityEngine.ts

import { Action, ActionType, Context } from './types';

// Priority bands:
// 0-19: Suppress (do not return)
// 20-49: Low priority
// 50-79: Normal priority
// 80-100: High priority / must-do

const MIN_SCORE_THRESHOLD = 20;

interface ScoringComponents {
  businessValue: number;  // 0-40
  urgency: number;        // 0-30
  personalOverride: number; // 0-20 (absolute boost)
  userOverride: number;   // -10 to +10
}

function computeBusinessValue(action: Action, context: Context): number {
  // Base value by action type
  let base = 0;
  
  switch (action.type) {
    case ActionType.NEGOTIATION:
      base = 30; // High business value
      break;
    case ActionType.CALENDAR_INTENT:
      base = 25;
      break;
    case ActionType.TODO:
      base = 20;
      break;
    case ActionType.REPLY_DRAFT:
      base = 15;
      break;
  }

  // Boost if thread state indicates active deal
  if (context.thread.state === 'negotiation' || context.thread.state === 'closing') {
    base += 10;
  }

  // Cap at 40
  return Math.min(base, 40);
}

function computeUrgency(action: Action, context: Context): number {
  // Urgency is monotonic increasing based on time factors
  let urgency = 0;

  // Check if action has time-sensitive payload
  if (action.type === ActionType.TODO && 'urgency' in action.payload) {
    const todoUrgency = (action.payload as any).urgency;
    if (todoUrgency === 'TODAY') urgency += 25;
    else if (todoUrgency === 'TOMORROW') urgency += 15;
    else if (todoUrgency === 'SOON') urgency += 5;
  }

  if (action.type === ActionType.CALENDAR_INTENT && 'proposed_time' in action.payload) {
    const proposedTime = (action.payload as any).proposed_time;
    if (proposedTime) {
      const eventTime = new Date(proposedTime).getTime();
      const now = Date.now();
      const hoursUntil = (eventTime - now) / (1000 * 60 * 60);
      
      if (hoursUntil < 2) urgency += 30;
      else if (hoursUntil < 24) urgency += 20;
      else if (hoursUntil < 72) urgency += 10;
    }
  }

  // Check last message recency
  if (context.messages.length > 0) {
    const lastMsg = context.messages[0];
    const lastTime = new Date(lastMsg.occurred_at || lastMsg.timestamp).getTime();
    const hoursSince = (Date.now() - lastTime) / (1000 * 60 * 60);
    
    // Inbound messages waiting longer are more urgent
    if (lastMsg.direction === 'inbound') {
      if (hoursSince > 48) urgency += 10;
      else if (hoursSince > 24) urgency += 5;
    }
  }

  // Cap at 30
  return Math.min(urgency, 30);
}

function computePersonalOverride(action: Action, context: Context): number {
  // Absolute boost for personal/VIP contacts
  // This would check CP flags or user preferences
  // Note: Blacklist suppression is handled separately in shouldSuppress()

  // Check thread summary for risks/blockers
  const risks = context.thread.summary_json?.risks || [];
  if (risks.length > 0 && action.type === ActionType.NEGOTIATION) {
    return 15; // Boost negotiation actions when risks present
  }

  return 0;
}

function computeUserOverride(action: Action, context: Context): number {
  // User-defined boosts/penalties
  // In future, this would read from user preferences
  // For now, return neutral
  return 0;
}

export function scoreAction(action: Action, context: Context): number {
  const components: ScoringComponents = {
    businessValue: computeBusinessValue(action, context),
    urgency: computeUrgency(action, context),
    personalOverride: computePersonalOverride(action, context),
    userOverride: computeUserOverride(action, context),
  };

  const raw = 
    components.businessValue + 
    components.urgency + 
    components.personalOverride + 
    components.userOverride;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, raw));
}

export function shouldSuppress(score: number, context?: Context): boolean {
  // Hard suppression rule: blacklisted contacts
  if (context?.cp?.is_blacklisted) {
    return true;
  }
  
  return score < MIN_SCORE_THRESHOLD;
}

export function getOutcomeKey(action: Action): string | null {
  const payload = action.payload as any;
  const targetId = payload.target_id ?? payload.thread_id ?? null;
  
  if (!targetId) {
    // Cannot compute outcome key, skip suppression for this action
    return null;
  }
  
  return `${action.type}:${targetId}`;
}

export function suppressCompetingActions(actions: Action[]): Action[] {
  // Group by outcome key, keep highest score
  // Actions with null outcome key are not suppressed
  const byOutcome = new Map<string, Action>();
  const noOutcomeKey: Action[] = [];

  for (const action of actions) {
    const key = getOutcomeKey(action);
    
    if (key === null) {
      // No valid outcome key, don't suppress
      noOutcomeKey.push(action);
      continue;
    }
    
    const existing = byOutcome.get(key);

    if (!existing || action.priority_score > existing.priority_score) {
      byOutcome.set(key, action);
    }
  }

  return [...Array.from(byOutcome.values()), ...noOutcomeKey];
}
