// lib/actions/proposeActions.ts
import { computeFollowUpClocks as extractFacts } from '../actionEngine/extractFacts';
import { extractScoreFactors } from './extractScoreFactors';
import { scoreAction, ActionScoreBreakdown } from './scoreAction';
import { supabase } from '../supabase';
import { enqueueEmailFromAction } from '../email/enqueueEmail';
import { renderEmail } from '../email/renderEmail';
import { actionTemplates } from '../email/templates/byAction';

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

const EMAIL_ACTION_TYPES = new Set([
  'follow_up',
  'schedule_meeting',
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

async function getCpIdFromConversation(conversationId: string): Promise<string | null> {
  const { data } = await supabase
    .from('thread_participants')
    .select('cp_id')
    .eq('thread_id', conversationId)
    .limit(1)
    .single();
  return data?.cp_id || null;
}

export async function proposeActions(inputs: ActionInput[]): Promise<ProposedAction[]> {
  const withFacts = await Promise.all(
    inputs.map(async (input) => {
      const conversation_id = asNonEmptyString(input?.conversation_id);
      const action_type = asNonEmptyString(input?.action_type);
      const user_id = asNonEmptyString(input?.user_id);
      const recipient_email = asNonEmptyString(input?.recipient_email);
      const message_text = asNonEmptyString(input?.message_text);
      if (!conversation_id || !action_type || !user_id) return null;

      const timingFacts = await extractFacts([{
        occurred_at: input.occurred_at,
        direction: input.direction.toUpperCase() as 'INBOUND' | 'OUTBOUND'
      }]);

      return {
        conversation_id,
        action_type,
        user_id,
        recipient_email,
        message_text,
        subject_inputs: input.subject_inputs || {},
        body_inputs: input.body_inputs || {},
        rationale: input.rationale || '',
        timingFacts
      };
    })
  );

  const valid = withFacts.filter((x): x is NonNullable<typeof x> => !!x);

  const scored = await Promise.all(
    valid.map(async ({ conversation_id, action_type, user_id, recipient_email, message_text, subject_inputs, body_inputs, rationale, timingFacts }) => {
      // Extract V, U, P, W from email content using AI
      const scoreFactors = await extractScoreFactors(message_text || '');

      // Combine with timing data
      const combinedFacts = {
        ...scoreFactors,
        days_ignored: timingFacts.days_waiting_on_agent
      };

      const score: ActionScoreBreakdown = scoreAction(combinedFacts);
      const cp_id = await getCpIdFromConversation(conversation_id);

      return {
        action_id: '',
        conversation_id,
        action_type,
        user_id,
        cp_id,
        recipient_email,
        priority_score: score.priority_score,
        dollar_value: score.dollar_value,
        urgency: score.urgency,
        pain_factor: score.pain_factor,
        weight: score.weight,
        context_payload: {
          subject_inputs,
          body_inputs
        },
        rationale
      };
    })
  );

  const byKey = new Map<string, typeof scored[0]>();
  for (const item of scored) {
    const key = `${item.conversation_id}:${item.action_type}`;
    const existing = byKey.get(key);
    if (!existing || item.priority_score > existing.priority_score) {
      byKey.set(key, item);
    }
  }
  const deduped = Array.from(byKey.values());

  if (deduped.length) {
    const { data, error } = await supabase
      .from('action_proposals')
      .insert(
        deduped.map((a) => ({
          conversation_id: a.conversation_id,
          user_id: a.user_id,
          cp_id: a.cp_id,
          action_type: a.action_type,
          payload: a.context_payload,
          priority_score: a.priority_score,
          dollar_value: a.dollar_value,
          urgency: a.urgency,
          pain_factor: a.pain_factor,
          weight: a.weight,
          rationale: a.rationale,
        }))
      )
      .select('id, conversation_id, action_type, payload, priority_score, dollar_value, urgency, pain_factor, weight, rationale');

    if (error) {
      if (error.code !== '23505') throw error;
    }

    if (data) {
      await Promise.all(
        data.map(async (row) => {
          const original = deduped.find(d => d.conversation_id === row.conversation_id && d.action_type === row.action_type);
          if (!original) return;
          if (!EMAIL_ACTION_TYPES.has(original.action_type)) return;
          if (!original.recipient_email) return;

          const { text_body, html_body, subject } = renderEmail(
            {
              action_id: row.id,
              action_type: row.action_type,
              conversation_id: row.conversation_id,
              priority_score: row.priority_score,
              impact_score: row.dollar_value,
              personal_score: row.pain_factor,
              urgency_score: row.urgency,
              immovability_bonus: row.weight,
              context_payload: row.payload as any,
              rationale: row.rationale
            },
            actionTemplates,
            original.recipient_email,
            ''
          );

          // Update action_proposals with draft content
          await supabase
            .from('action_proposals')
            .update({
              draft_subject: subject,
              draft_body_text: text_body
            })
            .eq('id', row.id);

          // NOTE: Email sending moved to post-ingestion notification step
        })
      );
    }

    return (data || []).map(row => {
      const orig = deduped.find(d => d.conversation_id === row.conversation_id && d.action_type === row.action_type);
      return {
        action_id: row.id,
        conversation_id: row.conversation_id,
        action_type: row.action_type,
        priority_score: row.priority_score,
        impact_score: row.dollar_value,
        personal_score: row.pain_factor,
        urgency_score: row.urgency,
        immovability_bonus: row.weight,
        context_payload: row.payload as EmailPayload,
        rationale: row.rationale
      };
    });
  }

  return [];
}
