// lib/email/templates/byAction.ts

interface ActionContext {
  action_type: string;
  rationale: string;
  payload: {
    history_summary?: string[];
    current_issue?: string;
    contact_name?: string;
    [key: string]: unknown;
  };
}

interface EmailContent {
  historySummary: string;
  currentIssue: string;
  intent: string;
  subject: string;
  body: string;
}

/**
 * Generate email content based on action type
 * Returns 5 distinct blocks: History Summary (3-7 bullets), Current Issue, Intent, Subject, Body
 */
export function generateEmailContent(context: ActionContext): EmailContent {
  const { action_type, rationale, payload } = context;
  const contactName = payload.contact_name || 'Contact';

  // Block 1: History Summary (3-7 bullets)
  const historySummary = payload.history_summary
    ? payload.history_summary.slice(0, 7).map((item, idx) => `${idx + 1}. ${item}`).join('\n')
    : 'No previous conversation history available.';

  // Block 2: Current Issue
  const currentIssue = payload.current_issue || 'The contact has sent a message that requires attention.';

  // Block 3: Intent (why we're suggesting this action)
  const intent = rationale;

  // Block 4: Subject
  let subject: string;

  // Block 5: Body
  let body: string;

  switch (action_type) {
    case 'REPLY_NEEDED':
      subject = `Re: Conversation with ${contactName}`;
      body = `Hi,

I noticed ${contactName} sent a message that needs your response.

${currentIssue}

Here's what I suggest:

[Draft response will go here based on context]

Best regards`;
      break;

    case 'FOLLOW_UP':
      subject = `Follow up: ${contactName}`;
      body = `Hi,

It looks like we should follow up with ${contactName}.

Context:
${currentIssue}

Suggested follow-up:
[Draft follow-up message will go here]

Best regards`;
      break;

    case 'MEETING_NEEDED':
      subject = `Schedule meeting: ${contactName}`;
      body = `Hi,

Based on the conversation, it seems a meeting with ${contactName} would be helpful.

Reason:
${currentIssue}

Suggested message:
[Draft meeting invitation will go here]

Best regards`;
      break;

    default:
      subject = `Action needed: ${contactName}`;
      body = `Hi,

There's an action needed regarding ${contactName}.

Details:
${currentIssue}

${rationale}

Best regards`;
  }

  return {
    historySummary,
    currentIssue,
    intent,
    subject,
    body,
  };
}

/**
 * Compose full email from content blocks
 */
export function composeFullEmail(content: EmailContent): { subject: string; body: string } {
  const fullBody = `${content.body}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONVERSATION HISTORY:
${content.historySummary}

CURRENT SITUATION:
${content.currentIssue}

WHY THIS MATTERS:
${content.intent}`;

  return {
    subject: content.subject,
    body: fullBody,
  };
}

export interface ActionTemplate {
  subject: (payload: any) => string;
  actionSection: (payload: any) => string;
}

export const actionTemplates: Record<string, ActionTemplate> = {
  follow_up: {
    subject: (payload) => {
      const recipient = payload.body_inputs?.recipient_name || 'Contact';
      const topic = payload.subject_inputs?.topic || '';
      return topic ? `Re: ${topic}` : `Follow up: ${recipient}`;
    },
    actionSection: (payload) => {
      const recipient = payload.body_inputs?.recipient_name || 'Contact';
      const topic = payload.body_inputs?.topic || payload.subject_inputs?.topic || '';

      return `Ahoj,

Je potřeba odpovědět na email od ${recipient}.

Téma: ${topic}

Co navrhujete odpovědět?`;
    }
  },

  reply_needed: {
    subject: (payload) => {
      const topic = payload.subject_inputs?.topic || '';
      return topic ? `Re: ${topic}` : 'Odpověď potřebná';
    },
    actionSection: (payload) => {
      const recipient = payload.body_inputs?.recipient_name || 'Contact';
      const topic = payload.body_inputs?.topic || payload.subject_inputs?.topic || '';

      return `Ahoj,

Přišla zpráva od ${recipient}, která vyžaduje odpověď.

Téma: ${topic}

Jak chcete reagovat?`;
    }
  },

  meeting_needed: {
    subject: (payload) => {
      const recipient = payload.body_inputs?.recipient_name || 'Contact';
      return `Schůzka: ${recipient}`;
    },
    actionSection: (payload) => {
      const recipient = payload.body_inputs?.recipient_name || 'Contact';
      const topic = payload.body_inputs?.topic || payload.subject_inputs?.topic || '';

      return `Ahoj,

Na základě konverzace s ${recipient} by bylo dobré domluvit schůzku.

Téma: ${topic}

Chcete naplánovat schůzku?`;
    }
  }
};
