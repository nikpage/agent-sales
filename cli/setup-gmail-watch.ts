// cli/setup-gmail-watch.ts

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { getOAuth2Client } from '../lib/google-auth';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function setupWatch(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (!user) {
    console.error('User not found');
    return;
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(user.google_oauth_tokens);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    // Initialize cursor by getting current historyId from messages.list
    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 1
    });

    if ((response.data as any).historyId) {
      console.log('Initial historyId obtained:', (response.data as any).historyId);

      // Save initial cursor for polling
      await supabase
        .from('users')
        .update({
          settings: {
            ...user.settings,
            gmail_watch_history_id: (response.data as any).historyId
          }
        })
        .eq('id', userId);

      console.log('Polling cursor initialized successfully');
    } else {
      console.error('No historyId returned');
    }

  } catch (err: any) {
    console.error('Cursor initialization failed:', err.message);
  }
}

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: ts-node cli/setup-gmail-watch.ts <userId>');
  process.exit(1);
}

setupWatch(userId);
