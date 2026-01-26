// lib/notifications/sendConversationNotifications.ts

import { supabase } from '../supabase';
import { enqueueEmailFromAction } from '../email/enqueueEmail';
import { sendGmail } from '../email/send-gmail';
import { renderEmail } from '../email/renderEmail';
import { actionTemplates } from '../email/templates/byAction';

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

      // Get full action proposal data for rendering
      const { data: fullProposal } = await supabase
        .from('action_proposals')
        .select('*')
        .eq('id', primaryProposal.id)
        .single();

      if (!fullProposal) continue;

      // Build conversation summary for email
      const summary = conversation?.summary_json;
      const currentState = summary?.current_state || 'Žádný souhrn není k dispozici';
      const nextSteps = summary?.next_steps || [];

      let conversationSummary = `Máte ${emailCount} ${emailCount === 1 ? 'nový email' : emailCount < 5 ? 'nové emaily' : 'nových emailů'} od ${cpName}.\n\n`;
      conversationSummary += `Aktuální stav:\n${currentState}\n\n`;

      if (nextSteps.length > 0) {
        conversationSummary += `Doporučené další kroky:\n`;
        nextSteps.forEach((step: string) => {
          conversationSummary += `• ${step}\n`;
        });
      }

      // Use renderEmail with your existing templates
      const { subject, text_body, html_body } = renderEmail(
        {
          action_id: primaryProposal.id,
          action_type: primaryProposal.action_type,
          conversation_id: conversationId,
          priority_score: primaryProposal.priority_score,
          impact_score: 0,
          personal_score: 0,
          urgency_score: 0,
          immovability_bonus: 0,
          context_payload: {
            subject_inputs: { topic: conversation?.topic || cpName },
            body_inputs: {
              recipient_name: cpName,
              topic: conversation?.topic || cpName,
              conversation_summary: conversationSummary,
              suggested_response: nextSteps.join('. ')
            }
          },
          rationale: fullProposal.rationale
        },
        actionTemplates,
        userEmail,
        '' // unsubscribe link - add if needed
      );

      // Send notification email to USER
      await enqueueEmailFromAction({
        action_id: primaryProposal.id,
        user_id: group.user_id,
        to: userEmail, // Send to the USER, not the CP
        subject,
        text_body,
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

  // Now send all pending emails that were just enqueued
  const { data: pendingEmails } = await supabase
    .from('emails')
    .select('id, action_id, user_id, to, subject, text_body, html_body')
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (pendingEmails && pendingEmails.length > 0) {
    for (const email of pendingEmails) {
      try {
        await sendGmail({
          action_id: email.action_id,
          user_id: email.user_id,
          to: email.to,
          subject: email.subject,
          text_body: email.text_body,
          html_body: email.html_body
        });
      } catch (error) {
        console.error(`Failed to send email ${email.id}:`, error);
        // Continue with other emails
      }
    }
  }
}
