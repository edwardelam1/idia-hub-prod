# Saved Searches activity history and mobile egress redesign

## Goal
Turn **Saved Searches** into the unified, user-scoped record of saved work and paid data activity from:
- Trading Desk tools, including SQL, API, MCP, and feature-feed consumption
- Best Friend AI
- Data Marketplace purchases, including custom stream selections

Every activity line will retain its full input and returned result, show the matching Liability Shield receipt details, and link directly to that exact egress record.

## Build

### 1. Create a durable activity record
- Add a user-owned activity history table for source, action, title, full input, full result, status, records consumed, Synapse Credit cost, timestamps, and the linked egress-log/ledger identifiers.
- Add explicit authenticated/service-role grants and row-level rules so users only see their own history.
- Add indexes for user/date, source/date, and egress lookup.
- Keep PII and credentials out of stored payloads; retain the complete app-visible query/prompt/selection and response.

### 2. Capture every paid activity at its source
- Trading Desk: persist SQL and every other receipt-producing API, MCP, or feature-feed action with its returned output.
- Best Friend AI: persist each user prompt and complete assistant result, linked to the receipt returned by Synapse; use the existing chat tables only where their current shape is useful, with the unified activity row remaining the cross-tool index.
- Marketplace: persist purchased bundle title, selected streams, source-record count, server-confirmed cost, and checkout result.
- Make writes idempotent so retries cannot create duplicate history lines.
- Preserve existing egress and ledger behavior; history capture must not weaken or replace Liability Shield settlement.

### 3. Replace the Saved Searches placeholder
- Build a real `/saved-searches` page with compact source tabs/filters for **All**, **Trading Desk**, **Best Friend AI**, and **Marketplace**.
- Combine reusable saved items (including saved SQL searches) with chronological activity without inventing historical content.
- Each activity row will show source, title/input preview, status, date, records, cost, and a clear receipt action.
- Expanding a row reveals the full input and full result with copy controls.
- Existing egress receipts that predate activity capture will appear as receipt-only history; unavailable old prompts/results will be labelled unavailable rather than reconstructed.
- Add loading, empty, error, search, and pagination states suitable for a production history page.

### 4. Make receipt links exact
- Link every history item to `/egress-logs?receipt=<egress-id>`.
- Update Egress Logs to read deep-link parameters, locate the exact record, keep it visible, and visually identify it.
- Retain hash search support for links already emitted by Best Friend AI.

### 5. Remodel Egress Logs for mobile
- Replace the six-column mobile table with a full-width, edge-to-edge compact list; keep the data table for larger screens.
- Remove outer card/list padding on phones and use thin separators, subtle alternating surface treatment, and tight vertical rhythm instead of nested cards.
- Keep all six current values visible per record: timestamp, type, Liability Shield token, ACA references, DigiRAMP anchor, and credits spent.
- Use a dense two-column label/value grid, controlled wrapping, and icon-only copy actions with accessible labels and stable tap targets.
- Compress search, type, sort, result count, loading, and empty states into the phone viewport without horizontal scrolling.

## Technical details
- Database changes will be applied through an approved migration with grants before RLS policies.
- The activity record will reference `egress_logs.id` and `synapse_credit_ledger.id`; links will not depend on truncated hashes.
- Current `egress_logs` access is already user-scoped by `user_id = auth.uid()` and will remain so.
- Realtime updates will remain inside an effect with channel cleanup.
- Activity payloads will be bounded and validated server-side while preserving the full user-visible input/result.

## Verification
- Verify new SQL, Best Friend, Marketplace, API/MCP/feed activity creates one history line and one working receipt link.
- Verify retries do not duplicate entries and users cannot read another user's history.
- Verify old receipt-only rows remain understandable.
- Test Egress Logs at mobile and desktop widths for no horizontal overflow, complete field visibility, copy actions, filters, and exact receipt deep links.
