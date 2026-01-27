// pages/api/cmd.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { parseEmailCommand } from '../../lib/email/commandParser';
import { createOutboundDraftToCp, sendNotificationToUser } from '../../lib/email/send-gmail';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { senderEmail, emailBody } = req.body;

    if (!senderEmail || !emailBody) {
      return res.status(400).json({ error: 'Missing senderEmail or emailBody' });
    }

    // Parse email for command and action_id
    const parsed = parseEmailCommand(emailBody);

    if (!parsed.actionId) {
      return res.status(400).json({ error: 'No action_id found in email' });
    }

    if (!parsed.command) {
      return res.status(400).json({ error: 'No valid command found in email' });
    }

    // Get user_id from sender email
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', senderEmail)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch action proposal
    const { data: proposal, error: proposalError } = await supabase
      .from('action_proposals')
      .select('id, user_id, cp_id, status, draft_subject, draft_body_text, action_type, rationale, payload')
      .eq('id', parsed.actionId)
      .single();

    if (proposalError || !proposal) {
      return res.status(404).json({ error: 'Action proposal not found' });
    }

    // Ownership verification (CRITICAL)
    if (proposal.user_id !== user.id) {
      return res.status(403).json({ error: 'You do not own this action' });
    }

    // Execute command
    switch (parsed.command) {
      case 'DO_IT':
        await handleDoIt(proposal);
        break;

      case 'EDIT':
        await handleEdit(proposal, parsed.editNotes!);
        break;

      case 'ILL_DO_IT':
        await handleIllDoIt(proposal);
        break;

      case 'BLACKLIST_CP':
        await handleBlacklistCp(proposal);
        break;
    }

    return res.status(200).json({ success: true, command: parsed.command });
  } catch (error) {
    console.error('Command execution error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * DO IT - Create draft in Gmail
 */
async function handleDoIt(proposal: { id: string; user_id: string; status: string }): Promise<void> {
  const { draftId, wasExisting } = await createOutboundDraftToCp(proposal.id);

  if (wasExisting) {
    await sendNotificationToUser(
      proposal.user_id,
      'Draft Already Exists',
      'A draft for this action was already created in Gmail.'
    );
  } else {
    await sendNotificationToUser(
      proposal.user_id,
      'Draft Created',
      `Your draft has been created in Gmail. Draft ID: ${draftId}`
    );
  }
}

/**
 * EDIT - Trigger AI regeneration with user notes, then notify user
 * User notes should influence the AI rewrite, not just be appended
 */
async function handleEdit(
  proposal: { id: string; user_id: string; action_type: string; rationale: string; payload: Record<string, unknown> },
  editNotes: string
): Promise<void> {
  // Add user notes to payload for AI regeneration
  const updatedPayload = {
    ...proposal.payload,
    user_edit_notes: editNotes,
  };

  // Regenerate email content with AI, incorporating user notes
  const { generateEmailContent, composeFullEmail } = await import('../../lib/email/templates/byAction');

  const emailContent = generateEmailContent({
    action_type: proposal.action_type,
    rationale: `${proposal.rationale}\n\nUser requested: ${editNotes}`,
    payload: updatedPayload,
  });

  const { subject, body } = composeFullEmail(emailContent);

  // Update the proposal with regenerated content
  await supabase
    .from('action_proposals')
    .update({
      draft_subject: subject,
      draft_body_text: body,
      payload: updatedPayload,
    })
    .eq('id', proposal.id);

  await sendNotificationToUser(
    proposal.user_id,
    'Draft Updated with Your Notes',
    `I've regenerated the draft incorporating your notes: "${editNotes}"\n\nReply "DO IT" to create the updated draft in Gmail.`
  );
}

/**
 * I'LL DO IT - Update status to handled
 */
async function handleIllDoIt(proposal: { id: string; user_id: string }): Promise<void> {
  await supabase
    .from('action_proposals')
    .update({ status: 'handled' })
    .eq('id', proposal.id);

  // Get conversation_id from proposal
  const { data: proposalData } = await supabase
    .from('action_proposals')
    .select('conversation_id')
    .eq('id', proposal.id)
    .single();

  if (proposalData?.conversation_id) {
    // Get latest message external_id from conversation
    const { data: messages } = await supabase
      .from('messages')
      .select('external_id')
      .eq('conversation_id', proposalData.conversation_id)
      .order('timestamp', { ascending: false })
      .limit(1);

    const externalId = messages?.[0]?.external_id;

    if (externalId) {
      // Get user's OAuth tokens
      const { data: user } = await supabase
        .from('users')
        .select('google_oauth_tokens')
        .eq('id', proposal.user_id)
        .single();

      if (user?.google_oauth_tokens) {
        // Create Gmail client
        const { google } = await import('googleapis');
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );
        oauth2Client.setCredentials(user.google_oauth_tokens);
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Mark email as UNREAD
        try {
          await gmail.users.messages.modify({
            userId: 'me',
            id: externalId,
            requestBody: { addLabelIds: ['UNREAD'] }
          });
        } catch (error) {
          console.error('Failed to mark email as UNREAD:', error);
        }
      }
    }
  }

  await sendNotificationToUser(
    proposal.user_id,
    'Marked as Handled',
    "Got it! I've marked this as handled by you."
  );
}

/**
 * BLACKLIST CP - Dual-table update: cps.is_blacklisted = true AND action_proposals.status = rejected_blacklisted
 */
async function handleBlacklistCp(proposal: { id: string; user_id: string; cp_id: string }): Promise<void> {
  // Update counterparty blacklist status
  await supabase
    .from('cps')
    .update({ is_blacklisted: true })
    .eq('id', proposal.cp_id);

  // Update proposal status to rejected_blacklisted
  await supabase
    .from('action_proposals')
    .update({ status: 'rejected_blacklisted' })
    .eq('id', proposal.id);

  await sendNotificationToUser(
    proposal.user_id,
    'Contact Blacklisted',
    'This contact has been blacklisted. No further actions will be proposed for them.'
  );
}
