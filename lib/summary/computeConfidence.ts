// lib/summary/computeConfidence.ts

/**
 * Computes a confidence score for a conversation summary.
 *
 * @param input - Metrics used to calculate confidence
 * @param input.similarity - Semantic similarity score between messages (0.0-1.0)
 * @param input.evidenceCount - Number of messages supporting the summary (typically 1-20)
 * @param input.contradictions - Number of conflicting signals detected (typically 0-5)
 *
 * @returns Confidence score between 0.0 (no confidence) and 1.0 (high confidence)
 *
 * Scoring formula:
 * - Base: 0.5 (neutral starting point)
 * - Similarity: +0.0 to +0.4 (how well messages align)
 * - Evidence: +0.0 to +0.3 (more messages = more confidence)
 * - Contradictions: -0.0 to -0.5 (conflicts reduce confidence)
 */
export function computeConfidence(input: {
  similarity?: number;
  evidenceCount?: number;
  contradictions?: number;
}): { score: number; reason: string } {
  const {
    similarity = 0,
    evidenceCount = 0,
    contradictions = 0,
  } = input;

  // Validate inputs
  const validSimilarity = isFinite(similarity) ? Math.max(0, Math.min(1, similarity)) : 0;
  const validEvidence = isFinite(evidenceCount) ? Math.max(0, evidenceCount) : 0;
  const validContradictions = isFinite(contradictions) ? Math.max(0, contradictions) : 0;

  let score = 0.5;
  const reasons: string[] = [];

  // Similarity contribution (0-0.4 range)
  if (validSimilarity > 0) {
    const similarityBonus = validSimilarity * 0.4;
    score += similarityBonus;
    reasons.push(`similarity=${validSimilarity.toFixed(2)}`);
  }

  // Evidence count contribution (0-0.3 range)
  if (validEvidence > 0) {
    const evidenceScore = Math.min(validEvidence / 10, 1.0);
    score += evidenceScore * 0.3;
    reasons.push(`evidence=${validEvidence}`);
  }

  // Contradictions penalty (up to -0.5)
  if (validContradictions > 0) {
    const penalty = Math.min(validContradictions * 0.1, 0.5);
    score -= penalty;
    reasons.push(`contradictions=${validContradictions}`);
  }

  const finalScore = Math.max(0.0, Math.min(1.0, score));
  const reason = reasons.length > 0 ? reasons.join(', ') : 'default';

  return {
    score: finalScore,
    reason
  };
}
