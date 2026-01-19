// lib/ai/google.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_MODELS } from './config';
import { withRetry } from '../../agent/retryPolicy';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY missing');

const genAI = new GoogleGenerativeAI(apiKey);

export async function getEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({
    model: AI_MODELS.embeddings.model,
  });
  const result = await withRetry(
    () => model.embedContent(text),
    'gemini.embed'
  );
  return result.embedding.values;
}

export async function generateText(
  prompt: string,
  options?: { model?: string; temperature?: number }
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: options?.model || AI_MODELS.classification,
  });
  const result = await withRetry(
    () => model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
      },
    }),
    'gemini.generate'
  );
  return result.response.text();
}
