// agent/agentSteps/thread.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEmbedding, updateConversationEmbedding } from '../../lib/embeddings';
import { AgentContext } from '../agentContext';
import { retry } from '../retryPolicy';
import { getCpPoints } from '../../lib/cpPoints';
import { safeStringify } from '../../lib/utils';

type ConversationSummary = {
  context: string;
  current_state: string;
  next_steps: string[];
  risks: string[];
  last_touch: {
    participant: string;
    timestamp: string;
  };
};

function isValidSummary(summary: any): boolean {
  return (
    typeof summary === 'object' &&
    typeof summary.context === 'string' &&
    typeof summary.current_state === 'string' &&
    Array.isArray(summary.next_steps) &&
    Array.isArray(summary.risks) &&
    typeof summary.last_touch === 'object' &&
    typeof summary.last_touch?.participant === 'string' &&
    typeof summary.last_touch?.timestamp === 'string'
  );
}

async function updateThreadSummary(
  supabase: any,
  threadId: string,
  userId: string,
  apiKey: string
): Promise<void> {
  try {
    // Fetch thread info including previous summary and message count
    const { data: thread } = await supabase
      .from('conversation_threads')
      .select('summary_json, messages_since_rebuild')
      .eq('id', threadId)
      .single();

    const previousSummary = thread?.summary_json || null;
    const messagesSinceRebuild = thread?.messages_since_rebuild || 0;

    // Get boundary timestamp from last summary
    const boundaryTimestamp = previousSummary?.last_touch?.timestamp || null;

    // Fetch messages for this thread
    const { data: messages } = await supabase
      .from('messages')
      .select('cleaned_text, timestamp, occurred_at, cp_id')
      .eq('conversation_id', threadId)
      .order('occurred_at', { ascending: false });

    if (!messages || messages.length === 0) {
      return;
    }

    // Count new messages since last summary
    let newMessagesCount = 0;
    if (boundaryTimestamp) {
      const boundary = new Date(boundaryTimestamp).getTime();
      newMessagesCount = messages.filter((m: any) => {
        const msgTime = new Date(m.occurred_at || m.timestamp).getTime();
        return msgTime > boundary;
      }).length;
    } else {
      // No previous summary, count all messages as new
      newMessagesCount = messages.length;
    }

    // Exit early if no new messages
    if (newMessagesCount === 0) {
      return;
    }

    // Decide: full rebuild every 10 messages, otherwise incremental
    const totalCount = messagesSinceRebuild + newMessagesCount;
    const isFullRebuild = totalCount >= 10 || !previousSummary;

    // For incremental: use last 5 messages. For full rebuild: use last 15
    const messageLimit = isFullRebuild ? 15 : 5;
    const recentMessages = messages.slice(0, messageLimit);

    // Get last touch info
    const lastMessage = messages[0];
    const { data: lastCp } = await supabase
      .from('cps')
      .select('name')
      .eq('id', lastMessage.cp_id)
      .single();

    const lastTouch = {
      participant: lastCp?.name || 'Unknown',
      timestamp: lastMessage.occurred_at || lastMessage.timestamp
    };

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
    const messageContext = recentMessages
      .reverse()
      .map((m: any) => m.cleaned_text)
      .join('\n\n');

    // Generate summary with Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt: string;

    if (isFullRebuild || !previousSummary) {
      // Full rebuild: regenerate everything
      prompt = `You are summarizing a conversation thread. Output ONLY valid JSON matching this exact schema:

{
  "context": "Brief background of how conversation started and evolved (max 40 words)",
  "current_state": "Weighted summary of most recent 3-5 exchanges (max 40 words)",
  "next_steps": ["Specific action 1 with deadline if known", "action 2"],
  "risks": ["Blocker or deal-breaker 1", "risk 2"],
  "last_touch": {
    "participant": "${lastTouch.participant}",
    "timestamp": "${lastTouch.timestamp}"
  }
}

Format for Markdown readability. Keep total under 150 words.${personalContext}

Recent messages:

${messageContext}

Output JSON only:`;
    } else {
      // Incremental update: keep context stable, update current_state and next_steps
      const prevContext = previousSummary.context || '';

      prompt = `You are updating an existing conversation summary. Keep the CONTEXT stable and only update current state and next steps.

Previous summary:
${JSON.stringify(previousSummary, null, 2)}

Output ONLY valid JSON matching this schema:

{
  "context": "${prevContext}",
  "current_state": "Updated summary based on new messages (max 40 words)",
  "next_steps": ["Updated action 1", "action 2"],
  "risks": ["Updated or new risks"],
  "last_touch": {
    "participant": "${lastTouch.participant}",
    "timestamp": "${lastTouch.timestamp}"
  }
}

Keep context UNCHANGED. Update current_state, next_steps, and risks based on these new messages:${personalContext}

${messageContext}

Output JSON only:`;
    }

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

    // Validate summary structure
    if (!isValidSummary(summaryJson)) {
      await supabase
        .from('agent_errors')
        .insert({
          user_id: userId,
          agent_type: 'thread_summary',
          message_user: 'Invalid summary JSON structure',
          message_internal: `ThreadId: ${threadId}\nInvalid summary: ${safeStringify(summaryJson)}`
        });
      return; // Skip DB update
    }

    // Update summary and message counter
    const updatedMessagesSinceRebuild = isFullRebuild ? 0 : (messagesSinceRebuild + newMessagesCount);

    await supabase
      .from('conversation_threads')
      .update({
        summary_json: summaryJson,
        messages_since_rebuild: updatedMessagesSinceRebuild
      })
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

  // Validate embedding before updating conversation
  const isValidEmbedding =
    embedding &&
    Array.isArray(embedding) &&
    embedding.length === 768 &&
    embedding.every(v => typeof v === 'number' && Number.isFinite(v));

  if (!isValidEmbedding) {
    await ctx.supabase.from('agent_errors').insert({
      user_id: ctx.clientId,
      agent_type: 'thread_embedding',
      message_user: 'Invalid message embedding shape/type',
      message_internal: `MessageId: ${messageId}, Type: ${typeof embedding}, Length: ${Array.isArray(embedding) ? embedding.length : 'N/A'}`
    });
  } else {
    await updateConversationEmbedding(ctx.supabase, conversationId, embedding);
  }

  await updateThreadSummary(ctx.supabase, conversationId, ctx.clientId, ctx.apiKey);

  return conversationId;
}
