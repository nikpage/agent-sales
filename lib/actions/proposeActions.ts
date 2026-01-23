// lib/actions/proposeActions.ts

import { computeFollowUpClocks as extractFacts } from '../actionEngine/extractFacts';
import { scoreAction, ActionScoreBreakdown, ExtractedFacts } from './scoreAction';
import { supabase } from '../supabase';

export interface EmailPayload {
  subject_inputs: Record<string, any>;
  body_inputs: Record<string, any>;
}

export interface ProposedAction {
  action_id: string;
  action_type: string;
  conversation_id: string;
  priority_score: number;
  impact_score: number;
  personal_score: number;
  urgency_score: number;
  immovability_bonus: number;
  context_payload: EmailPayload;
  rationale: string;
}

type ActionInput = {
  conversation_id: string;
  action_type: string;
  subject_inputs: Record<string, any>;
  body_inputs: Record<string, any>;
  rationale: string;
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
      const conversation_id = asNonEmptyString(input?.conversation_id);
      const action_type = asNonEmptyString(input?.action_type);
      if (!conversation_id || !action_type) return null;

      const facts = await extractFacts([input]);
      return {
        conversation_id,
        action_type,
        subject_inputs: input.subject_inputs || {},
        body_inputs: input.body_inputs || {},
        rationale: input.rationale || '',
        facts
      };
    })
  );

  const valid = withFacts.filter((x): x is NonNullable<typeof x> => !!x);

  // 2) Score actions (pure, deterministic)
  const scored: ProposedAction[] = valid.map(({ conversation_id, action_type, subject_inputs, body_inputs, rationale, facts }) => {
    const score: ActionScoreBreakdown = scoreAction(facts);
    return {
      action_id: '', // Will be set by DB
      conversation_id,
      action_type,
      priority_score: score.priority_score,
      impact_score: score.impact_score,
      personal_score: score.personal_score,
      urgency_score: score.urgency_score,
      immovability_bonus: score.immovability_bonus,
      context_payload: {
        subject_inputs,
        body_inputs
      },
      rationale
    };
  });

  // 3) Dedupe by conversation_id + action_type
  const byKey = new Map<string, ProposedAction>();
  for (const item of scored) {
    const key = `${item.conversation_id}:${item.action_type}`;
    const existing = byKey.get(key);
    if (!existing || item.priority_score > existing.priority_score) {
      byKey.set(key, item);
    }
  }
  const deduped = Array.from(byKey.values());

  // 4) Persist with UPSERT
  if (deduped.length) {
    const { data, error } = await supabase
      .from('action_proposals')
      .upsert(
        deduped.map((a) => ({
          conversation_id: a.conversation_id,
          action_type: a.action_type,
          payload: a.context_payload,
          priority_score: a.priority_score,
          impact_score: a.impact_score,
          personal_score: a.personal_score,
          urgency_score: a.urgency_score,
          rationale: a.rationale,
        })),
        { onConflict: 'conversation_id,action_type' }
      )
      .select('id, conversation_id, action_type, payload, priority_score, impact_score, personal_score, urgency_score, rationale');

    if (error) throw error;

    // Map returned IDs back
    if (data) {
      const mapped = data.map(row => {
        const original = deduped.find(d => d.conversation_id === row.conversation_id && d.action_type === row.action_type);
        return {
          action_id: row.id,
          conversation_id: row.conversation_id,
          action_type: row.action_type,
          priority_score: row.priority_score,
          impact_score: row.impact_score,
          personal_score: row.personal_score,
          urgency_score: row.urgency_score,
          immovability_bonus: original?.immovability_bonus || 0,
          context_payload: row.payload as EmailPayload,
          rationale: row.rationale
        };
      });

      mapped.sort((a, b) => b.priority_score - a.priority_score);
      return mapped;
    }
  }

  return [];
}
