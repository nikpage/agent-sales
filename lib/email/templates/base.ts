// lib/email/templates/base.ts

interface EmailTemplate {
  subject: string;
  textBody: string;
  htmlBody: string;
}

/**
 * Universal command footer with verbatim commands: DO IT, EDIT: <notes>, I'LL DO IT, BLACKLIST CP
 */
function getCommandFooter(actionId: string): string {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  return `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMMANDS (reply with one of these on the first line):

• DO IT          → I'll create a draft in your Gmail
• EDIT: <notes>  → I'll update the draft with your notes
• I'LL DO IT     → You'll handle this yourself
• BLACKLIST CP   → Block this contact forever

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tracking: pixelUrl=${appUrl}/pixel?action_id=${actionId}
`;
}

/**
 * Wrap content with standard email structure
 */
export function wrapEmailTemplate(
  content: string,
  actionId: string,
  includeCommands: boolean = true
): EmailTemplate {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const textBody = includeCommands ? `${content}${getCommandFooter(actionId)}` : content;

  const htmlBody = `
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
    ${content.replace(/\n/g, '<br>')}
    ${
      includeCommands
        ? `
    <div class="footer">
      <div class="commands">
        <strong>COMMANDS</strong> (reply with one on the first line):<br><br>
        <div class="command">• <strong>DO IT</strong> → I'll create a draft in your Gmail</div>
        <div class="command">• <strong>EDIT: &lt;notes&gt;</strong> → I'll update the draft with your notes</div>
        <div class="command">• <strong>I'LL DO IT</strong> → You'll handle this yourself</div>
        <div class="command">• <strong>BLACKLIST CP</strong> → Block this contact forever</div>
      </div>
      <div class="tracking">
        Tracking: pixelUrl=${appUrl}/pixel?action_id=${actionId}
      </div>
    </div>
    `
        : ''
    }
  </div>
</body>
</html>
`;

  return {
    subject: 'Action Required',
    textBody,
    htmlBody,
  };
}
