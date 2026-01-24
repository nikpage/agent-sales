// lib/actions/proposeActions.ts

import { createClient } from '@supabase/supabase-js';
import { generateEmailContent, composeFullEmail } from '../email/templates/byAction';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface ProposalInput {
  conversation_id: string;
  action_type: string;
  rationale: string;
  payload: Record<string, unknown>;
  priority_score: number;
  urgency_score: number;
  impact_score: number;
  personal_score: number;
}

/**
 * Create action proposal with rendered email content
 * Skip logic: Only checks cps.is_blacklisted - skips if true
 */
export async function createActionProposal(input: ProposalInput): Promise<string> {
  // Get conversation details
  const { data: conversation } = await supabase
    .from('conversation_threads')
    .select('user_id')
    .eq('id', input.conversation_id)
    .single();

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Get the primary counterparty from thread participants
  const { data: participants } = await supabase
    .from('thread_participants')
    .select('cp_id')
    .eq('thread_id', input.conversation_id)
    .limit(1);

  const cpId = participants?.[0]?.cp_id;

  if (!cpId) {
    throw new Error('No counterparty found for conversation');
  }

  // Skip logic: Check if CP is blacklisted
  const { data: cp } = await supabase
    .from('cps')
    .select('is_blacklisted')
    .eq('id', cpId)
    .single();

  if (cp?.is_blacklisted) {
    console.log(`Skipping action proposal for blacklisted CP: ${cpId}`);
    return '';
  }

  // Generate email content using templates
  const emailContent = generateEmailContent({
    action_type: input.action_type,
    rationale: input.rationale,
    payload: input.payload,
  });

  const { subject, body } = composeFullEmail(emailContent);

  // Create the proposal with all required fields
  const { data: proposal, error } = await supabase
    .from('action_proposals')
    .insert({
      conversation_id: input.conversation_id,
      user_id: conversation.user_id,
      cp_id: cpId,
      action_type: input.action_type,
      rationale: input.rationale,
      payload: input.payload,
      priority_score: input.priority_score,
      urgency_score: input.urgency_score,
      impact_score: input.impact_score,
      personal_score: input.personal_score,
      status: 'waiting_user',
      draft_subject: subject,
      draft_body_text: body,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create proposal: ${error.message}`);
  }

  return proposal.id;
}

/**
 * Get proposals that need user action
 */
export async function getPendingProposals(userId: string) {
  const { data, error } = await supabase
    .from('action_proposals')
    .select('*, cps(name, primary_identifier)')
    .eq('user_id', userId)
    .eq('status', 'waiting_user')
    .order('priority_score', { ascending: false });

  if (error) {
    throw new Error(`Failed to get proposals: ${error.message}`);
  }

  return data;
}
