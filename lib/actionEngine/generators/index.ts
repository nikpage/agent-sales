// lib/actionEngine/generators/index.ts

import { Action, Context } from '../types';
import { generateTodoActions } from './todoGenerator';
import { generateReplyActions } from './replyGenerator';
import { generateCalendarActions } from './calendarGenerator';
import { generateNegotiationActions } from './negotiationGenerator';

export { generateTodoActions } from './todoGenerator';
export { generateReplyActions } from './replyGenerator';
export { generateCalendarActions } from './calendarGenerator';
export { generateNegotiationActions } from './negotiationGenerator';

export function getAllCandidates(context: Context): Action[] {
  const candidates: Action[] = [];

  // Run all generators, catch errors individually
  try {
    candidates.push(...generateTodoActions(context));
  } catch (err) {
    console.error('[generators] todoGenerator failed:', err);
  }

  try {
    candidates.push(...generateReplyActions(context));
  } catch (err) {
    console.error('[generators] replyGenerator failed:', err);
  }

  try {
    candidates.push(...generateCalendarActions(context));
  } catch (err) {
    console.error('[generators] calendarGenerator failed:', err);
  }

  try {
    candidates.push(...generateNegotiationActions(context));
  } catch (err) {
    console.error('[generators] negotiationGenerator failed:', err);
  }

  return candidates;
}
