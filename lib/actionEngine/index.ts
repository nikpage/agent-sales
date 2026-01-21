// lib/actionEngine/index.ts

// Uses existing shared Supabase client (no new instances)
import { supabase } from '../supabase';
import { Action, ActionType, Context } from './types';
import { validateAction } from './schemas';
import { assembleContext } from './contextAssembler';
import { shouldSuppress, suppressCompetingActions, filterVisibleActions, rankActions } from './priorityEngine';
import { getAllCandidates } from './generators';

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

    // Step 4: Suppress competing actions (same outcome key)
    const dedupedActions = suppressCompetingActions(validActions);

    // Step 5: Drop blacklisted
    const filteredActions = dedupedActions.filter(a => !shouldSuppress(0, context));

    if (filteredActions.length === 0) {
      return [];
    }

    // Step 6: Filter visible and rank by urgency
    const rankedActions = rankActions(filterVisibleActions(filteredActions));

    // Step 7: Insert into action_proposals (immutable, bulk)
try {
  const { error } = await supabase.from('action_proposals').insert(
    rankedActions.map(action => ({
      conversation_id: thread_id,
      action_type: action.type,
      payload: action.payload,
      rationale: action.rationale,
      urgency: action.urgency,
      status: action.status,
      snoozed_until: action.snoozed_until,
      acted_at: action.acted_at,
    }))
  );

  if (error) {
    console.error('[actionEngine] Failed to persist actions:', error);
  }
} catch (err) {
  console.error('[actionEngine] Failed to persist actions:', err);
}

    // Step 8: Return actions
    return rankedActions;

  } catch (err) {
    // Fail closed: return empty array
    console.error('[actionEngine] proposeActions failed:', err);
    return [];
  }
}

// Re-export types for consumers
export { Action, ActionType, Context } from './types';
