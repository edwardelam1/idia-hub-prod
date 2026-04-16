

# Replace Identity Resolution with `life-pii-bridge`

## Problem
The `handleSendMessage` function currently resolves the user's `platform_guid` by making two separate client-side calls: `supabase.auth.getUser()` then querying the `profiles` table. The user wants to replace this with a single call to the `life-pii-bridge` Edge Function, which already returns `platform_guid` from the server side.

## Change

**`src/pages/BestFriendPage.tsx`** — Replace lines 44–56 (the identity grab block) with:

```typescript
      // 1. DYNAMIC IDENTITY GRAB via PII Bridge
      const { data: identity, error: identityError } = await supabase.functions.invoke('life-pii-bridge', {
        body: { action: 'RESOLVE_GUID' },
      });
      if (identityError || !identity?.platform_guid) {
        throw new Error("Identity resolution failure: No platform_guid.");
      }
      const activeGuid = identity.platform_guid;
```

This replaces:
- The `supabase.auth.getUser()` call
- The `profiles` table query
- The manual `activeGuid` derivation

Everything downstream (`activeGuid` usage in warehouse grab, synapse-controller, and best-friend-ai) remains unchanged since `activeGuid` is still a `string`.

## Note on `life-pii-bridge`
The edge function already handles JWT auth via the `Authorization` header (auto-sent by `supabase.functions.invoke`), fetches the profile row server-side, and returns `platform_guid`. The `body: { action: 'RESOLVE_GUID' }` is informational — the function ignores the body and always returns the GUID. No edge function changes needed.

