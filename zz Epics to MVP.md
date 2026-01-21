**🏗️ EPIC A: Safe Ingestion Core**

**Goal:** Inbox sync is boring, predictable, and impossible to corrupt.

---

**Sprint A1 — Ingest Hardening** ✅ **COMPLETE**

*"Ingest never duplicates or regresses state."*

**Completed Work Items:**
* ✅ **Cursor persistence**: Read/write `users.settings.gmail_watch_history_id`. First run uses `messages.list`, subsequent runs use `history.list` with pagination. Cursor only moves forward (max of current vs new).
* ✅ **Idempotency guards**:
  - Messages: `universal_message_id` and `external_id` duplicate detection with race condition handling (23505 retry)
  - CPs: Unique index on `(user_id, primary_identifier)` with deterministic SELECT on collision (ORDER BY created_at ASC LIMIT 1)
* ✅ **Structured logging**:
  - `ingest_start` with `{clientId, cursor}`
  - `ingest_end` with `{clientId, newCursor, inserted, skipped}`
* ✅ **Gmail webhooks removed**:
  - Deleted `pages/api/gmail-webhook.ts`, `cli/auto-setup-gmail-webhook.ts`
  - Removed `gmail.users.watch` calls and `gmail_watch_expiration` from code
  - `cli/setup-gmail-watch.ts` now only initializes polling cursor
  - Pub/Sub topic/subscription to be deleted from GCP

**Out of Scope:**
* No distributed locking (concurrency controlled at cron/trigger level)
* No new triggers
* No UI changes

**Acceptance Tests:**
1. ✅ **Idempotency**: Run ingest 5× sequentially → same DB state (no duplicate messages or CPs, same cursor value)
2. ⏳ **Cursor persistence**: Run ingest, verify `gmail_watch_history_id` persists and only moves forward
3. ⏳ **Race condition handling**: Concurrent ingests create only 1 CP per sender (unique index blocks duplicate)

**Active Infrastructure State:**
* **Calendar webhooks** (NOT Gmail):
  - `calendar_channel_id`: `cal-8679c8eb-725e-48b3-930a-f35bbbf3b2c2-1768140484702`
  - `calendar_webhook_expires`: `1768745285000`
* **Gmail**: Polling only (no webhooks, no push)

---

### Sprint A2 — Universal Ingest Entry Point
> *"All future triggers call the same ingest path."*

* **Work Items:**
  * Create single `runIngestIfNeeded()` function
  * Refactor all call sites to use it

### Sprint A3 — User-triggered Ingest (Pixel + CTA)
> *"User interaction keeps inbox fresh."*

* **Work Items:**
  * Add pixel endpoint and manual refresh link
  * Both call the same ingest entry point
* **Acceptance Test:** Opening email or clicking CTA triggers ingest exactly once

* ✅ **Epic A DONE** when Gmail webhooks are gone, polling works, and nothing breaks.

---

## 🤝 EPIC B: Deal State You Can Trust

**Goal:** System thinking is visible, correctable, and stable.

### Sprint B1 — Summary Pipeline Finalization
* **Work:** `summary_text` as first-class cache; single renderer from `summary_json`.

### Sprint B2 — Confidence & Uncertainty
* **Work:** Similarity thresholds; compute and store confidence levels.

### Sprint B3 — Manual Deal Override
* **Work:** Implement "move to another deal"; re-run summary + actions after move.

---

## ⚡ EPIC C: Actions as the Only Control Surface

**Goal:** Assistance feels powerful but never out of control.

### Sprint C1 — Action Model Lockdown
* **Work:** Add `type`, `urgency`, `batchable`; remove hard caps.

### Sprint C2 — Action Lifecycle (Minimal)
* **Work:** Implement **Approve / Snooze / Dismiss**; simple urgency escalation.

### Sprint C3 — Calendar Proposals (MVP Only)
* **Work:** Detect meeting intent; propose 1–3 exact times; soft travel warnings.

---
