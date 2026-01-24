// lib/actions/proposeActions.ts

import { computeFollowUpClocks as extractFacts } from '../actionEngine/extractFacts';
import { scoreAction, ActionScoreBreakdown, ExtractedFacts } from './scoreAction';
import { supabase } from '../supabase';
import { enqueueEmailFromAction } from '../email/enqueueEmail';
import { renderEmail } from '../email/renderEmail';

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
  occurred_at: string;
  direction: string;
  user_id: string;
  recipient_email?: string;
  [k: string]: any;
};

// Explicit allowlist of action types that require email
const EMAIL_ACTION_TYPES = new Set([
  'follow_up_email',
  'reminder_email',
  'thank_you_email',
  'confirmation_email'
]);

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
      const user_id = asNonEmptyString(input?.user_id);
      if (!conversation_id || !action_type || !user_id) return null;

      const facts = await extractFacts([{
        occurred_at: input.occurred_at,
        direction: input.direction.toUpperCase() as 'INBOUND' | 'OUTBOUND'
      }]);
      return {
        conversation_id,
        action_type,
        user_id,
        recipient_email: input.recipient_email,
        subject_inputs: input.subject_inputs || {},
        body_inputs: input.body_inputs || {},
        rationale: input.rationale || '',
        facts
      };
    })
  );

  const valid = withFacts.filter((x): x is NonNullable<typeof x> => !!x);

  // 2) Score actions (pure, deterministic)
  const scored: (ProposedAction & { user_id: string; recipient_email?: string })[] = valid.map(({ conversation_id, action_type, user_id, recipient_email, subject_inputs, body_inputs, rationale, facts }) => {
    const score: ActionScoreBreakdown = scoreAction(facts);
    return {
      action_id: '', // Will be set by DB
      conversation_id,
      action_type,
      user_id,
      recipient_email,
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
  const byKey = new Map<string, typeof scored[0]>();
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

    // 5) Enqueue emails for email-requiring actions
    if (data) {
      await Promise.allSettled(
        data.map(async (row) => {
          const original = deduped.find(d => d.conversation_id === row.conversation_id && d.action_type === row.action_type);
          if (!original) return;

          const requiresEmail = EMAIL_ACTION_TYPES.has(row.action_type);
          if (!requiresEmail || !original.recipient_email) return;

          const payload = row.payload as EmailPayload;

          try {
            const rendered = await renderEmail({
              actionType: row.action_type,
              subject_inputs: payload.subject_inputs,
              body_inputs: payload.body_inputs
            });

            await enqueueEmailFromAction({
              action_id: row.id,
              user_id: original.user_id,
              to: original.recipient_email,
              subject: rendered.subject,
              text_body: rendered.text_body,
              html_body: rendered.html_body
            });
          } catch (err) {
            console.error(`Failed to enqueue email for action ${row.id}:`, err);
          }
        })
      );

      // Map returned IDs back
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
