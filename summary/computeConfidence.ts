// lib/summary/computeConfidence.ts

export function computeConfidence(input: {
  similarity?: number;
  evidenceCount?: number;
  contradictions?: number;
}): number {
  const {
    similarity = 0,
    evidenceCount = 0,
    contradictions = 0,
  } = input;

  let score = 0.5;

  // Similarity contribution (0-0.4 range)
  if (similarity > 0) {
    score += Math.min(similarity, 1.0) * 0.4;
  }

  // Evidence count contribution (0-0.3 range)
  if (evidenceCount > 0) {
    const evidenceScore = Math.min(evidenceCount / 10, 1.0);
    score += evidenceScore * 0.3;
  }

  // Contradictions penalty (up to -0.5)
  if (contradictions > 0) {
    const penalty = Math.min(contradictions * 0.1, 0.5);
    score -= penalty;
  }

  return Math.max(0.0, Math.min(1.0, score));
}
