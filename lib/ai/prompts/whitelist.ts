// lib/ai/prompts/whitelist.ts

export function whitelistPrompt(from: string, subject: string, bodySnippet: string): string {
  return `You are filtering emails for a sales assistant. Determine if this email should be processed.

ALLOW if:
- Business opportunity (potential client, inquiry, meeting request)
- Important personal that impacts work schedule (doctor, family events, etc.)

REJECT if:
- Newsletter
- Marketing/promotional
- Automated notifications
- Spam
- From addresses containing: noreply, no-reply, no_reply, mailer-daemon, donotreply, neodpovídat
- Account/security notifications (password reset, passkey removed, login alerts)
- Unsubscribe links present
- Automated messages (receipts, confirmations, alerts)

When uncertain, ALLOW (false positive is better than missing business).

Email:
From: ${from}
Subject: ${subject}
Body: ${bodySnippet}

Reply ONLY with: ALLOW or REJECT`;
