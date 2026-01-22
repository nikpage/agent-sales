// lib/email/templates/byAction.ts

import { EmailPayload } from '../../actions/proposeActions';

export interface ActionTemplate {
  subject: (payload: EmailPayload) => string;
  actionSection: (payload: EmailPayload) => string;
}

export const actionTemplates: Record<string, ActionTemplate> = {

  follow_up: {
    subject: (payload) => {
      return payload.subject_inputs.topic || 'Follow-up';
    },
    actionSection: (payload) => {
      const { recipient_name, topic } = payload.body_inputs;
      return `Following up on ${topic}${recipient_name ? ` with ${recipient_name}` : ''}.`;
    }
  },

  schedule_meeting: {
    subject: (payload) => {
      return payload.subject_inputs.meeting_type || 'Meeting Request';
    },
    actionSection: (payload) => {
      const { recipient_name, meeting_type, proposed_times } = payload.body_inputs;
      return `Schedule ${meeting_type}${recipient_name ? ` with ${recipient_name}` : ''}${proposed_times ? `. Proposed times: ${proposed_times}` : ''}.`;
    }
  },

  send_document: {
    subject: (payload) => {
      return payload.subject_inputs.document_name || 'Document';
    },
    actionSection: (payload) => {
      const { recipient_name, document_name } = payload.body_inputs;
      return `Send ${document_name}${recipient_name ? ` to ${recipient_name}` : ''}.`;
    }
  },

  request_info: {
    subject: (payload) => {
      return payload.subject_inputs.info_type || 'Information Request';
    },
    actionSection: (payload) => {
      const { recipient_name, info_type } = payload.body_inputs;
      return `Request ${info_type}${recipient_name ? ` from ${recipient_name}` : ''}.`;
    }
  },

  send_proposal: {
    subject: (payload) => {
      return payload.subject_inputs.proposal_title || 'Proposal';
    },
    actionSection: (payload) => {
      const { recipient_name, proposal_title, deadline } = payload.body_inputs;
      return `Send proposal: ${proposal_title}${recipient_name ? ` to ${recipient_name}` : ''}${deadline ? `. Deadline: ${deadline}` : ''}.`;
    }
  }

};
