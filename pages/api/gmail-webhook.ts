// api/gmail-webhook.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { runAgentForClient } from '../../agent/agentRunner';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log('WEBHOOK HIT:', JSON.stringify({
    method: req.method,
    headers: req.headers,
    body: req.body
  }));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const resourceState = req.headers['x-goog-resource-state'];
  if (resourceState === 'sync') {
    return res.status(200).json({ status: 'sync acknowledged' });
  }

  try {
    const message = req.body.message;
    if (!message || !message.data) {
      return res.status(200).json({ status: 'no message data' });
    }

    const decoded = JSON.parse(
      Buffer.from(message.data, 'base64').toString('utf-8')
    );

    const { emailAddress, historyId } = decoded;

    if (!emailAddress) {
      return res.status(200).json({ status: 'no email address' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailAddress)
      .single();

    if (!user) {
      return res.status(200).json({ status: 'user not found' });
    }

    await runAgentForClient(user.id);

    return res.status(200).json({
      status: 'processed',
      userId: user.id,
      historyId
    });

  } catch (err: any) {
    console.error('[GMAIL-WEBHOOK] Error:', err.message);
    return res.status(200).json({
      status: 'error',
      message: err.message
    });
  }
}
