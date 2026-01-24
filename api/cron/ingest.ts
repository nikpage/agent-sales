// api/cron/ingest.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { runAgentForClient } from '../../agent/agentRunner';
import { sendGmail } from '../../lib/email/send-gmail';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { data: users } = await supabase
    .from('users')
    .select('id');

  if (!users) {
    return res.status(200).json({ processed: 0 });
  }

  for (const user of users) {
    try {
      await runAgentForClient(user.id);
    } catch (error) {
      console.error(`Failed to run agent for user ${user.id}:`, error);
    }

    const { data: pendingEmails } = await supabase
      .from('emails')
      .select('id, action_id, user_id, to, subject, text_body, html_body')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);

    if (pendingEmails && pendingEmails.length > 0) {
      await Promise.allSettled(
        pendingEmails.map((email) =>
          sendGmail(
            {
              action_id: email.action_id,
              user_id: email.user_id,
              to: email.to,
              subject: email.subject,
              text_body: email.text_body,
              html_body: email.html_body
            },
            supabase
          )
        )
      );
    }
  }

  return res.status(200).json({ processed: users.length });
}
