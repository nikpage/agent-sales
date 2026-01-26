// lib/notifications/sendConversationNotifications.ts

import { supabase } from '../supabase';
import { enqueueEmailFromAction } from '../email/enqueueEmail';
import { sendGmail } from '../email/send-gmail';
import { generateText } from '../ai/google';
import { buildFollowUpPrompt } from '../ai/prompts/followUpPrompt';

function convertTextToHtml(text: string): string {
  const blocks = text.split(/\n\n+/);
  return blocks
    .map(block => {
      const content = block.trim().replace(/\n/g, '<br/>');
      return content ? `<p>${content}</p>` : '';
    })
    .filter(Boolean)
    .join('');
}

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

      const summary = conversation?.summary_json;
      const currentState = summary?.current_state || 'No summary available';
      const nextSteps = summary?.next_steps || [];

      const facts = {
        cpName,
        priority_score: primaryProposal.priority_score,
        current_state: currentState,
        next_steps: nextSteps,
        topic: conversation?.topic,
        emailCount
      };

      let text_body: string;
      try {
        text_body = await generateText(buildFollowUpPrompt(facts), { temperature: 0.2 });
      } catch (error) {
        console.error('Failed to generate AI text, using fallback:', error);
        const priorityLabel = facts.priority_score >= 70 ? 'Vysoká' : facts.priority_score >= 40 ? 'Střední' : 'Nízká';
        text_body = `Dobrý den,\n\nPRIORITA: ${priorityLabel}\n\nSHRNUTÍ KONVERZACE:\n`;
        text_body += `• Máte ${emailCount} ${emailCount > 1 ? 'nové zprávy' : 'novou zprávu'} od ${cpName}\n`;
        text_body += `\nAKTUÁLNÍ SITUACE:\n${currentState}\n\n`;
        text_body += `DOPORUČENÁ AKCE:\n`;
        if (nextSteps.length > 0) {
          text_body += nextSteps[0];
        } else {
          text_body += `Zkontrolujte konverzaci a odpovězte na dotazy.`;
        }
      }

      const html_body = convertTextToHtml(text_body);

      // Send notification email to USER
      await enqueueEmailFromAction({
        action_id: primaryProposal.id,
        user_id: group.user_id,
        to: userEmail,
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
