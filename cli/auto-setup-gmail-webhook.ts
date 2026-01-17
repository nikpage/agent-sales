// cli/auto-setup-gmail-webhook.ts
// Automated setup - no manual console work needed

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function autoSetup() {
  console.log('Starting automated Gmail webhook setup...');

  const projectId = 'email-assit-480316';
  const topicId = 'gmail-notifications';
  const subscriptionId = 'gmail-webhook-sub';
  const webhookUrl = 'https://consulting-agent-git-dev-nikpages-projects.vercel.app/api/gmail-webhook';
  const userId = '8679c8eb-725e-48b3-930a-f35bbbf3b2c2';

  try {
    // Get user's OAuth tokens
    const { data: user } = await supabase
      .from('users')
      .select('google_oauth_tokens')
      .eq('id', userId)
      .single();

    if (!user) throw new Error('User not found');

    // Set up OAuth client with user's tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials(user.google_oauth_tokens);

    // 1. Create/verify Pub/Sub topic exists
    const pubsub = google.pubsub({ version: 'v1', auth: oauth2Client });
    const topicName = `projects/${projectId}/topics/${topicId}`;

    try {
      await pubsub.projects.topics.create({
        name: topicName
      });
      console.log('✓ Topic created');
    } catch (err: any) {
      if (err.code === 409) {
        console.log('✓ Topic already exists');
      } else throw err;
    }

    // 2. Grant Gmail permission to publish
    await pubsub.projects.topics.setIamPolicy({
      resource: topicName,
      requestBody: {
        policy: {
          bindings: [{
            role: 'roles/pubsub.publisher',
            members: ['serviceAccount:gmail-api-push@system.gserviceaccount.com']
          }]
        }
      }
    });
    console.log('✓ Gmail permissions granted');

    // 3. Create push subscription
    const subscriptionName = `projects/${projectId}/subscriptions/${subscriptionId}`;
    try {
      await pubsub.projects.subscriptions.create({
        name: subscriptionName,
        requestBody: {
          topic: topicName,
          pushConfig: {
            pushEndpoint: webhookUrl
          }
        }
      });
      console.log('✓ Push subscription created');
    } catch (err: any) {
      if (err.code === 409) {
        console.log('✓ Subscription already exists');
      } else throw err;
    }

    // 4. Set up Gmail watch
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const watchResponse = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: topicName,
        labelIds: ['INBOX', 'SENT']
      }
    });

    console.log('✓ Gmail watch activated');
    console.log('  Expiration:', new Date(parseInt(watchResponse.data.expiration!)));
    console.log('  History ID:', watchResponse.data.historyId);

    // 5. Save watch info to database
    await supabase
      .from('users')
      .update({
        settings: {
          gmail_watch_expiration: watchResponse.data.expiration,
          gmail_watch_history_id: watchResponse.data.historyId
        }
      })
      .eq('id', userId);

    console.log('✓ Database updated');
    console.log('\n✅ SETUP COMPLETE - Send test email to podone@gmail.com');

  } catch (err: any) {
    console.error('❌ Setup failed:', err.message);
    if (err.errors) console.error('Details:', err.errors);
    process.exit(1);
  }
}

autoSetup();
