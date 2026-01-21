// lib/actions/scoreAction.ts

export interface ExtractedFacts {
  dollar_value?: number;
  urgency?: number;
  pain_factor?: number;
  days_ignored?: number;

  // higher = less movable, harder deadline, more sacred
  immovability_bonus?: number;
}

export interface ActionScoreBreakdown {
  priority_score: number;

  // component scores
  impact_score: number;    // dollar_value × urgency
  personal_score: number;  // pain_factor × (days_ignored + 1)²
  urgency_score: number;   // raw urgency

  immovability_bonus: number;
}

function asFiniteNumber(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function nonNegative(v: number): number {
  return v > 0 ? v : 0;
}

/**
 * Pure, deterministic scoring.
 *
 * priority_score =
 *   (dollar_value × urgency)
 *   + (pain_factor × (days_ignored + 1)²)
 *   + immovability_bonus
 *
 * This is the ONLY place where importance is decided.
 */
export function scoreAction(facts: ExtractedFacts): ActionScoreBreakdown {
  const dollar_value = nonNegative(asFiniteNumber(facts.dollar_value));
  const urgency = nonNegative(asFiniteNumber(facts.urgency));
  const pain_factor = nonNegative(asFiniteNumber(facts.pain_factor));
  const days_ignored = nonNegative(asFiniteNumber(facts.days_ignored));
  const immovability_bonus = nonNegative(asFiniteNumber(facts.immovability_bonus));

  const impact_score = dollar_value * urgency;

  const days_factor = days_ignored + 1;
  const personal_score = pain_factor * (days_factor * days_factor);

  const urgency_score = urgency;

  const priority_score =
    impact_score +
    personal_score +
    immovability_bonus;

  return {
    priority_score,
    impact_score,
    personal_score,
    urgency_score,
    immovability_bonus,
  };
}
