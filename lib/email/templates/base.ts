// lib/email/templates/base.ts

export interface BaseTemplateSlots {
  subject: string;
  intro: string;
  actionSections: string[];
  footer: string;
  unsubscribeLink: string;
}

export function renderTextEmail(slots: BaseTemplateSlots): string {
  const sections = [
    `Subject: ${slots.subject}`,
    '',
    slots.intro,
    '',
    ...slots.actionSections,
    '',
    slots.footer,
    '',
    `Unsubscribe: ${slots.unsubscribeLink}`,
  ];

  return sections.join('\n');
}

export function renderHtmlEmail(slots: BaseTemplateSlots): string {
  const actionHtml = slots.actionSections
    .map((section) => `<div style="margin: 20px 0;">${section}</div>`)
    .join('\n');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${slots.subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="margin-bottom: 30px;">
    ${slots.intro}
  </div>

  ${actionHtml}

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
    ${slots.footer}
  </div>

  <div style="margin-top: 20px; font-size: 12px; color: #666;">
    <a href="${slots.unsubscribeLink}" style="color: #666;">Unsubscribe</a>
  </div>
</body>
</html>
`.trim();
}
