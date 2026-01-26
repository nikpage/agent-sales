// lib/notifications/sendConversationNotifications.ts

import { supabase } from '../supabase';
import { enqueueEmailFromAction } from '../email/enqueueEmail';

interface NotificationGroup {
  conversation_id: string;
  user_id: string;
  proposals: Array<{
    id: string;
    priority_score: number;
    action_type: string;
    created_at: string;
  }>;
}

export async function sendConversationNotifications(userId: string, userEmail: string): Promise<void> {
  // Find all un-notified action proposals for this user
  const { data: proposals, error } = await supabase
    .from('action_proposals')
    .select('id, conversation_id, user_id, priority_score, action_type, created_at')
    .eq('user_id', userId)
    .eq('status', 'waiting_user')
    .is('last_notified_at', null);

  if (error || !proposals || proposals.length === 0) {
    return;
  }

  // Group by conversation_id
  const grouped = new Map<string, NotificationGroup>();

  for (const proposal of proposals) {
    const key = proposal.conversation_id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        conversation_id: proposal.conversation_id,
        user_id: proposal.user_id,
        proposals: []
      });
    }
    grouped.get(key)!.proposals.push({
      id: proposal.id,
      priority_score: proposal.priority_score,
      action_type: proposal.action_type,
      created_at: proposal.created_at
    });
  }

  // Send one notification per conversation
  for (const [conversationId, group] of grouped) {
    try {
      // Get the most recent/highest priority proposal
      const sortedProposals = group.proposals.sort((a, b) => {
        // First by priority score
        if (b.priority_score !== a.priority_score) {
          return b.priority_score - a.priority_score;
        }
        // Then by recency
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const primaryProposal = sortedProposals[0];
      const emailCount = group.proposals.length;

      // Get conversation details
      const { data: conversation } = await supabase
        .from('conversation_threads')
        .select('topic, summary_json')
        .eq('id', conversationId)
        .single();

      // Get CP name
      const { data: cpParticipant } = await supabase
        .from('thread_participants')
        .select('cp_id')
        .eq('thread_id', conversationId)
        .limit(1)
        .single();

      let cpName = 'Unknown Contact';
      if (cpParticipant) {
        const { data: cp } = await supabase
          .from('cps')
          .select('name')
          .eq('id', cpParticipant.cp_id)
          .single();
        cpName = cp?.name || cpName;
      }

      // Build subject line
      const subject = `${cpName} - Priority ${Math.round(primaryProposal.priority_score)} - ${primaryProposal.action_type}`;

      // Build email body
      const summary = conversation?.summary_json;
      const currentState = summary?.current_state || 'No summary available';
      const nextSteps = summary?.next_steps || [];

      let body = `You have ${emailCount} new email${emailCount > 1 ? 's' : ''} from ${cpName}.\n\n`;
      body += `Current Status:\n${currentState}\n\n`;

      if (nextSteps.length > 0) {
        body += `Suggested Next Steps:\n`;
        nextSteps.forEach((step: string) => {
          body += `• ${step}\n`;
        });
      }

      // TODO: Add HTML version with proper formatting
      const html_body = body.replace(/\n/g, '<br>');

      // Send notification email to USER
      await enqueueEmailFromAction({
        action_id: primaryProposal.id,
        user_id: group.user_id,
        to: userEmail, // Send to the USER, not the CP
        subject,
        text_body: body,
        html_body
      });

      // Mark ALL proposals in this conversation as notified
      const proposalIds = group.proposals.map(p => p.id);
      await supabase
        .from('action_proposals')
        .update({
          status: 'notified',
          last_notified_at: new Date().toISOString()
        })
        .in('id', proposalIds);

    } catch (error) {
      console.error(`Failed to send notification for conversation ${conversationId}:`, error);
      // Continue with other conversations
    }
  }
}
