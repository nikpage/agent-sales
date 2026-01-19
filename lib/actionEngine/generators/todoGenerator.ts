// lib/actionEngine/generators/todoGenerator.ts

import { Action, ActionType, Context, TodoPayload } from '../types';

export function generateTodoActions(context: Context): Action[] {
  const actions: Action[] = [];

  try {
    // Skip if no messages
    if (context.messages.length === 0) {
      return actions;
    }

    // Check last inbound message for action indicators
    const lastInbound = context.messages.find(m => m.direction === 'inbound');
    if (!lastInbound) {
      return actions;
    }

    const text = lastInbound.cleaned_text.toLowerCase();

    // Detect TODO indicators in message
    const todoIndicators = [
      'please send',
      'can you',
      'could you',
      'need you to',
      'waiting for',
      'připravte',
      'pošlete',
      'potřebuji',
    ];

    const hasTodoIndicator = todoIndicators.some(ind => text.includes(ind));
    if (!hasTodoIndicator) {
      return actions;
    }

    // Determine urgency from text
    let urgency: 'TODAY' | 'TOMORROW' | 'SOON' = 'SOON';
    if (text.includes('urgent') || text.includes('asap') || text.includes('today') || text.includes('dnes') || text.includes('ihned')) {
      urgency = 'TODAY';
    } else if (text.includes('tomorrow') || text.includes('zítra')) {
      urgency = 'TOMORROW';
    }

    // Extract a short description (first 100 chars of request)
    const description = lastInbound.cleaned_text.substring(0, 100).trim();

    const payload: TodoPayload = {
      target_id: lastInbound.id,
      description: `Follow up: ${description}`,
      urgency,
    };

    actions.push({
      type: ActionType.TODO,
      payload,
      priority_score: 0, // Will be scored later
      rationale: 'Message contains action request requiring follow-up.',
    });

  } catch (err) {
    console.error('[todoGenerator] Error:', err);
  }

  return actions;
}
