// lib/actionEngine/contextAssembler.ts

// Uses existing shared Supabase client (no new instances)
import { supabase } from '../supabase';
import { Context, ThreadState, MessageData, CpState, TodoItem, EventItem } from './types';

const MAX_MESSAGES = 10;
const MAX_TODOS = 10;
const MAX_EVENTS = 10;

export async function assembleContext(threadId: string): Promise<Context | null> {
  try {
    // Fetch thread state
    const { data: thread, error: threadErr } = await supabase
      .from('conversation_threads')
      .select('id, user_id, topic, state, summary_json, last_updated')
      .eq('id', threadId)
      .single();

    if (threadErr || !thread) {
      console.error('[actionEngine] Thread not found:', threadId);
      return null;
    }

    const threadState: ThreadState = {
      id: thread.id,
      user_id: thread.user_id,
      topic: thread.topic || '',
      state: thread.state || 'active',
      summary_json: thread.summary_json || null,
      last_updated: thread.last_updated || '',
    };

    // Fetch last N messages
    const { data: messagesRaw, error: msgErr } = await supabase
      .from('messages')
      .select('id, cleaned_text, direction, timestamp, occurred_at, cp_id')
      .eq('conversation_id', threadId)
      .order('occurred_at', { ascending: false })
      .limit(MAX_MESSAGES);

    if (msgErr) {
      console.error('[actionEngine] Failed to fetch messages:', msgErr);
      return null;
    }

    const messages: MessageData[] = (messagesRaw || []).map((m: any) => ({
      id: m.id,
      cleaned_text: m.cleaned_text || '',
      direction: m.direction || 'inbound',
      timestamp: m.timestamp || '',
      occurred_at: m.occurred_at || null,
      cp_id: m.cp_id || '',
    }));

    // Get primary CP from first message (if any)
    let cpState: CpState | null = null;
    if (messages.length > 0) {
      const primaryCpId = messages[0].cp_id;
      if (primaryCpId) {
        const { data: cp } = await supabase
          .from('cps')
          .select('id, name, primary_identifier, is_blacklisted')
          .eq('id', primaryCpId)
          .single();

        if (cp) {
          cpState = {
            id: cp.id,
            name: cp.name || '',
            email: cp.primary_identifier || undefined, // derived from primary_identifier
            is_blacklisted: cp.is_blacklisted || false,
          };
        }
      }
    }

    // Fetch open todos for this user
    const { data: todosRaw } = await supabase
      .from('todos')
      .select('id, description, due_date, status')
      .eq('user_id', thread.user_id)
      .in('status', ['pending', 'open'])
      .order('due_date', { ascending: true })
      .limit(MAX_TODOS);

    const openTodos: TodoItem[] = (todosRaw || []).map((t: any) => ({
      id: t.id,
      description: t.description || '',
      due_date: t.due_date || undefined,
      status: t.status || 'pending',
    }));

    // Fetch upcoming events for this user
    const now = new Date().toISOString();
    const { data: eventsRaw } = await supabase
      .from('events')
      .select('id, title, start_time, end_time, status')
      .eq('user_id', thread.user_id)
      .gte('start_time', now)
      .order('start_time', { ascending: true })
      .limit(MAX_EVENTS);

    const upcomingEvents: EventItem[] = (eventsRaw || []).map((e: any) => ({
      id: e.id,
      title: e.title || '',
      start_time: e.start_time || '',
      end_time: e.end_time || undefined,
      status: e.status || 'scheduled',
    }));

    return {
      thread: threadState,
      messages,
      cp: cpState,
      openTodos,
      upcomingEvents,
    };
  } catch (err) {
    console.error('[actionEngine] Context assembly failed:', err);
    return null;
  }
}
