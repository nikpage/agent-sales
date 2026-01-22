// app/api/send-gmail/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, userId, to, subject, text_body, html_body, body: plainBody } = body;

    const finalUserId = user_id || userId;
    const finalText = text_body || plainBody || '';
    const finalHtml = html_body || (finalText ? `<p>${finalText}</p>` : '');

    if (!finalUserId || !to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id/userId, to, subject' },
        { status: 400 }
      );
    }

    // Use service role to fetch user tokens
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('google_oauth_tokens, email_enabled, email_unsubscribed')
      .eq('id', finalUserId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.email_unsubscribed || !user.email_enabled) {
      return NextResponse.json(
        { error: 'Email sending disabled for user' },
        { status: 403 }
      );
    }

    const tokens = typeof user.google_oauth_tokens === 'string'
      ? JSON.parse(user.google_oauth_tokens)
      : user.google_oauth_tokens;

    if (!tokens?.refresh_token) {
      return NextResponse.json(
        { error: 'No refresh token available' },
        { status: 401 }
      );
    }

    // Set up OAuth client with user's tokens
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Create raw message
    const rawMessage = createRawMessage(to, subject, finalText, finalHtml);

    // Send email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage
      }
    });

    return NextResponse.json({
      ok: true,
      message_id: result.data.id
    });

  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

function createRawMessage(
  to: string,
  subject: string,
  textBody: string,
  htmlBody: string
): string {
  const boundary = '----=_Part_0_' + Date.now();

  const message = [
    'From: me',
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    htmlBody,
    '',
    `--${boundary}--`
  ].join('\r\n');

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
