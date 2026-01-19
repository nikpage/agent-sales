// lib/actionEngine/generators/replyGenerator.ts

import { Action, ActionType, Context, ReplyDraftPayload } from '../types';

export function generateReplyActions(context: Context): Action[] {
  const actions: Action[] = [];

  try {
    // Skip if no messages
    if (context.messages.length === 0) {
      return actions;
    }

    // Check if last message was inbound (needs reply)
    const lastMessage = context.messages[0];
    if (lastMessage.direction !== 'inbound') {
      return actions;
    }

    // Determine tone based on context
    let tone: 'formal' | 'friendly' | 'urgent' | 'neutral' = 'neutral';

    const text = lastMessage.cleaned_text.toLowerCase();
    const summary = context.thread.summary_json;

    // Check for urgency indicators
    if (text.includes('urgent') || text.includes('asap') || text.includes('immediately') || text.includes('ihned')) {
      tone = 'urgent';
    }
    // Check thread state for formality
    else if (context.thread.state === 'negotiation' || context.thread.state === 'closing') {
      tone = 'formal';
    }
    // Check for friendly indicators
    else if (text.includes('thanks') || text.includes('děkuji') || text.includes('great')) {
      tone = 'friendly';
    }

    // Generate draft based on context
    let draftText = '';
    
    if (summary?.next_steps && summary.next_steps.length > 0) {
      draftText = `Regarding next steps: ${summary.next_steps[0]}`;
    } else if (summary?.current_state) {
      draftText = `Following up on: ${summary.current_state}`;
    } else {
      draftText = 'Thank you for your message. I will review and respond shortly.';
    }

    const payload: ReplyDraftPayload = {
      target_id: context.thread.id,
      draft_text: draftText,
      tone,
    };

    actions.push({
      type: ActionType.REPLY_DRAFT,
      payload,
      priority_score: 0, // Will be scored later
      rationale: 'Inbound message awaiting response.',
    });

  } catch (err) {
    console.error('[replyGenerator] Error:', err);
  }

  return actions;
}
