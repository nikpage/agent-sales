// lib/actions/extractScoreFactors.ts

import { generateText } from '../ai/google';

export interface ScoreFactors {
  dollar_value: number;  // V: 0-10000+
  urgency: number;       // U: 0-10
  pain_factor: number;   // P: 0-10
  weight: number;        // W: 0 or 1000
}

const EXTRACTION_PROMPT = `Analyze this email and extract scoring factors. Respond ONLY with valid JSON.

Email:
{EMAIL_TEXT}

Extract these values:
- dollar_value: Estimated deal value in thousands (0 if no deal mentioned, 1-100+ for deals)
- urgency: How urgent is this? 0=not urgent, 5=moderate, 10=extremely urgent
- pain_factor: Administrative/legal risk if ignored? 0=none, 5=moderate admin, 10=legal/IRS/critical
- weight: 1000 if this is a sacred/immovable event (kid's concert, surgery, non-negotiable deadline), otherwise 0

Examples:
"Interested in your $50k property" → {"dollar_value": 50, "urgency": 6, "pain_factor": 1, "weight": 0}
"IRS audit notice - respond by Friday" → {"dollar_value": 0, "urgency": 10, "pain_factor": 10, "weight": 0}
"My daughter's concert is Tuesday at 3pm" → {"dollar_value": 0, "urgency": 8, "pain_factor": 0, "weight": 1000}
"Just checking in about the apartment" → {"dollar_value": 5, "urgency": 4, "pain_factor": 1, "weight": 0}

Respond with ONLY the JSON object, no explanation.`;

export async function extractScoreFactors(emailText: string): Promise<ScoreFactors> {
  try {
    const prompt = EXTRACTION_PROMPT.replace('{EMAIL_TEXT}', emailText.slice(0, 2000));

    const response = await generateText(prompt, {
      model: 'gemini-2.5-flash',
      temperature: 0.3,
    });

    const cleaned = response.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate and clamp values
    const dollar_value = Math.max(0, Math.min(10000, Number(parsed.dollar_value) || 0));
    const urgency = Math.max(0, Math.min(10, Number(parsed.urgency) || 5));
    const pain_factor = Math.max(0, Math.min(10, Number(parsed.pain_factor) || 2));
    const weight = parsed.weight === 1000 ? 1000 : 0;

    return {
      dollar_value,
      urgency,
      pain_factor,
      weight,
    };
  } catch (error) {
    console.error('Failed to extract score factors:', error);

    // Fallback: reasonable defaults for unknown emails
    return {
      dollar_value: 5,    // Assume small potential value
      urgency: 5,         // Medium urgency
      pain_factor: 2,     // Low admin risk
      weight: 0,          // Not sacred
    };
  }
}
