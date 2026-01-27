// lib/notifications/sendConversationNotifications.ts

import { supabase } from '../supabase';
import { enqueueEmailFromAction } from '../email/enqueueEmail';
import { sendGmail } from '../email/send-gmail';
import { generateText } from '../ai/google';
import { buildFollowUpPrompt } from '../ai/prompts/followUpPrompt';
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

      // Get the action proposal payload for suggested_response AND urgency
      const { data: proposalData } = await supabase
        .from('action_proposals')
        .select('payload, urgency_score')
        .eq('id', primaryProposal.id)
        .single();

      const suggestedResponse = proposalData?.payload?.body_inputs?.suggested_response;
      const urgencyScore = proposalData?.urgency_score || 5;

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
      const subject = `${cpName} - Priorita ${Math.round(primaryProposal.priority_score)}`;

      // Determine urgency text based on urgency_score
      let urgencyText: string;
      if (urgencyScore >= 9) {
        urgencyText = "MUSÍŠ to udělat TEĎ";
      } else if (urgencyScore >= 7) {
        urgencyText = "Měl bys to udělat dnes";
      } else {
        urgencyText = "Měl bys to udělat brzy";
      }

      const summary = conversation?.summary_json;
      const currentState = summary?.current_state || 'No summary available';
      const nextSteps = summary?.next_steps || [];

      const facts = {
        cpName,
        priority_score: primaryProposal.priority_score,
        urgency_score: urgencyScore,
        current_state: currentState,
        next_steps: nextSteps,
        topic: conversation?.topic,
        emailCount,
        suggested_response: suggestedResponse
      };

      let text_body: string;
      try {
        const userPrompt = `KONTEXT KONVERZACE:

Klient: ${facts.cpName}
${facts.topic ? `Téma: ${facts.topic}` : ''}

Co se stalo (Why):
${facts.current_state}

${facts.suggested_response ? `Co klient potřebuje:\n${facts.suggested_response}` : ''}

${facts.next_steps.length > 0 ? `Další kontext:\n${facts.next_steps.join('\n')}` : ''}

---

Napiš email podle přesné struktury:

Action: [Co uděláš - např. "Napíšu mu odpověď a potvrdím schůzku"]

Why: [Proč - použij "Co se stalo" výše]

[Pokud ti chybí konkrétní fakta k odpovědi:]
Info needed:
* [konkrétní věc 1]
* [konkrétní věc 2]

Klikni UPRAVIT a doplň.

Prostý text, žádné markdown.`;

        text_body = await generateText(userPrompt, {
          temperature: 0.2,
          systemInstruction: buildFollowUpPrompt(facts)
        });

        // Add urgency line at the beginning
        text_body = `${urgencyText}\n\n${text_body}`;
      } catch (error) {
        console.error('Failed to generate AI text, using fallback:', error);
        text_body = `${urgencyText}\n\nAction: Odpovědět na zprávu od ${cpName}\n\nWhy: ${currentState}`;
      }

      const rendered = renderEmail(
        {
          action_id: primaryProposal.id,
          action_type: 'follow_up',
          conversation_id: conversationId,
          priority_score: primaryProposal.priority_score,
          impact_score: 0,
          personal_score: 0,
          urgency_score: 0,
          immovability_bonus: 0,
          context_payload: {
            subject_inputs: {
              cpName,
              priority_score: primaryProposal.priority_score,
              action_type: primaryProposal.action_type
            },
            body_inputs: {
              normalized_body: text_body
            },
            action_id: primaryProposal.id,
            user_email: userEmail
          },
          rationale: ''
        },
        actionTemplates,
        userEmail,
        ''
      );

      const final_subject = rendered.subject;
      const final_text_body = rendered.text_body;
      const final_html_body = rendered.html_body;

      // Send notification email to USER
      await enqueueEmailFromAction({
        action_id: primaryProposal.id,
        user_id: group.user_id,
        to: userEmail,
        subject: final_subject,
        text_body: final_text_body,
        html_body: final_html_body
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
