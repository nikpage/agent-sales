// lib/actions/proposeActions.ts

import { extractFacts } from '../actionEngine/extractFacts';
import { scoreAction, ActionScoreBreakdown, ExtractedFacts } from './scoreAction';
import { supabase } from '../supabase';

export interface ProposedAction {
  outcome_key: string;
  facts: ExtractedFacts;

  priority_score: number;
  impact_score: number;
  personal_score: number;
  urgency_score: number;
  immovability_bonus: number;
}

type ActionInput = {
  outcome_key: string;
  [k: string]: any;
};

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}

export async function proposeActions(inputs: ActionInput[]): Promise<ProposedAction[]> {
  // 1) Extract facts (async)
  const withFacts = await Promise.all(
    inputs.map(async (input) => {
      const outcome_key = asNonEmptyString(input?.outcome_key);
      if (!outcome_key) return null;

      const facts = await extractFacts(input);
      return { outcome_key, facts };
    })
  );

  const valid = withFacts.filter(
    (x): x is { outcome_key: string; facts: ExtractedFacts } => !!x
  );

  // 2) Score actions (pure, deterministic)
  const scored: ProposedAction[] = valid.map(({ outcome_key, facts }) => {
    const score: ActionScoreBreakdown = scoreAction(facts);
    return {
      outcome_key,
      facts,
      priority_score: score.priority_score,
      impact_score: score.impact_score,
      personal_score: score.personal_score,
      urgency_score: score.urgency_score,
      immovability_bonus: score.immovability_bonus,
    };
  });

  // 3) Dedupe by outcome_key
  const byOutcome = new Map<string, ProposedAction>();
  for (const item of scored) {
    const existing = byOutcome.get(item.outcome_key);
    if (!existing || item.priority_score > existing.priority_score) {
      byOutcome.set(item.outcome_key, item);
    }
  }
  const deduped = Array.from(byOutcome.values());

  // 4) Persist with UPSERT to avoid outcome_key collisions
  if (deduped.length) {
    const { error } = await supabase
      .from('action_proposals')
      .upsert(
        deduped.map((a) => ({
          outcome_key: a.outcome_key,
          facts: a.facts,
          priority_score: a.priority_score,
          impact_score: a.impact_score,
          personal_score: a.personal_score,
          urgency_score: a.urgency_score,
          immovability_bonus: a.immovability_bonus,
        })),
        { onConflict: 'outcome_key' }
      );

    if (error) throw error;
  }

  // 5) Sort by priority_score (desc)
  deduped.sort((a, b) => b.priority_score - a.priority_score);

  return deduped;
}
