Understood—I've corrected the roadmap to specify **Gmail Webhooks** for removal and updated the Infrastructure State to reflect the Gmail-specific channel ID you provided.

---

## 🏗️ EPIC A: Safe Ingestion Core

**Goal:** Inbox sync is boring, predictable, and impossible to corrupt.

### Sprint A1 — Ingest Hardening

> *“Ingest never duplicates or regresses state.”*

* **Completed Work Items:**
* ✅ **Cursor Persistence:** Implemented read/write for `users.settings.gmail_watch_history_id`.
* ✅ **Idempotency Guards:** Duplicate detection for `universal_message_id` and unique indexing on `(user_id, primary_identifier)`.
* ✅ **Structured Logging:** Integrated logs for `ingest_start`, `ingest_end`, and `ingest_skip`.
* ✅ **Atomic Cursor Update:** Created `update_gmail_history_id()` RPC function to prevent JSONB race conditions.


* **Acceptance Test:** * ✅ **Success:** 5× triggers result in same DB state; position persists; no duplicate CPs.

### Sprint A2 — Universal Ingest Entry Point

> *“All future triggers call the same ingest path.”*

* **Work Items:**
* Create a single `runIngestIfNeeded()` function.
* Refactor call sites only to use it.


* **Active Gmail Infrastructure State:**
* `gmail_channel_id`: `cal-8679c8eb-725e-48b3-930a-f35bbbf3b2c2-1768140484702`
* `gmail_webhook_expires`: `1768745285000`



### Sprint A3 — User-triggered Ingest (Pixel + CTA)

> *“User interaction keeps inbox fresh.”*

* **Work Items:**
* Add pixel endpoint and manual refresh link.
* Both call the same ingest entry point.


* **Acceptance Test:** Opening email or clicking CTA triggers ingest exactly once.
* ✅ **Epic A DONE** when **Gmail webhooks** are gone and nothing breaks.

---

## 🤝 EPIC B: Deal State You Can Trust

**Goal:** System thinking is visible, correctable, and stable.

### Sprint B1 — Summary Pipeline Finalization

* **Work:** `summary_text` as first-class cache; single renderer from `summary_json`.

### Sprint B2 — Confidence & Uncertainty

* **Work:** Similarity thresholds; compute and store confidence levels.

### Sprint B3 — Manual Deal Override

* **Work:** Implement “move to another deal”; re-run summary + actions after move.

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

**Should I draft the logic for the `runIngestIfNeeded()` refactor for Sprint A2 next?**
