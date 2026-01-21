// api/send-gmail.ts
import { google } from 'googleapis';

export async function GET() {
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

  const gmail = google.gmail({ version: 'v1', auth });

  const raw = Buffer.from(
`To: ${process.env.TO_EMAIL}
Subject: App message

Your app is talking to you.
`).toString('base64').replace(/\+/g,'-').replace(/\//g,'_');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  return new Response('sent');
}
