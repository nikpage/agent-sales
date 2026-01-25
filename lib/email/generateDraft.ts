// lib/email/generateDraft.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_MODELS } from '../ai/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface DraftContext {
  cpName: string;
  cpEmail: string;
  conversationSummary: string;
  lastMessage: string;
  suggestedAction: string;
}

export async function generateDraftReply(context: DraftContext): Promise<{ subject: string; body: string }> {
  const model = genAI.getGenerativeModel({ model: AI_MODELS.writing });

  const prompt = `You are writing an email reply on behalf of a real estate agent.

CONTEXT:
- Replying to: ${context.cpName} (${context.cpEmail})
- Conversation summary: ${context.conversationSummary}
- Their last message: ${context.lastMessage}
- Suggested action: ${context.suggestedAction}

Write a professional, concise email reply in Czech.
Return ONLY two lines:
Line 1: Subject line (just the text, no "Subject:" prefix)
Line 2: Email body

Keep it natural and friendly. Sign off with just the agent's name.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const lines = text.split('\n');
  const subject = lines[0] || 'Re: Conversation';
  const body = lines.slice(1).join('\n').trim();

  return { subject, body };
}
