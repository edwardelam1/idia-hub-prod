## Primary Objective
Wire `location_string` from the Client UI → `best-friend-ai` → `synapse-controller` → `idia-circular-settlement`. The PHASE_2 stall is caused by `synapse-controller` defaulting to `"global"` whenever the caller omits a location. The fix is to thread the user's real location through the pipeline.

## Step 1 — Frontend: `src/pages/BestFriendPage.tsx`

In `handleSendMessage`:

- Extend the profile query to include `location`:
  ```ts
  console.info(`[BEGIN: UI.BestFriend.ProfileFetch] Fetching profile context for user ${user.id}`);
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("platform_guid, location")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile?.platform_guid) {
    console.info(`[BEGIN: UI.BestFriend.ProfileFetch.Stall] Failed to resolve identity.`);
    throw new Error("Identity resolution failure.");
  }
  console.info(`[END: UI.BestFriend.ProfileFetch] Resolved platform_guid: ${profile.platform_guid}, location: ${profile.location}`);
  ```
- Inject `location_string` into the invoke payload's `context`:
  ```ts
  context: {
    isMarketplaceMode: marketplaceMode,
    platformGuid: profile.platform_guid,
    userId: user.id,
    location_string: profile.location,
    marketplace: marketplaceMode ? { healthRecords: realPipelineData, lifestyleRecords: [] } : null,
  },
  ```

## Step 2 — Edge: `supabase/functions/best-friend-ai/index.ts`

A. Extend `requestSchema.context` (around line 100) with:
```ts
location_string: z.string().optional(),
```
All existing keys stay intact.

B. Inside the `[BEGIN: BestFriendAI.ReceiptTransmission.Fetch]` block (~line 530), add `location_string` to the JSON body posted to `synapse-controller`:
```ts
body: JSON.stringify({
  user_id: operatorId,
  client_id: client_id || "IDIA_HUB_APP",
  aca_record_ids: consumedReceipt,
  intent_type: "MARKETPLACE RESEARCH",
  location_string: context?.location_string,
  granularity: 0.95,
  relevance: 1.0,
  timeliness: 1.0,
  completeness: 1.0,
  origin_fidelity: 1.0,
}),
```

**Hard constraint:** Do not remove or rewrite any existing `[BEGIN: …]` / `[END: …]` / `[STATUS: …]` / `[CRITICAL FAILURE: …]` log lines. Telemetry stays exactly as-is — only the schema entry and the body field are added.

## Step 3 — Secondary cleanup (carried from prior plan)

After the wire-through is verified, finish the previously approved cleanups:

1. **Legacy module removal**: delete `supabase/functions/_shared/charge-usdc.ts`, remove the `@shared/charge-usdc` entry from `supabase/functions/import_map.json`, and migrate `supabase/functions/top-up-credits/index.ts` off `chargeBuyerUsdc`. Open question still standing: replace the pull with (A) inbound-transfer verification or (B) inline the relayer pull. Awaiting your choice before touching `top-up-credits`.
2. **PHASE_2 resilience in `idia-circular-settlement`**: wrap `getPoolByLocation` in try/catch so a missing/unseeded location key falls back cleanly to `GLOBAL_WAR_CHEST` instead of fatally stalling settlement. This is a belt-and-suspenders complement to the wire-through — once Step 1+2 land, real regions like `"US-CA"` will be passed and the registry lookup should succeed; the try/catch only protects against unseeded keys.

## Verification

- Trigger a Best Friend marketplace query.
- Confirm logs show:
  - `[END: UI.BestFriend.ProfileFetch] … location: <real value>`
  - `synapse-controller` receives the non-`"global"` `location_string`
  - `idia-circular-settlement` resolves `Registry.getPoolByLocation` against the real key without stalling at `PHASE_2_REGIONAL_ROUTING`.

## Files touched
- `src/pages/BestFriendPage.tsx`
- `supabase/functions/best-friend-ai/index.ts`
- (Step 3) `supabase/functions/idia-circular-settlement/index.ts`, `supabase/functions/top-up-credits/index.ts`, `supabase/functions/import_map.json`, deletion of `supabase/functions/_shared/charge-usdc.ts`