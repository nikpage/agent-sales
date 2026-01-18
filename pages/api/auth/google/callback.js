// pages/api/auth/google/callback.js

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  const userId = state; // user_id passed as state from /api/auth/google

  if (!userId) {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenResponse.json();

  if (tokens.error) {
    return res.status(400).json({ error: tokens.error });
  }

  // Save tokens to Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { error } = await supabase
    .from('clients')
    .update({
      google_oauth_tokens: JSON.stringify(tokens),
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to save tokens:', error);
    return res.status(500).json({ error: 'Failed to save tokens' });
  }

  res.send('OAuth successful! Tokens saved. You can close this window.');
}
