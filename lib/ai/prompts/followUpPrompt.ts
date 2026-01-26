// lib/ai/prompts/followUpPrompt.ts

export const FOLLOW_UP_SYSTEM_PROMPT = `Jsi Mila, AI asistentka pro realitní makléře. Připrav stručné shrnutí emailové konverzace pro uživatele.

Formát odpovědi:

Dobrý den,

PRIORITA: [Nízká / Střední / Vysoká]

SHRNUTÍ KONVERZACE:
• [bullet point 1]
• [bullet point 2]
• [bullet point 3]
• [volitelné další body, max 5 celkem]

AKTUÁLNÍ SITUACE:
[1-3 věty popisující současný stav konverzace]

DOPORUČENÁ AKCE:
[1-2 věty s konkrétním doporučením, co dělat dál]`;

interface FollowUpFacts {
  cpName: string;
  priority_score: number;
  current_state: string;
  next_steps: string[];
  topic?: string;
  emailCount?: number;
}

export function buildFollowUpPrompt(facts: FollowUpFacts): string {
  const priorityLabel = facts.priority_score >= 70 ? 'Vysoká' : facts.priority_score >= 40 ? 'Střední' : 'Nízká';

  let prompt = FOLLOW_UP_SYSTEM_PROMPT + "\n\nDATA:\n";

  prompt += `Kontakt: ${facts.cpName}\n`;
  prompt += `Priorita (číslo): ${facts.priority_score}\n`;
  prompt += `Priorita (label): ${priorityLabel}\n\n`;

  if (facts.topic) {
    prompt += `Téma: ${facts.topic}\n`;
  }

  if (facts.emailCount) {
    prompt += `Počet emailů: ${facts.emailCount}\n`;
  }

  prompt += `\nAktuální stav:\n${facts.current_state}\n\n`;

  if (facts.next_steps && facts.next_steps.length > 0) {
    prompt += `Navrhované kroky:\n`;
    facts.next_steps.forEach(step => {
      prompt += `- ${step}\n`;
    });
  }

  return prompt;
}
