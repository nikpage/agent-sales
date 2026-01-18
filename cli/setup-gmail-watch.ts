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

  // Replace with your actual Google Cloud project ID and topic name
  const topicName = 'projects/sales-agent-484509/topics/gmail-notifications';

  try {
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: topicName,
        labelIds: ['INBOX', 'SENT']
      }
    });

    console.log('Watch setup successful:', response.data);

    // Save watch info to user
    await supabase
      .from('users')
      .update({
        settings: {
          ...user.settings,
          gmail_watch_expiration: response.data.expiration,
          gmail_watch_history_id: response.data.historyId
        }
      })
      .eq('id', userId);

  } catch (err: any) {
    console.error('Watch setup failed:', err.message);
  }
}

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: ts-node cli/setup-gmail-watch.ts <userId>');
  process.exit(1);
}

setupWatch(userId);
