// lib/email/renderEmail.ts

import { ProposedAction } from '../actions/proposeActions';
import { BaseTemplateSlots, renderTextEmail, renderHtmlEmail } from './templates/base';
import { ActionTemplate } from './templates/byAction';

export interface RenderedEmail {
  subject: string;
  text_body: string;
  html_body: string;
}

function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`Invalid email format: ${email}`);
  }
}

export function renderEmail(
  action: ProposedAction,
  templates: Record<string, ActionTemplate>,
  recipientEmail: string,
  unsubscribeLink: string
): RenderedEmail {
  validateEmail(recipientEmail);

  const template = templates[action.action_type];
  if (!template) {
    throw new Error(`No template found for action_type: ${action.action_type}`);
  }

  const subject = template.subject(action.context_payload);
  const actionSection = template.actionSection(action.context_payload);
  const actionCtas = template.actionCtas ? template.actionCtas(action.context_payload) : undefined;

  const appUrl = process.env.APP_URL || '';

  const slots: BaseTemplateSlots = {
    subject,
    intro: '',
    actionSections: [actionSection],
    footer: '',
    unsubscribeLink,
    actionCtas,
    globalCtas: appUrl
      ? [
          { label: 'Email', url: `${appUrl}` },
          { label: 'Účet', url: `${appUrl}/settings` }
        ]
      : [],
    pixelUrl:
      appUrl && (action as any)?.action_id
        ? `${appUrl}/api/pixel/ingest?action_id=${encodeURIComponent((action as any).action_id)}`
        : undefined
  };

  const text_body = renderTextEmail(slots);
  const html_body = renderHtmlEmail(slots);

  return {
    subject,
    text_body,
    html_body
  };
}
