// agent/agents/ingestion.ts

import { createClient } from '@supabase/supabase-js';
import { parseEmailCommand } from '../../lib/email/commandParser';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface IncomingEmail {
  from: string;
  to: string;
  subject: string;
  body: string;
  userId: string;
}

/**
 * Check if incoming email is a command reply
 * Call this BEFORE normal message processing
 * Returns true if command was processed, false otherwise
 */
export async function checkForCommand(email: IncomingEmail): Promise<boolean> {
  // Only check emails FROM the user (not TO the user)
  const { data: user } = await supabase
    .from('users')
    .select('email')
    .eq('id', email.userId)
    .single();

  if (!user || email.from !== user.email) {
    return false;
  }

  // Try to parse command
  const parsed = parseEmailCommand(email.body);

  if (!parsed.actionId || !parsed.command) {
    return false;
  }

  // Command found - route to command API
  try {
    const response = await fetch(`${process.env.APP_URL}/api/cmd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderEmail: email.from,
        emailBody: email.body,
      }),
    });

    if (!response.ok) {
      console.error('Command execution failed:', await response.text());
      return false;
    }

    console.log('Command executed successfully:', parsed.command);
    return true;
  } catch (error) {
    console.error('Error routing command:', error);
    return false;
  }
}

/**
 * Main ingestion function
 * Add checkForCommand at the very beginning to intercept command emails
 */
export async function processIncomingEmail(email: IncomingEmail): Promise<void> {
  // FIRST: Check if this is a command - if true, terminate ingestion for this message
  const wasCommand = await checkForCommand(email);
  if (wasCommand) {
    console.log('Email was a command, skipping normal ingestion');
    return;
  }

  // Continue with normal message processing...
  // [Your existing ingestion logic here]
}

/**
 * Main ingestion runner called by agentRunner
 * Fetches and processes emails for a user
 */
export async function runIngestion(context: any): Promise<void> {
  const userId = context.clientId || context.client?.id;
  console.log('Running ingestion for user:', userId);

  // TODO: Implement actual email fetching logic
  // Use context.gmail to fetch emails
  // Use context.supabase for database operations
  // For each email, check if it's a command before processing

  console.log('✓ Ingestion complete (stub - no actual processing yet)');
}
