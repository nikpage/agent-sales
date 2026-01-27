// lib/actions/extractScoreFactors.ts

import { generateText } from '../ai/google';

export interface ScoreFactors {
  dollar_value: number;      // V: 1-13 (symbolic scale)
  urgency: number;           // U: 0-10
  pain_factor: number;       // P: 0-10
  weight: number;            // W: 0-10 for movable, 100 for immovable
  offer_multiplier: number;  // 1.5 if property offer from owner, 1.0 otherwise
}

const EXTRACTION_PROMPT = `Analyze this email and extract scoring factors. Respond ONLY with valid JSON.

Email:
{EMAIL_TEXT}

Extract these values:
- dollar_value: Deal size on 1-13 scale (1=small, 5=medium, 8=large, 13=very large). Symbolic scale relative to agent's typical deals.
- urgency: How urgent is this? 0=not urgent, 5=moderate, 10=extremely urgent
- pain_factor: Administrative/legal risk if ignored? 0=none, 5=moderate admin, 10=legal/critical
- weight: 0-10 for movable events (0=very flexible, 10=important but movable), 100 for immovable events (kid's concert, flight, surgery)
- offer_multiplier: 1.5 if this is a property offer FROM owner/landlord (they're offering to sell/rent), 1.0 if inquiry from buyer/renter

Examples:
"I have a 3+1 apartment for 25k/month" → {"dollar_value": 5, "urgency": 6, "pain_factor": 1, "weight": 5, "offer_multiplier": 1.5}
"I'm interested in renting an apartment" → {"dollar_value": 3, "urgency": 5, "pain_factor": 1, "weight": 3, "offer_multiplier": 1.0}
"IRS audit notice - respond by Friday" → {"dollar_value": 1, "urgency": 10, "pain_factor": 10, "weight": 8, "offer_multiplier": 1.0}
"My daughter's concert is Tuesday at 3pm" → {"dollar_value": 1, "urgency": 8, "pain_factor": 0, "weight": 100, "offer_multiplier": 1.0}
"Seller offering villa for 50M CZK" → {"dollar_value": 13, "urgency": 7, "pain_factor": 2, "weight": 6, "offer_multiplier": 1.5}

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
    const dollar_value = Math.max(1, Math.min(13, Number(parsed.dollar_value) || 5));
    const urgency = Math.max(0, Math.min(10, Number(parsed.urgency) || 5));
    const pain_factor = Math.max(0, Math.min(10, Number(parsed.pain_factor) || 2));
    const weight = parsed.weight === 100 ? 100 : Math.max(0, Math.min(10, Number(parsed.weight) || 5));
    const offer_multiplier = parsed.offer_multiplier === 1.5 ? 1.5 : 1.0;

    return {
      dollar_value,
      urgency,
      pain_factor,
      weight,
      offer_multiplier,
    };
  } catch (error) {
    console.error('Failed to extract score factors:', error);

    // Fallback: reasonable defaults for unknown emails
    return {
      dollar_value: 5,    // Medium value
      urgency: 5,         // Medium urgency
      pain_factor: 2,     // Low admin risk
      weight: 5,          // Moderately important
      offer_multiplier: 1.0,  // Not a property offer
    };
  }
}
