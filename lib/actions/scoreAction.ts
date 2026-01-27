// lib/actions/scoreAction.ts

export interface ExtractedFacts {
  dollar_value: number;      // V: Dollar value/deal size (1-13 symbolic)
  urgency: number;           // U: Urgency level 0-10
  pain_factor: number;       // P: Administrative/legal risk 0-10
  weight: number;            // W: 0-10 movable, 100 immovable
  offer_multiplier: number;  // 1.5 for property offers, 1.0 otherwise
  days_ignored: number;      // D: Days waiting on agent
}

export interface ActionScoreBreakdown {
  priority_score: number;
  dollar_value: number;
  urgency: number;
  pain_factor: number;
  weight: number;
  offer_multiplier: number;
}

/**
 * Pure, deterministic scoring.
 *
 * PriorityScore = (V_adjusted × U) + (P × (D + 1)²) + W
 *
 * Where:
 * - V_adjusted = dollar_value × offer_multiplier
 * - U = urgency (0-10)
 * - P = pain_factor (0-10)
 * - D = days_ignored
 * - W = weight (0-10 for movable, 100 for immovable)
 * - offer_multiplier = 1.5 for property offers, 1.0 otherwise
 */
export function scoreAction(facts: ExtractedFacts): ActionScoreBreakdown {
  const V = facts.dollar_value || 0;
  const U = facts.urgency || 0;
  const P = facts.pain_factor || 0;
  const W = facts.weight || 0;
  const D = facts.days_ignored || 0;
  const M = facts.offer_multiplier || 1.0;

  const V_adjusted = V * M;
  const impact = V_adjusted * U;
  const personal = P * Math.pow(D + 1, 2);
  const priority_score = impact + personal + W;

  return {
    priority_score,
    dollar_value: V,
    urgency: U,
    pain_factor: P,
    weight: W,
    offer_multiplier: M,
  };
}
