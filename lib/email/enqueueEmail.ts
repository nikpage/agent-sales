// lib/email/enqueueEmail.ts

import { supabase } from '../supabase';

interface EnqueueEmailParams {
  action_id: string;
  user_id: string;
  to: string;
  subject: string;
  text_body: string;
  html_body: string;
}

export async function enqueueEmailFromAction(params: EnqueueEmailParams): Promise<string> {
  const { action_id, user_id, to, subject, text_body, html_body } = params;

  // Check if email already exists for this action_id + user_id (idempotency)
  const { data: existing, error: fetchError } = await supabase
    .from('emails')
    .select('id')
    .eq('action_id', action_id)
    .eq('user_id', user_id)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`Failed to check existing email: ${fetchError.message}`);
  }

  if (existing) {
    console.log(`Email already enqueued for action_id: ${action_id}, user_id: ${user_id}`);
    return existing.id;
  }

  // Insert new pending email
  const { data: newEmail, error: insertError } = await supabase
    .from('emails')
    .insert({
      action_id,
      user_id,
      to,
      subject,
      text_body,
      html_body,
      status: 'pending',
      retry_count: 0,
      bounced: false
    })
    .select('id')
    .single();

  // Handle race condition: if duplicate key error, re-fetch and return existing
  if (insertError) {
    if (insertError.code === '23505') { // PostgreSQL duplicate key error
      const { data: raceExisting } = await supabase
        .from('emails')
        .select('id')
        .eq('action_id', action_id)
        .eq('user_id', user_id)
        .single();

      if (raceExisting) {
        console.log(`Email already enqueued (race condition) for action_id: ${action_id}, user_id: ${user_id}`);
        return raceExisting.id;
      }
    }
    throw new Error(`Failed to enqueue email: ${insertError.message}`);
  }

  console.log(`Email enqueued for action_id: ${action_id}, user_id: ${user_id}, email_id: ${newEmail.id}`);
  return newEmail.id;
}
