// lib/actions/scoreAction.ts

export interface ExtractedFacts {
  dollar_value: number;      // V: Dollar value/deal size
  urgency: number;           // U: Urgency level 0-10
  pain_factor: number;       // P: Administrative/legal risk 0-10
  weight: number;            // W: Bonus weight (0 normal, 1000 sacred)
  days_ignored: number;      // D: Days waiting on agent
}

export interface ActionScoreBreakdown {
  priority_score: number;
  dollar_value: number;
  urgency: number;
  pain_factor: number;
  weight: number;
}

/**
 * Pure, deterministic scoring.
 *
 * PriorityScore = (V × U) + (P × (D + 1)²) + W
 *
 * Where:
 * - V = dollar_value
 * - U = urgency (0-10)
 * - P = pain_factor (0-10)
 * - D = days_ignored
 * - W = weight (0 for normal, 1000 for sacred events)
 */
export function scoreAction(facts: ExtractedFacts): ActionScoreBreakdown {
  const V = facts.dollar_value || 0;
  const U = facts.urgency || 0;
  const P = facts.pain_factor || 0;
  const W = facts.weight || 0;
  const D = facts.days_ignored || 0;

  const impact = V * U;
  const personal = P * Math.pow(D + 1, 2);
  const priority_score = impact + personal + W;

  return {
    priority_score,
    dollar_value: V,
    urgency: U,
    pain_factor: P,
    weight: W,
  };
}
