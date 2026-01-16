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
    // Fetch messages for this thread
    const { data: messages } = await supabase
      .from('messages')
      .select('cleaned_text, timestamp, occurred_at')
      .eq('conversation_id', threadId);

    if (!messages || messages.length === 0) {
      return;
    }

    // Sort by occurred_at (fallback to timestamp), descending, then take last 15
    const sortedMessages = messages
      .sort((a: any, b: any) => {
        const timeA = new Date(a.occurred_at ?? a.timestamp).getTime();
        const timeB = new Date(b.occurred_at ?? b.timestamp).getTime();
        return timeB - timeA;
      })
      .slice(0, 15);

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
    const messageContext = sortedMessages
      .reverse()
      .map((m: any) => m.cleaned_text)
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
  emailData: any,
  conversationId: string
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

  // Add participant
  await ctx.supabase.from('thread_participants').upsert(
    { thread_id: conversationId, cp_id: cpId, added_at: new Date().toISOString() },
    { onConflict: 'thread_id, cp_id' }
  );

  // Update thread timestamp
  await ctx.supabase.from('conversation_threads')
    .update({ last_updated: new Date().toISOString() })
    .eq('id', conversationId);

console.log('About to update embedding:', embedding.slice(0, 5));
  // await updateConversationEmbedding(ctx.supabase, conversationId, embedding);

  await updateThreadSummary(ctx.supabase, conversationId, ctx.clientId, ctx.apiKey);

  return conversationId;
}
