// app/api/send-pending-emails/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendGmail } from '../../../lib/email/send-gmail';

function pickFirstString(obj: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === 'string' && v.trim().length) return v.trim();
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey || apiKey !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const user_id = typeof body?.user_id === 'string' ? body.user_id : null;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY' }, { status: 500 });
    }

    const supabaseAdmin: SupabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: pendingEmails, error: fetchError } = await supabaseAdmin
      .from('emails')
      .select('*') // do NOT select non-existent columns
      .eq('user_id', user_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch pending emails: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return NextResponse.json({ message: 'No pending emails', sent: 0, failed: 0, skipped: 0 });
    }

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    const results = await Promise.allSettled(
      pendingEmails.map(async (email: any) => {
        const to = pickFirstString(email, ['to', 'to_email', 'recipient_email', 'recipient', 'email_to']);
        const subject = pickFirstString(email, ['subject']);
        const text_body = pickFirstString(email, ['text_body', 'text', 'body', 'plain_body']) ?? '';
        const html_body =
          pickFirstString(email, ['html_body', 'html']) ?? (text_body ? `<p>${text_body}</p>` : '');

        if (!to || !subject) {
          skipped += 1;
          await supabaseAdmin
            .from('emails')
            .update({
              status: 'failed',
              last_error: `Missing required fields in emails row: ${!to ? 'to' : ''}${!to && !subject ? ',' : ''}${
                !subject ? 'subject' : ''
              }`.trim()
            })
            .eq('id', email.id);
          return;
        }

        await sendGmail(
          {
            action_id: email.action_id,
            user_id: email.user_id,
            to,
            subject,
            text_body,
            html_body
          },
          supabaseAdmin
        );
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') sent += 1;
      else failed += 1;
    }

    return NextResponse.json({
      message: 'Pending emails processed',
      sent,
      failed,
      skipped
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
