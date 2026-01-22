// pages/api/auth/google/callback.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    // Use service role to bypass RLS
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      REDIRECT_URI
    );

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email) {
      return res.status(400).json({ error: 'No email in user info' });
    }

    // Extract userId from state - must be UUID
    const userId = typeof state === 'string' ? state : null;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId in state' });
    }

    // Format tokens
    const formattedTokens = {
      access_token: tokens.access_token,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope
    };

    // Check for existing user
    const { data: existing } = await supabase
      .from('users')
      .select('id, google_oauth_tokens')
      .eq('id', userId)
      .maybeSingle();

    // Merge tokens to preserve refresh_token
    const existingTokens = existing?.google_oauth_tokens
      ? (typeof existing.google_oauth_tokens === 'string'
          ? JSON.parse(existing.google_oauth_tokens)
          : existing.google_oauth_tokens)
      : {};

    const mergedTokens = {
      ...existingTokens,
      ...formattedTokens,
      refresh_token: tokens.refresh_token || existingTokens.refresh_token
    };

    if (existing) {
      const { error } = await supabase
        .from('users')
        .update({ google_oauth_tokens: mergedTokens })
        .eq('id', userId);

      if (error) {
        return res.status(500).json({ error: error.message });
      }
    } else {
      const { error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: userInfo.email,
          google_oauth_tokens: mergedTokens
        });

      if (error) {
        return res.status(500).json({ error: error.message });
      }
    }

    res.status(200).send('SAVED');
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: error.message });
  }
}
