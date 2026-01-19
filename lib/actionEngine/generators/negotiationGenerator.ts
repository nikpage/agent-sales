// lib/actionEngine/generators/negotiationGenerator.ts

import { Action, ActionType, Context, NegotiationPayload } from '../types';

export function generateNegotiationActions(context: Context): Action[] {
  const actions: Action[] = [];

  try {
    // Skip if no messages
    if (context.messages.length === 0) {
      return actions;
    }

    // Only generate for negotiation-relevant thread states
    const negotiationStates = ['negotiation', 'offer', 'closing', 'active'];
    if (!negotiationStates.includes(context.thread.state)) {
      return actions;
    }

    // Check last inbound message for negotiation indicators
    const lastInbound = context.messages.find(m => m.direction === 'inbound');
    if (!lastInbound) {
      return actions;
    }

    const text = lastInbound.cleaned_text.toLowerCase();
    const summary = context.thread.summary_json;

    // Detect negotiation indicators
    const priceIndicators = ['price', 'cost', 'offer', 'cena', 'nabídka', 'sleva', 'discount'];
    const rejectionIndicators = ['too high', 'too expensive', 'cannot', 'unable', 'moc', 'drahé', 'nemůžeme'];
    const interestIndicators = ['interested', 'consider', 'zájem', 'zvážíme', 'think about'];

    const hasPriceDiscussion = priceIndicators.some(ind => text.includes(ind));
    const hasRejection = rejectionIndicators.some(ind => text.includes(ind));
    const hasInterest = interestIndicators.some(ind => text.includes(ind));

    // Check risks from summary
    const hasRisks = summary?.risks && summary.risks.length > 0;

    if (!hasPriceDiscussion && !hasRejection && !hasInterest && !hasRisks) {
      return actions;
    }

    // Determine suggestion type
    let suggestion: 'counter' | 'fallback' | 'hold' = 'hold';
    let details = '';

    if (hasRejection) {
      suggestion = 'fallback';
      details = 'Consider alternative terms or concessions to maintain engagement.';
    } else if (hasPriceDiscussion && hasInterest) {
      suggestion = 'counter';
      details = 'Opportunity to present counter-offer while interest is high.';
    } else if (hasRisks) {
      suggestion = 'hold';
      details = `Address risks before proceeding: ${summary?.risks?.[0] || 'Review thread risks'}`;
    } else {
      suggestion = 'hold';
      details = 'Monitor situation, await further signals before action.';
    }

    const payload: NegotiationPayload = {
      target_id: context.thread.id,
      suggestion,
      details,
    };

    actions.push({
      type: ActionType.NEGOTIATION,
      payload,
      priority_score: 0, // Will be scored later
      rationale: 'Thread indicates active negotiation requiring strategic response.',
    });

  } catch (err) {
    console.error('[negotiationGenerator] Error:', err);
  }

  return actions;
}
