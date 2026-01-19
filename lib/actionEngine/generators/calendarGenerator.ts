// lib/actionEngine/generators/calendarGenerator.ts

import { Action, ActionType, Context, CalendarIntentPayload } from '../types';

export function generateCalendarActions(context: Context): Action[] {
  const actions: Action[] = [];

  try {
    // Skip if no messages
    if (context.messages.length === 0) {
      return actions;
    }

    // Check last inbound message for calendar indicators
    const lastInbound = context.messages.find(m => m.direction === 'inbound');
    if (!lastInbound) {
      return actions;
    }

    const text = lastInbound.cleaned_text.toLowerCase();

    // Detect meeting/calendar indicators
    const meetingIndicators = [
      'meeting',
      'call',
      'schedule',
      'appointment',
      'let\'s meet',
      'can we meet',
      'schůzka',
      'sraz',
      'sejít',
      'zavolat',
    ];

    const hasMeetingIndicator = meetingIndicators.some(ind => text.includes(ind));
    if (!hasMeetingIndicator) {
      return actions;
    }

    // Try to extract time mentions
    let proposedTime: string | undefined;
    let duration = 60; // default 60 minutes

    // Simple time pattern detection
    const timePatterns = [
      /(\d{1,2})[:\.](\d{2})/,
      /(\d{1,2})\s*(am|pm)/i,
      /(\d{1,2})\s*hodin/,
    ];

    for (const pattern of timePatterns) {
      const match = text.match(pattern);
      if (match) {
        // Found time reference, use tomorrow as default date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(parseInt(match[1]) || 10, 0, 0, 0);
        proposedTime = tomorrow.toISOString();
        break;
      }
    }

    // Detect duration hints
    if (text.includes('quick') || text.includes('brief') || text.includes('15 min') || text.includes('krátk')) {
      duration = 15;
    } else if (text.includes('30 min') || text.includes('půl hodiny')) {
      duration = 30;
    } else if (text.includes('hour') || text.includes('hodin')) {
      duration = 60;
    }

    // Determine intent
    let intent: 'accept' | 'propose' | 'suggest' = 'suggest';
    
    if (text.includes('confirm') || text.includes('yes') || text.includes('agreed') || text.includes('potvrzuji') || text.includes('ano')) {
      intent = 'accept';
    } else if (proposedTime) {
      intent = 'propose';
    }

    const payload: CalendarIntentPayload = {
      target_id: proposedTime || `thread:${context.thread.id}`,
      intent,
      proposed_time: proposedTime,
      duration_minutes: duration,
    };

    actions.push({
      type: ActionType.CALENDAR_INTENT,
      payload,
      priority_score: 0, // Will be scored later
      rationale: 'Message contains meeting or scheduling request.',
    });

  } catch (err) {
    console.error('[calendarGenerator] Error:', err);
  }

  return actions;
}
