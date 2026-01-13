# Executive Assistant – Roadmap to Legendary

## Phase 1 — Conversation Identification (Foundation)
[ ] Introduce a product-level Conversation ID (not tied to Gmail thread)
[ ] Treat Gmail threadId as a hint, not authority
[ ] Generate embedding for every incoming email
[ ] Add vector search over existing conversations
  [ ] Retrieve top-k candidate conversations
  [ ] Attach email if similarity > threshold
  [ ] Create new conversation otherwise
[ ] Store conversation embeddings in DB
  [ ] Rolling “current topic” embedding
  [ ] Optional stable “historical” embedding
[ ] Avoid re-embedding full summaries on every message
[ ] Cross-email identity handling
  [ ] Map multiple email addresses to one CP
  [ ] Detect assistants / forwards / aliases
  [ ] Heuristic matching (domain, signature, names)

## Phase 2 — Executive-Grade Conversation Summaries
[ ] Define fixed summary schema per conversation
  [ ] Context / history (how we got here)
  [ ] Current state (recent-weighted)
  [ ] Next steps (ranked, with when)
  [ ] Risks / blockers
  [ ] Last touch (who / when)
[ ] Store structured summary in DB
[ ] Update summary incrementally on new email
[ ] Rebuild full summary only on major changes
[ ] Ensure summaries are readable without opening thread

## Phase 3 — Smart Assists (Judgment > Automation)
[ ] Implement Action Engine with structured outputs
  [ ] TODO (what / when / priority / why)
  [ ] Reply draft (tone-aware)
  [ ] Calendar action (accept / propose / suggest)
  [ ] Negotiation suggestion (counter / fallback)
[ ] Rank actions by impact + urgency
[ ] Limit surfaced actions to top 1–3
[ ] Require approval for now (no auto-send yet)

## Phase 4 — Email as the Control Surface
[ ] Add approve / reject buttons for suggested replies
[ ] Add approve / reject for calendar actions
[ ] Allow user to confirm or reassign conversation
[ ] Add “save CP point” action from email
[ ] Expand one-click actions beyond complete/snooze
[ ] Track user feedback from clicks

## Phase 5 — CP POINTs (Human Memory Layer)
[ ] Define CP POINT schema
  [ ] Nicknames
  [ ] Important places (e.g. “My Office”, “The Pub”)
  [ ] Preferences (timing, tone, channel)
  [ ] Relationship notes
[ ] Store CP POINTs per contact
[ ] Surface CP POINTs in summaries
[ ] Use CP POINTs in scheduling + drafting
[ ] Allow user to add/edit CP POINTs easily

## Embeddings & Vector Flow (Core Infrastructure)
[ ] Embed cleaned email text on arrival
[ ] Use embedding to match conversations in real time
[ ] Maintain rolling conversation embedding
[ ] Store embeddings using pgvector (or equivalent)
[ ] Tune similarity thresholds with real data
[ ] Log confidence scores for later tuning

## Final “Legendary” Tuning
[ ] Learn from user corrections
[ ] Improve next-step timing accuracy
[ ] Reduce false merges / splits
[ ] Increase auto-approval confidence
[ ] Make summaries shorter, sharper, more decisive

---

**Start point for tomorrow:**  
☑ Phase 1 → Stored conversation embeddings + vector-based conversation matching
