// lib/actionEngine/index.ts

// Uses existing shared Supabase client (no new instances)
import { supabase } from '../supabase';
import { Action, ActionType, Context } from './types';
import { validateAction } from './schemas';
import { assembleContext } from './contextAssembler';
import { scoreAction, shouldSuppress, suppressCompetingActions } from './priorityEngine';
import { getAllCandidates } from './generators';

const MAX_ACTIONS_RETURNED = 3;

export async function proposeActions(thread_id: string): Promise<Action[]> {
  try {
    // Step 1: Assemble context
    const context = await assembleContext(thread_id);
    if (!context) {
      console.warn('[actionEngine] Context assembly failed, returning empty');
      return [];
    }

    // Step 2: Generate all candidates
    const candidates = getAllCandidates(context);
    if (candidates.length === 0) {
      return [];
    }

    // Step 3: Validate each action
    const validActions: Action[] = [];
    for (const candidate of candidates) {
      const validated = validateAction(candidate);
      if (validated) {
        validActions.push(validated);
      } else {
        console.warn('[actionEngine] Invalid action skipped:', candidate.type);
      }
    }

    if (validActions.length === 0) {
      return [];
    }

    // Step 4: Score each valid action
    const scoredActions: Action[] = [];
    for (const action of validActions) {
      try {
        const score = scoreAction(action, context);
        scoredActions.push({
          ...action,
          priority_score: score,
        });
      } catch (err) {
        console.error('[actionEngine] Scoring failed for action:', err);
        // Skip this action on scoring failure
      }
    }

    if (scoredActions.length === 0) {
      return [];
    }

    // Step 5: Suppress competing actions (same outcome key)
    const dedupedActions = suppressCompetingActions(scoredActions);

    // Step 6: Drop actions below minimum threshold or blacklisted
    const filteredActions = dedupedActions.filter(a => !shouldSuppress(a.priority_score, context));

    if (filteredActions.length === 0) {
      return [];
    }

    // Step 7: Sort by score descending, cut to top N
    filteredActions.sort((a, b) => b.priority_score - a.priority_score);
    const topActions = filteredActions.slice(0, MAX_ACTIONS_RETURNED);

    // Step 8: Insert into action_proposals (immutable, bulk)
try {
  const { error } = await supabase.from('action_proposals').insert(
    topActions.map(action => ({
      conversation_id: thread_id,
      action_type: action.type,
      payload: action.payload,
      rationale: action.rationale,

      // scores
      priority_score: action.priority_score,

      // REQUIRED BY SCHEMA: set explicit defaults so inserts can't fail on NOT NULL
      impact_score: (action as any).impact_score ?? 0,
      urgency_score: (action as any).urgency_score ?? 0,
      personal_score: (action as any).personal_score ?? 0,
    }))
  );

  if (error) {
    console.error('[actionEngine] Failed to persist actions:', error);
  }
} catch (err) {
  console.error('[actionEngine] Failed to persist actions:', err);
}

    // Step 9: Return actions
    return topActions;

  } catch (err) {
    // Fail closed: return empty array
    console.error('[actionEngine] proposeActions failed:', err);
    return [];
  }
}

// Re-export types for consumers
export { Action, ActionType, Context } from './types';
