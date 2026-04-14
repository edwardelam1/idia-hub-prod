

# Give Best Friend AI Full Staged Table Visibility

## Problem
The frontend currently fetches only 50 records with a subset of columns from each staged table. The edge function then only summarizes aggregates, losing granularity. The AI needs the full picture.

## Plan

### 1. Update `BestFriendPage.tsx` — Fetch all columns, increase limit
- **staged_health_data**: Change `.select(...)` to `.select("*")` and increase `.limit(50)` to `.limit(500)` (covers all 219 records with headroom)
- **staged_lifestyle_data**: Same — `.select("*")` and `.limit(500)` (covers all 136 records)
- Remove the narrow column lists so the AI receives every field (vitals, sleep, nutrition, clinical, body composition, etc.)

### 2. Update `best-friend-ai` Edge Function — Raw Data Auditor mode
Replace the current aggregation-only approach with the user's provided logic:

- **Inject full record arrays** into the system prompt as structured JSON (not just averages)
- **Calculate audit metrics** server-side: total samples, HR baseline, max HR, step volume, session count, avg quality score
- **Biometric Cost Analysis**: Map lifestyle events with their durations, quality scores, and activity contexts
- **New system prompt** for Data Scientist mode becomes the "IDIA Raw Data Auditor" persona that performs direct table analysis, Work Load Biometric Cost calculation, and Personal Alpha readiness assessment
- Keep the Store Clerk persona unchanged for non-marketplace queries
- Retain CORS headers, conversation history, error handling, and the existing response format
- Keep `gpt-4o-mini` model (the user's snippet uses `gpt-4-turbo-preview` but that's more expensive; will use `gpt-4o-mini` unless you prefer otherwise)
- Lower temperature to `0.3` for more deterministic analysis (compromise between current 0.7 and user's 0.1)

### 3. Token Budget Consideration
355 total records × ~20 fields each could push prompt size. The edge function will serialize records as compact JSON (no pretty-printing) and cap at the first 200 records per table if the combined payload exceeds ~80KB, to stay within the 128K context window of gpt-4o-mini.

## Files Changed
- `src/pages/BestFriendPage.tsx` — widen select columns and raise limits
- `supabase/functions/best-friend-ai/index.ts` — new Raw Data Auditor prompt with full record injection and audit metrics

