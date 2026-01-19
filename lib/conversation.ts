// lib/conversation.ts

import { withRetry } from '../agent/retryPolicy';

export async function findOrCreateConversation(
  supabase: any,
  userId: string,
  cpId: string,
  messageEmbedding: number[]
): Promise<string> {
  const { data: similarConversations } = await withRetry(
    () => supabase.rpc('match_conversations', {
      query_embedding: JSON.stringify(messageEmbedding),
      match_threshold: 0.78,
      match_count: 5,
      target_user_id: userId
    }),
    'db.rpc.match_conversations'
  );

  if (similarConversations && similarConversations.length > 0) {
    for (const conv of similarConversations) {
      const { data: participant } = await supabase
        .from('thread_participants')
        .select('cp_id')
        .eq('thread_id', conv.id)
        .eq('cp_id', cpId)
        .maybeSingle();

      if (participant) {
        return conv.id as string;
      }
    }
  }

  console.log('Embedding first 5 numbers:', messageEmbedding.slice(0, 5));

  const now = new Date().toISOString();
  
  // Try to insert new conversation
  const { data: newConversation, error: createErr } = await withRetry(
    () => supabase
      .from('conversation_threads')
      .insert({
        user_id: userId,
        topic: 'New Conversation',
        state: 'active',
        created_at: now,
        last_updated: now,
        embedding: messageEmbedding,
      })
      .select('id')
      .single(),
    'db.insert.conversation_threads'
  );

  // Handle insert conflict (race condition)
  if (createErr && createErr.code === '23505') {
    // Re-query for existing conversation
    const { data: existingConversations } = await supabase.rpc('match_conversations', {
      query_embedding: JSON.stringify(messageEmbedding),
      match_threshold: 0.78,
      match_count: 5,
      target_user_id: userId
    });

    if (existingConversations && existingConversations.length > 0) {
      for (const conv of existingConversations) {
        const { data: participant } = await supabase
          .from('thread_participants')
          .select('cp_id')
          .eq('thread_id', conv.id)
          .eq('cp_id', cpId)
          .maybeSingle();

        if (participant) {
          return conv.id as string;
        }
      }

      // No matching participant, use first similar conversation
      const conversationId = existingConversations[0].id as string;

      // Add participant with upsert
      await withRetry(
        () => supabase.from('thread_participants').upsert(
          { thread_id: conversationId, cp_id: cpId, added_at: now },
          { onConflict: 'thread_id,cp_id' }
        ),
        'db.upsert.thread_participants'
      );

      return conversationId;
    }

    // No existing conversation found after conflict — should not happen
    throw new Error('Insert conflict but no existing conversation found');
  }

  if (createErr) throw createErr;

  // Add participant with upsert to handle race
  await withRetry(
    () => supabase.from('thread_participants').upsert(
      { thread_id: newConversation.id, cp_id: cpId, added_at: now },
      { onConflict: 'thread_id,cp_id' }
    ),
    'db.upsert.thread_participants'
  );

  return newConversation.id as string;
}

export async function attachMessageToConversation(
  supabase: any,
  messageId: string,
  conversationId: string
): Promise<void> {
  const { error } = await withRetry(
    () => supabase
      .from('messages')
      .update({ conversation_id: conversationId })
      .eq('id', messageId),
    'db.update.messages'
  );

  if (error) throw error;
}
