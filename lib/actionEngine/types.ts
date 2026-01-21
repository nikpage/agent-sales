// lib/actionEngine/types.ts

export enum ActionType {
  TODO = 'TODO',
  REPLY_DRAFT = 'REPLY_DRAFT',
  CALENDAR_INTENT = 'CALENDAR_INTENT',
  NEGOTIATION = 'NEGOTIATION',
}

export interface TodoPayload {
  target_id: string; // message or thread ID
  description: string;
  urgency: 'TODAY' | 'TOMORROW' | 'SOON';
}

export interface ReplyDraftPayload {
  target_id: string; // thread ID
  draft_text: string;
  tone: 'formal' | 'friendly' | 'urgent' | 'neutral';
}

export interface CalendarIntentPayload {
  target_id: string; // event ID or proposed slot identifier
  intent: 'accept' | 'propose' | 'suggest';
  proposed_time?: string; // ISO string
  duration_minutes?: number;
}

export interface NegotiationPayload {
  target_id: string; // thread ID + deal reference
  suggestion: 'counter' | 'fallback' | 'hold';
  details: string;
}

export type ActionPayload =
  | TodoPayload
  | ReplyDraftPayload
  | CalendarIntentPayload
  | NegotiationPayload;

export interface Action {
  type: ActionType;
  payload: ActionPayload;
  rationale: string;
  confidence?: number;
  urgency: number;
  batchable: boolean;
  status: 'PENDING' | 'APPROVED' | 'SNOOZED' | 'DISMISSED';
  snoozed_until?: string | null;
  acted_at?: string | null;
}

export interface ThreadState {
  id: string;
  user_id: string;
  topic: string;
  state: string;
  summary_json?: {
    context?: string;
    current_state?: string;
    next_steps?: string[];
    risks?: string[];
  } | null;
  last_updated: string;
}

export interface MessageData {
  id: string;
  cleaned_text: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
  occurred_at: string | null;
  cp_id: string;
}

export interface CpState {
  id: string;
  name: string;
  email?: string;
  is_blacklisted: boolean;
}

export interface TodoItem {
  id: string;
  description: string;
  due_date?: string;
  status: string;
}

export interface EventItem {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  status: string;
}

export interface Context {
  thread: ThreadState;
  messages: MessageData[];
  cp: CpState | null;
  openTodos: TodoItem[];
  upcomingEvents: EventItem[];
}
