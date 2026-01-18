// pages/api/auth/google/callback.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.status(400).json({ error: 'Missing code or state' });
  }

  const userId = state;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    return res.status(400).json({ error: tokens.error });
  }

  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  const userInfo = await userInfoResponse.json();

  const expiryDate = Date.now() + (tokens.expires_in * 1000);
  const formattedTokens = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope,
    token_type: tokens.token_type,
    expiry_date: expiryDate
  };

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  let error;
  if (existing) {
    const result = await supabase
      .from('users')
      .update({ google_oauth_tokens: formattedTokens })
      .eq('id', userId);
    error = result.error;
  } else {
    const result = await supabase
      .from('users')
      .insert({
        id: userId,
        email: userInfo.email,
        google_oauth_tokens: formattedTokens,
        calendar_id: 'primary',
        created_at: new Date().toISOString()
      });
    error = result.error;
  }

  if (error) {
    return res.status(500).json({ error: 'Failed to save tokens' });
  }

  res.send('SAVED');
}
