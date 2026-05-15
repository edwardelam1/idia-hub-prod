## Refactor SynapsePurchaseModal Wix flow to direct Wix call

The Wix branch in `src/components/billing/SynapsePurchaseModal.tsx` (lines 135-173) still routes through the `create-wix-payment` Supabase Edge Function. This contradicts the direct-to-Wix pattern already implemented in `UniversalPurchaseScreen.tsx`.

### Change

Replace the `supabase.functions.invoke("create-wix-payment", ...)` block with a direct `fetch` to `https://www.thebigidia.com/_functions/checkout`, mirroring `UniversalPurchaseScreen`:

```text
POST https://www.thebigidia.com/_functions/checkout
body: { amount: usdAmount, credits: displayCredits, userId: session.user.id, planId: "alacarte", type: "alacarte" }
→ { paymentId }
redirect → https://www.thebigidia.com/idia-checkout?paymentId=...&returnUrl=<origin>/billing?success=true
```

Keep the idempotency_key in the POST body for settlement safety. Preserve all existing logging tags (`[WIX_HANDOFF]`) and the error/toast handling. The USDC branch and the rest of the modal remain untouched.

### Files

- `src/components/billing/SynapsePurchaseModal.tsx` — replace lines ~135-173 with direct Wix fetch + redirect.

No edge function or backend changes. No deletion of `create-wix-payment` (that can be a separate cleanup once verified).
