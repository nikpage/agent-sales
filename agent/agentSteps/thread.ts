// agent/agentSteps/thread.ts 

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEmbedding, updateConversationEmbedding } from '../../lib/embeddings';
import { AgentContext } from '../agentContext';
import { retry } from '../retryPolicy';
import { getCpPoints } from '../../lib/cpPoints';

type ConversationSummary = {
  context: string;
  current_state: string;
  next_steps: string[];
  risks: string[];
  last_touch: string;
};

async function updateThreadSummary(
  supabase: any,
  threadId: string,
  userId: string,
  apiKey: string
): Promise<void> {
  try {
    // Fetch last 10-15 messages for this thread
    const { data: messages } = await supabase
      .from('messages')
      .select('cleaned_text, from, timestamp')
      .eq('thread_id', threadId)
      .order('timestamp', { ascending: false })
      .limit(15);

    if (!messages || messages.length === 0) {
      return;
    }

    // Fetch thread participants
    const { data: participants } = await supabase
      .from('thread_participants')
      .select('cp_id')
      .eq('thread_id', threadId);

    // Fetch CP POINTs for all participants
    let personalContext = '';
    if (participants && participants.length > 0) {
      const allPoints = [];
      for (const participant of participants) {
        const points = await getCpPoints(supabase, participant.cp_id);
        if (points.length > 0) {
          const { data: cp } = await supabase
            .from('cps')
            .select('name')
            .eq('id', participant.cp_id)
            .single();

          const cpName = cp?.name || 'Unknown';
          const pointsList = points.map(p => `${p.type}: ${p.value}`).join(', ');
          allPoints.push(`${cpName} - ${pointsList}`);
        }
      }

      if (allPoints.length > 0) {
        personalContext = '\n\nKnown personal context:\n' + allPoints.join('\n');
      }
    }

    // Build context from messages
    const messageContext = messages
      .reverse()
      .map((m: any) => `From: ${m.from}\n${m.cleaned_text}`)
      .join('\n\n');

    // Generate summary with Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are summarizing a conversation thread. Output ONLY valid JSON matching this exact schema, nothing else:

{
  "context": "Brief background (max 30 words)",
  "current_state": "Current situation (max 30 words)",
  "next_steps": ["action 1", "action 2"],
  "risks": ["risk 1"],
  "last_touch": "Most recent interaction summary (max 20 words)"
}

Total output must be under 120 words.${personalContext}

Here are the messages:

${messageContext}

Output JSON only:`;

    const result = await retry(() => model.generateContent(prompt));
    const responseText = result.response.text().trim();

    // Parse JSON
    let summaryJson: ConversationSummary;
    try {
      summaryJson = JSON.parse(responseText);
    } catch {
      // Try to extract JSON if wrapped in code blocks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON from LLM response');
      }
      summaryJson = JSON.parse(jsonMatch[0]);
    }

    // Store as stringified JSON
    await supabase
      .from('conversation_threads')
      .update({ summary_text: JSON.stringify(summaryJson) })
      .eq('id', threadId);

  } catch (error) {
    // Log error to agent_errors
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    await supabase
      .from('agent_errors')
      .insert({
        user_id: userId,
        agent_type: 'thread_summary',
        message_user: 'Failed to generate conversation summary',
        message_internal: `ThreadId: ${threadId}\nError: ${errorMsg}\nStack: ${errorStack}`
      });

    // Continue without throwing
  }
}

export async function threadEmail(
  ctx: AgentContext,
  cpId: string,
  messageText: string,
  messageId: string,
  classification: any,
  emailData: any
): Promise<string | null> {
  // Get stored embedding for this message - FAIL HARD if missing
  const embedding = await getEmbedding(ctx.supabase, messageId);
  if (!embedding) {
    const errorMsg = 'Embedding missing for message';
    await ctx.supabase.from('agent_errors').insert({
      user_id: ctx.clientId,
      agent_type: 'thread_matching',
      message_user: 'Cannot match thread without embedding',
      message_internal: `MessageId: ${messageId}\nError: ${errorMsg}`
    });
    throw new Error(`Embedding not found for message ${messageId}`);
  }

  // Vector similarity search against conversation_threads
  const { data: similarThreads } = await ctx.supabase.rpc('match_conversations', {
    query_embedding: embedding,
    match_threshold: 0.75,
    match_count: 5,
    target_user_id: ctx.clientId
  });

  let bestThreadId = null;
  if (similarThreads && similarThreads.length > 0) {
    // Filter for active threads only
    const activeThread = similarThreads.find((t: any) => t.state === 'active');
    if (activeThread) {
      bestThreadId = activeThread.id;
    }
  }

  if (bestThreadId) {
    // Add participant
    await ctx.supabase.from('thread_participants').upsert(
      { thread_id: bestThreadId, cp_id: cpId, added_at: new Date().toISOString() },
      { onConflict: 'thread_id, cp_id' }
    );
    // Update thread timestamp
    await ctx.supabase.from('conversation_threads')
      .update({ last_updated: new Date().toISOString() })
      .eq('id', bestThreadId);

    // CRITICAL: Only call updateConversationEmbedding for newly persisted messages
    // Caller ensures this function is only invoked after message insert succeeds
    // and never on retries of already-processed messages
    await updateConversationEmbedding(ctx.supabase, bestThreadId, embedding);

    // Re-summarize if HIGH or CRITICAL
    if (classification.importance === 'HIGH' || classification.importance === 'CRITICAL') {
      await updateThreadSummary(ctx.supabase, bestThreadId, ctx.clientId, ctx.apiKey);
    }

    return bestThreadId;
  } else {
    // Create new thread
    const { data: cp } = await ctx.supabase.from('cps').select('name').eq('id', cpId).single();
    const topic = cp ? `Conversation with ${cp.name}` : `New Thread`;

    const { data: newThread, error } = await ctx.supabase
      .from('conversation_threads')
      .insert({
        user_id: ctx.clientId,
        topic: topic,
        state: 'active',
        summary_text: messageText.substring(0, 100) + '...',
        priority_score: 5,
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        embedding: embedding,
        message_count: 1
      })
      .select('id')
      .single();

    if (error) {
      return null;
    }

    await ctx.supabase.from('thread_participants').insert({
      thread_id: newThread.id,
      cp_id: cpId,
      added_at: new Date().toISOString()
    });

    // Generate initial summary for new thread
    await updateThreadSummary(ctx.supabase, newThread.id, ctx.clientId, ctx.apiKey);

    return newThread.id;
  }
}
