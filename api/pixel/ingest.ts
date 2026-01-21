// api/pixel/ingest.ts

import { runIngestIfNeeded } from '../../agent/agentRunner';

const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = url.searchParams.get('clientId');

  if (!clientId) {
    return new Response(PIXEL, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }

  await runIngestIfNeeded(clientId, 'manual');

  return new Response(PIXEL, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
