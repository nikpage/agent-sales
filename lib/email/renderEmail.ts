// lib/email/renderEmail.ts

import { renderTextEmail, renderHtmlEmail } from './templates/base';

export interface RenderedEmail {
  subject: string;
  text_body: string;
  html_body: string;
}

export function renderEmail(
  action: any,
  templates: Record<string, any>,
  unsubscribeLink: string
): RenderedEmail {
  const template = templates[action.action_type];
  if (!template) {
    throw new Error(`No template found for action_type: ${action.action_type}`);
  }

  const subject = template.subject(action.payload);
  const actionSection = template.actionSection(action.payload);

  const appUrl = process.env.APP_URL || '';

  const slots = {
    subject,
    intro: `Dobrý den,`,
    actionSections: [actionSection],
    footer: `S pozdravem,\nMila`,
    unsubscribeLink,
    globalCtas: appUrl
      ? [
          { label: 'Email', url: `${appUrl}` },
          { label: 'Účet', url: `${appUrl}/settings` }
        ]
      : [],
    pixelUrl:
      appUrl && action.id
        ? `${appUrl}/api/pixel/ingest?action_id=${encodeURIComponent(action.id)}`
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
