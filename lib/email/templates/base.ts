// lib/email/templates/base.ts

export interface BaseTemplateSlots {
  subject: string;
  intro: string;
  actionSections: string[];
  footer: string;
  unsubscribeLink: string;
  globalCtas: Array<{ label: string; url: string }>;
  pixelUrl?: string;
}

/**
 * Universal command footer with verbatim commands: DO IT, EDIT: <notes>, I'LL DO IT, BLACKLIST CP
 */
function getCommandFooter(): string {
  return `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMANDS (reply with one of these on the first line):

• DO IT          → I'll create a draft in your Gmail
• EDIT: <notes>  → I'll update the draft with your notes
• I'LL DO IT     → You'll handle this yourself
• BLACKLIST CP   → Block this contact forever

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

/**
 * Render plain text email
 */
export function renderTextEmail(slots: BaseTemplateSlots): string {
  const parts = [
    slots.intro,
    '',
    ...slots.actionSections,
    '',
    slots.footer,
    getCommandFooter(),
  ];

  if (slots.unsubscribeLink) {
    parts.push(``, `Unsubscribe: ${slots.unsubscribeLink}`);
  }

  if (slots.pixelUrl) {
    parts.push(``, `Tracking: ${slots.pixelUrl}`);
  }

  return parts.join('\n');
}

/**
 * Render HTML email
 */
export function renderHtmlEmail(slots: BaseTemplateSlots): string {
  const actionSectionsHtml = slots.actionSections
    .map(section => `<div style="margin: 20px 0;">${section.replace(/\n/g, '<br>')}</div>`)
    .join('');

  const ctasHtml = slots.globalCtas.length
    ? `<div style="margin: 20px 0;">
        ${slots.globalCtas.map(cta =>
          `<a href="${cta.url}" style="margin-right: 15px; color: #0066cc;">${cta.label}</a>`
        ).join('')}
      </div>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .content { max-width: 600px; margin: 0 auto; padding: 20px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; font-size: 13px; color: #666; }
    .commands { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .command { margin: 8px 0; font-family: monospace; }
    .tracking { font-size: 11px; color: #999; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="content">
    <p>${slots.intro}</p>
    ${actionSectionsHtml}
    ${ctasHtml}
    <div class="footer">
      <p>${slots.footer.replace(/\n/g, '<br>')}</p>
      <div class="commands">
        <strong>COMMANDS</strong> (reply with one on the first line):<br><br>
        <div class="command">• <strong>DO IT</strong> → I'll create a draft in your Gmail</div>
        <div class="command">• <strong>EDIT: &lt;notes&gt;</strong> → I'll update the draft with your notes</div>
        <div class="command">• <strong>I'LL DO IT</strong> → You'll handle this yourself</div>
        <div class="command">• <strong>BLACKLIST CP</strong> → Block this contact forever</div>
      </div>
      ${slots.unsubscribeLink ? `<p style="margin-top: 20px;"><a href="${slots.unsubscribeLink}">Unsubscribe</a></p>` : ''}
      ${slots.pixelUrl ? `<div class="tracking">Tracking: ${slots.pixelUrl}</div>` : ''}
    </div>
  </div>
  ${slots.pixelUrl ? `<img src="${slots.pixelUrl}" width="1" height="1" style="display:none;" />` : ''}
</body>
</html>
`;
}
