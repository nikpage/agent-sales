// Path: lib/embeddings.ts

import { AI_MODELS } from './ai/config';
import { getEmbedding } from './ai/google';

const DIM = 768;

function normalize(vec: any[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < vec.length && out.length < DIM; i++) {
    const v = vec[i];
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
    else out.push(0);
  }
  while (out.length < DIM) out.push(0);
  return out;
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!text?.trim()) return null;
  const raw = await getEmbedding(text, AI_MODELS.embeddings.model);
  if (!Array.isArray(raw)) return null;
  return normalize(raw);
}

export async function storeEmbedding(supabase: any, messageId: string, embedding: number[]) {
  const vec = normalize(embedding);
  const { error } = await supabase
    .from('message_embeddings')
    .upsert({ message_id: messageId, embedding: vec });
  if (error) throw error;
}
