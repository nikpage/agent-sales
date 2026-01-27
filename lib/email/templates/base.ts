// lib/email/templates/base.ts

export type BaseTemplateSlots = {
  subject: string;
  intro: string;
  actionSections: string[];
  footer: string;
  unsubscribeLink?: string;
  pixelUrl?: string;
  globalCtas?: Array<{ label: string; url: string }>;
  actionCtas?: Array<{ label: string; url: string }>;
};

function escapeHtml(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function convertTextToHtml(text: string): string {
  const blocks = text.split(/\n\n+/);
  return blocks
    .map(block => {
      const content = escapeHtml(block.trim()).replace(/\n/g, '<br/>');
      return content ? `<p style="margin:0 0 12px 0;">${content}</p>` : '';
    })
    .filter(Boolean)
    .join('');
}

export function renderTextEmail(slots: BaseTemplateSlots): string {
  const lines: string[] = [];

  if (slots.intro) lines.push(slots.intro, '');
  for (const section of slots.actionSections || []) {
    if (section?.trim()) lines.push(section.trim(), '');
  }

  if (slots.globalCtas?.length) {
    lines.push('Odkazy:');
    for (const cta of slots.globalCtas) {
      lines.push(`- ${cta.label}: ${cta.url}`);
    }
    lines.push('');
  }

  if (slots.unsubscribeLink) {
    lines.push(`Odhlášení: ${slots.unsubscribeLink}`, '');
  }

  if (slots.footer) lines.push(slots.footer);

  return lines.join('\n').trim() + '\n';
}

export function renderHtmlEmail(slots: BaseTemplateSlots): string {
  const bg = '#F7F5F0';
  const navy = '#23476B';
  const brass = '#A89273';
  const white = '#FFFFFF';

  const actionHtml = (slots.actionSections || [])
    .filter(Boolean)
    .map((s) => convertTextToHtml(s))
    .join('');

  const actionCtasHtml = (slots.actionCtas || [])
    .map(
      (cta) => `
      <a href="${escapeHtml(cta.url)}"
         style="display:inline-block; background:${brass}; color:${white}; padding:12px 24px; border-radius:6px; text-decoration:none; font-family:Arial, sans-serif; font-size:14px; font-weight:600; margin:8px 8px 8px 0; transition:all 0.2s ease;">
        ${escapeHtml(cta.label)}
      </a>
    `
    )
    .join('');

  const globalCtasHtml = (slots.globalCtas || [])
    .map(
      (cta) => `
      <a href="${escapeHtml(cta.url)}"
         style="display:inline-block; background:${navy}; color:${white}; padding:6px 12px; border-radius:3px; text-decoration:none; font-family:Arial, sans-serif; font-size:12px; font-weight:600; margin:0 8px 0 0; transition:all 0.2s ease;">
        ${escapeHtml(cta.label)}
      </a>
    `
    )
    .join('');

  const pixel = slots.pixelUrl
    ? `<img src="${escapeHtml(slots.pixelUrl)}" width="1" height="1" style="display:block; border:0; width:1px; height:1px;" alt="" />`
    : '';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>${escapeHtml(slots.subject || '')}</title>
  </head>
  <body style="margin:0; padding:0; background:${bg}; color:${navy};">
    <div style="padding:24px 12px;">
      <div style="max-width:640px; margin:0 auto; background:${white}; border-radius:12px; box-shadow:0 6px 20px rgba(27,38,59,0.08); overflow:hidden;">
        <div style="padding:20px 22px; border-bottom:1px solid rgba(27,38,59,0.08); background:${bg};">
          <div style="font-family: Georgia, 'Times New Roman', serif; color:${navy}; display:inline-block; text-align:left;">
            <div style="font-size:28px; font-weight:700; letter-spacing:-0.5px; line-height:1; display:flex; align-items:center; gap:6px;">
              Mila
              <span style="display:inline-block; width:10px; height:10px; background:${brass}; border-radius:2px; transform:rotate(45deg);"></span>
            </div>
            <div style="font-family: Arial, sans-serif; font-size:10px; text-transform:uppercase; letter-spacing:2px; color:${brass}; margin-top:2px;">
              Executive Assistant
            </div>
          </div>
        </div>

        <div style="padding:22px; font-family:Arial, sans-serif; font-size:15px; line-height:1.5;">
          ${slots.intro ? convertTextToHtml(slots.intro) : ''}

          ${actionHtml}

          ${actionCtasHtml ? `<div style="margin-top:24px; display:flex; gap:12px; flex-wrap:wrap;">${actionCtasHtml}</div>` : ''}

          <div style="margin-top:32px; padding-top:20px; border-top:1px solid rgba(35,71,107,0.12); color:rgba(35,71,107,0.75); font-size:13px; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
            ${slots.footer ? `<div>${convertTextToHtml(slots.footer)}</div>` : '<div>S pozdravem,<br/>Mila</div>'}
            ${
              globalCtasHtml
                ? `<div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
                     <div style="display:flex; gap:8px;">
                       ${globalCtasHtml}
                     </div>
                     ${
                       slots.unsubscribeLink
                         ? `<a href="${escapeHtml(slots.unsubscribeLink)}" style="color:${brass}; text-decoration:underline; font-size:11px;">
                              Odhlásit odběr
                            </a>`
                         : ''
                     }
                   </div>`
                : slots.unsubscribeLink
                ? `<div style="font-size:11px; color:rgba(27,38,59,0.55);">
                     <a href="${escapeHtml(slots.unsubscribeLink)}" style="color:${brass}; text-decoration:underline;">
                       Odhlásit odběr
                     </a>
                   </div>`
                : ''
            }
          </div>
        </div>
      </div>
      ${pixel}
    </div>
  </body>
</html>`;
}
