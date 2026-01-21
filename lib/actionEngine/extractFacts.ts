// lib/actionEngine/extractFacts.ts 

type Direction = 'INBOUND' | 'OUTBOUND';

function toMs(ts?: string | Date | null): number | null {
  if (!ts) return null;
  const n = new Date(ts as any).getTime();
  return Number.isFinite(n) ? n : null;
}

function daysBetween(nowMs: number, thenMs: number | null): number {
  if (thenMs == null) return 0;
  const d = Math.floor((nowMs - thenMs) / (24 * 60 * 60 * 1000));
  return d < 0 ? 0 : d;
}

export function computeFollowUpClocks(
  messages: Array<{ occurred_at: string; direction: Direction }>,
  lastInteractionAt?: string | null // optional: CRM notes/activity timestamp
) {
  const nowMs = Date.now();
  const lastInteractionMs = toMs(lastInteractionAt);

  const inbound = messages
    .filter(m => m.direction === 'INBOUND')
    .map(m => toMs(m.occurred_at))
    .filter((x): x is number => x != null)
    .sort((a, b) => b - a)[0] ?? null;

  const outbound = messages
    .filter(m => m.direction === 'OUTBOUND')
    .map(m => toMs(m.occurred_at))
    .filter((x): x is number => x != null)
    .sort((a, b) => b - a)[0] ?? null;

  // If you spoke on phone/CRM note, that can satisfy "agent responded"
  const effectiveInboundMs = inbound;
  const effectiveOutboundMs = Math.max(outbound ?? 0, lastInteractionMs ?? 0) || null;

  // Who currently "owes" the next action?
  // If last inbound is newer than last outbound/interaction => agent owes.
  const agentOwes =
    effectiveInboundMs != null &&
    (effectiveOutboundMs == null || effectiveInboundMs > effectiveOutboundMs);

  const days_waiting_on_agent = agentOwes ? daysBetween(nowMs, effectiveInboundMs) : 0;

  // If agent sent last (or there’s no inbound yet), customer owes; but you may want follow-up.
  const awaiting_reply =
    !agentOwes && (effectiveOutboundMs != null || effectiveInboundMs == null);

  const days_waiting_on_customer = awaiting_reply
    ? daysBetween(nowMs, effectiveOutboundMs ?? effectiveInboundMs)
    : 0;

  return {
    agent_owes: agentOwes,
    awaiting_reply,
    last_inbound_at: effectiveInboundMs ? new Date(effectiveInboundMs).toISOString() : null,
    last_outbound_or_interaction_at: effectiveOutboundMs
      ? new Date(effectiveOutboundMs).toISOString()
      : null,
    days_waiting_on_agent,
    days_waiting_on_customer,
  };
}
