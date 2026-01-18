// agent/agentContext.ts

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { setCredentials } from '../lib/google-auth';

export interface AgentContext {
  clientId: string;
  client: any;
  supabase: any;
  gmail: any;
  calendar: any;
  apiKey: string;
  bulkMode: boolean;
}

export async function createAgentContext(clientId: string, bulkMode: boolean = false): Promise<AgentContext | null> {
  console.log(`DEBUG: createAgentContext called with bulkMode=${bulkMode}`);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!
  );

  const apiKey = process.env.GEMINI_API_KEY!;

  // Load client
  const { data: client, error: clientError } = await supabase
    .from('users')
    .select('*')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    console.error('Client fetch error:', clientError);
    throw new Error('CLIENT_NOT_FOUND');
  }

  if (!client.google_oauth_tokens) {
    console.error('No google_oauth_tokens for client');
    throw new Error('NO_OAUTH_TOKENS');
  }

  // Initialize tokens correctly
  let tokens;
  try {
    tokens = typeof client.google_oauth_tokens === 'string'
      ? JSON.parse(client.google_oauth_tokens)
      : client.google_oauth_tokens;
  } catch (parseError) {
    console.error('Token parse error:', parseError);
    throw new Error('TOKEN_PARSE_FAILED');
  }

  // Check token expiry and refresh if needed
  const oauth2Client = setCredentials(tokens);
  if (Date.now() >= tokens.expiry_date - 300000) {
    if (!tokens.refresh_token) {
      throw new Error('AUTH_REQUIRED');
    }
    const { credentials } = await oauth2Client.refreshAccessToken();
    tokens.access_token = credentials.access_token;
    tokens.expiry_date = credentials.expiry_date;
    await supabase
      .from('users')
      .update({ google_oauth_tokens: tokens })
      .eq('id', clientId);
  }

  // Setup Gmail and Calendar
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  return {
    clientId,
    client,
    supabase,
    gmail,
    calendar,
    apiKey,
    bulkMode
  };
}
