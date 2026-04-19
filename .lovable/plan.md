

## Plan: Make Best Friend AI cite the Library (honesty mode)

Modify `supabase/functions/best-friend-ai/index.ts` to remove the suppression layer and force citation of `aca_hash_key` / data categories from the staged tables.

### Changes

**1. Replace `ORCHESTRATOR_PROMPT` (lines ~109-117)**

```ts
const ORCHESTRATOR_PROMPT = `You are the IDIA Hub Analyst speaking from the Library of Data.

CITATION RULES (MANDATORY):
- Every quantitative claim must cite its source. Use the format [src: <table>:<aca_hash_key prefix 8 chars>] or [src: <table> n=<count>].
- When summarizing aggregates, cite the row count and table, e.g. "average HR 72 bpm [src: staged_health_data n=277]".
- If a metric is not present in the attached Library payload, say "not in Library" — do not infer.
- Reference data_category and activity_type fields verbatim when relevant.

Language rules:
- Plain vocabulary, no hype.
- Brief, but never omit a citation to save space.
- Numbers first, then the citation, then the trend.`;
```

**2. Replace `STORE_CLERK_PERSONA` (lines ~119-123)**

```ts
const STORE_CLERK_PERSONA = `You are Best Friend, the IDIA Hub guide with read access to the Library of Data summary.

You may answer questions about what data exists in the user's Library (counts, categories, last sync) by citing the attached summary.
For raw row inspection or research-grade analysis, recommend Marketplace Mode.
When you cite a number, append [src: <table> n=<count>] so the user knows it came from the Library, not a guess.
Keep it warm, plain, and brief — but always cite.`;
```

Then in the `serve` handler, when building the Store Clerk prompt, attach a lightweight Library summary so it has something to cite even outside Marketplace Mode. Update the `else` branch (around line 320):

```ts
} else {
  // Even in navigation mode, give the clerk the Library summary so it can answer "what's in my data?" honestly.
  const navSummary = (healthMetrics.length || lifestyleEvents.length)
    ? `\n\nLIBRARY SNAPSHOT:\n${JSON.stringify(summarizeMarketplaceData(healthMetrics, lifestyleEvents))}`
    : "\n\nLIBRARY SNAPSHOT: empty or not loaded for this session.";
  systemPrompt = STORE_CLERK_PERSONA + navSummary;
}
```

And lift the omni-fetch gate so it also runs in navigation mode (change `if (isDataScientistMode && pseudoId ...)` to `if (pseudoId && ...)`).

**3. Activate `runVerificationLoop` (lines ~257-259)**

Replace the pass-through with a real cross-check against the Library payload:

```ts
function runVerificationLoop(
  draft: string,
  healthRecords: any[],
  lifestyleRecords: any[],
): VerificationResult {
  const issues: string[] = [];
  const totalRows = healthRecords.length + lifestyleRecords.length;

  // Check 1: any number-bearing sentence must carry a [src: ...] citation
  const numericSentences = splitIntoSentences(draft).filter((s) => /\d/.test(s));
  const uncited = numericSentences.filter((s) => !/\[src:\s*[^\]]+\]/i.test(s));
  if (uncited.length > 0) {
    issues.push(`uncited_numeric_claims:${uncited.length}`);
  }

  // Check 2: if the draft cites a row count, it must match the Library
  const countMatch = draft.match(/n=(\d+)/);
  if (countMatch) {
    const claimed = Number(countMatch[1]);
    if (claimed !== healthRecords.length && claimed !== lifestyleRecords.length && claimed !== totalRows) {
      issues.push(`row_count_mismatch:claimed=${claimed},library_health=${healthRecords.length},library_lifestyle=${lifestyleRecords.length}`);
    }
  }

  // Check 3: forbid invented aca_hash_key prefixes
  const hashRefs = [...draft.matchAll(/\[src:\s*\w+:([a-f0-9]{6,})\]/gi)].map((m) => m[1].toLowerCase());
  if (hashRefs.length > 0) {
    const validHashes = new Set(
      [...healthRecords, ...lifestyleRecords]
        .map((r: any) => String(r.aca_hash_key || "").toLowerCase())
        .filter(Boolean),
    );
    const fabricated = hashRefs.filter((prefix) => ![...validHashes].some((h) => h.startsWith(prefix)));
    if (fabricated.length > 0) {
      issues.push(`fabricated_hashes:${fabricated.join(",")}`);
    }
  }

  // Append a transparency footer so the user sees the verification result
  const footer = issues.length === 0
    ? `\n\n_Library check: passed (${totalRows} rows referenced)._`
    : `\n\n_Library check flagged: ${issues.join("; ")}._`;

  return { text: draft + footer, issues };
}
```

Update the call site (line ~376) to pass the records:
```ts
const verification = runVerificationLoop(draftResponse, healthMetrics, lifestyleEvents);
```

**4. Soften `applyLinguisticGovernance` (lines ~125-134)**

Keep the banned-hype wordlist but stop flattening punctuation — semicolons and em-dashes carry list/citation structure:

```ts
function applyLinguisticGovernance(text: string): string {
  let cleaned = text;
  for (const phrase of BANNED_WORDS) {
    const re = new RegExp(phrase, "gi");
    cleaned = cleaned.replace(re, "");
  }
  // Preserve ; and — so cited lists and dashed clauses survive.
  cleaned = cleaned.replace(/ {2,}/g, " ").trim();
  return cleaned;
}
```

### Files Modified
- `supabase/functions/best-friend-ai/index.ts` — prompt blocks, verification loop, linguistic governance, Store Clerk Library injection, omni-fetch gate.

### Outcome
- AI must cite `[src: <table> n=<count>]` or `[src: <table>:<hash-prefix>]` on every numeric claim.
- Drafts get audited against the actual Library payload; mismatches and fabricated hashes appear in `verificationIssues` and as a footer.
- Store Clerk mode now sees a Library snapshot and can answer "what's in my data?" honestly instead of punting.
- Punctuation no longer flattened, so cited lists render cleanly.

