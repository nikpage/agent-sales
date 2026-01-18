// pages/api/run-agent.ts

import type { NextApiRequest, NextApiResponse } from 'next'
import { runAgentForClient } from '../../agent/agentRunner'
import { safeStringify } from '../../lib/utils'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.status(405).end()
    return
  }

  const { clientId } = req.body
  if (!clientId) {
    res.status(400).json({ error: 'clientId required' })
    return
  }

  const result = await runAgentForClient(clientId)
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).send(safeStringify(result));
}
