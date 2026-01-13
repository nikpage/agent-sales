// lib/embeddings.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_MODELS } from './ai/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!text || text.length < 10) return null;

  try {
    const model = genAI.getGenerativeModel({ model: AI_MODELS.embeddings.model });
    const result = await model.embedContent(text);
    return result.embedding.values;
  } catch (err: any) {
    console.error('Embedding Error:', err.message);
    return null;
  }
}

export async function storeEmbedding(
  supabase: any,
  messageId: string,
  embedding: number[]
): Promise<void> {
  if (!embedding) return;

  const { error } = await supabase
    .from('message_embeddings')
    .insert({
      message_id: messageId,
      embedding: embedding
    });

  if (error) {
    console.error('Store Embedding Error:', error.message);
  }
}

export async function getEmbedding(
  supabase: any,
  messageId: string
): Promise<number[] | null> {
  try {
    const { data, error } = await supabase
      .from('message_embeddings')
      .select('embedding')
      .eq('message_id', messageId)
      .single();

    if (error) throw error;
    return data?.embedding || null;
  } catch (err: any) {
    console.error('Get Embedding Error:', err.message);
    return null;
  }
}

export async function updateConversationEmbedding(
  supabase: any,
  threadId: string,
  newEmbedding: number[]
): Promise<void> {
  // Dimension check - fail fast if embedding is wrong size
  if (newEmbedding.length !== AI_MODELS.embeddings.dim) {
    throw new Error(`Embedding dimension mismatch: expected ${AI_MODELS.embeddings.dim}, got ${newEmbedding.length}`);
  }

  // Fetch current conversation embedding and message count
  const { data: thread } = await supabase
    .from('conversation_threads')
    .select('embedding, message_count')
    .eq('id', threadId)
    .single();

  if (!thread) {
    throw new Error(`Thread ${threadId} not found`);
  }

  const currentCount = thread.message_count || 0;
  const currentEmbedding = thread.embedding;

  let updatedEmbedding: number[];

  if (!currentEmbedding || currentCount === 0) {
    // First message - use new embedding directly
    updatedEmbedding = newEmbedding;
  } else {
    // Rolling average: new_avg = (old_avg * count + new) / (count + 1)
    const dim = AI_MODELS.embeddings.dim;
    updatedEmbedding = new Array(dim);

    for (let i = 0; i < dim; i++) {
      updatedEmbedding[i] = (currentEmbedding[i] * currentCount + newEmbedding[i]) / (currentCount + 1);
    }
  }

  // Atomic update: only increment if count hasn't changed (guards against retries)
  // Return the updated row to verify update succeeded
  const { data, error } = await supabase
    .from('conversation_threads')
    .update({
      embedding: updatedEmbedding,
      message_count: currentCount + 1
    })
    .eq('id', threadId)
    .eq('message_count', currentCount)
    .select('id')
    .maybeSingle();

  if (error) {
    throw new Error(`Database error updating conversation embedding: ${error.message}`);
  }

  // If data is null, 0 rows were updated - concurrent modification
  if (!data) {
    throw new Error('Concurrent update: embedding not applied');
  }
}
