// lib/embeddings.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = 'text-embedding-004';
const DIM = 768;

function normalize(vec: any[]): number[] {
  const out: number[] = new Array(DIM);
  for (let i = 0; i < DIM; i++) {
    const v = vec?.[i];
    out[i] = (typeof v === 'number' && Number.isFinite(v)) ? v : 0;
  }
  return out;
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!text || text.trim().length < 10) return null;

  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.embedContent(text);
  const values = result?.embedding?.values;

  if (!Array.isArray(values) || values.length < DIM) return null;
  return normalize(values);
}

export async function storeEmbedding(
  supabase: any,
  messageId: string,
  embedding: number[]
): Promise<void> {
  const vec = normalize(embedding);
  const { error } = await supabase
    .from('message_embeddings')
    .upsert({ message_id: messageId, embedding: vec });

  if (error) throw error;
}

export async function getEmbedding(
  supabase: any,
  messageId: string
): Promise<number[] | null> {
  const { data, error } = await supabase
    .from('message_embeddings')
    .select('embedding')
    .eq('message_id', messageId)
    .single();

  if (error) return null;

  let embedding = data?.embedding;
  if (!embedding) return null;

  // If string, parse to array
  if (typeof embedding === 'string' && embedding.startsWith('[')) {
    try {
      embedding = JSON.parse(embedding);
    } catch {
      return null;
    }
  }

  // Validate 768-dimension array
  if (!Array.isArray(embedding) || embedding.length !== 768) {
    return null;
  }

  // Validate all elements are numbers
  for (let i = 0; i < 768; i++) {
    if (typeof embedding[i] !== 'number' || !Number.isFinite(embedding[i])) {
      return null;
    }
  }

  return embedding;
}

export async function updateConversationEmbedding(
  supabase: any,
  threadId: string,
  newEmbedding: number[]
): Promise<void> {
  const vec = normalize(newEmbedding);

  const { data: thread, error: tErr } = await supabase
    .from('conversation_threads')
    .select('embedding, message_count')
    .eq('id', threadId)
    .single();

  if (tErr || !thread) throw new Error(`Thread ${threadId} not found`);

  const currentCount = thread.message_count || 0;
  const currentEmbedding = thread.embedding;

  let updated: number[];
  if (!currentEmbedding || currentCount === 0) {
    updated = vec;
  } else {
    const embeddingArray = typeof currentEmbedding === 'string'
      ? JSON.parse(currentEmbedding)
      : currentEmbedding;
    const cur = normalize(embeddingArray);
    updated = new Array(DIM);
    for (let i = 0; i < DIM; i++) {
      updated[i] = (cur[i] * currentCount + vec[i]) / (currentCount + 1);
    }
  }

  const { data: upd, error: uErr } = await supabase
    .from('conversation_threads')
    .update({ embedding: updated, message_count: currentCount + 1 })
    .eq('id', threadId)
    .eq('message_count', currentCount)
    .select('id')
    .maybeSingle();

  if (uErr) throw new Error(`Database error updating conversation embedding: ${uErr.message}`);
  if (!upd) throw new Error('Concurrent update: embedding not applied');
}
