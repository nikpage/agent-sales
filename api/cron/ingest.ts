// api/cron/ingest.ts
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
    await runAgentForClient(user.id);
  }

  return res.status(200).json({ processed: users.length });
}
