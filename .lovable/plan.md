## Fix Wix return-to-app 404 after A La Carte / Tier purchase

### Root cause

`SynapsePurchaseModal.tsx` (the Wix branch, lines 131–150) was never updated to the direct-fetch handoff that `UniversalPurchaseScreen` uses. It currently builds a raw query string and sends users to:

```
https://www.thebigidia.com/idia-checkout?uid=...&amt=...&cr=...&idem=...
```

There is **no `paymentId`** (Wix's idia-checkout page expects one) and **no `returnUrl`**. After Wix finishes, it has nowhere to send the user inside the Hub, so the browser ends up on a route the Hub does not serve → 404. There is also no Hub-side receipt page wired to handle the return.

### Change

1. Replace the Wix branch in `src/components/billing/SynapsePurchaseModal.tsx` (lines ~131-150) with the same POST + redirect pattern already proven in `UniversalPurchaseScreen.handlePurchase`:

   ```text
   POST https://www.thebigidia.com/_functions/checkout
   body: {
     amount: usdAmount,
     credits: Math.floor(displayCredits),
     userId: session.user.id,
     planId: "alacarte",
     type: "alacarte",
     idempotency_key: <uuid>      // preserved for settlement safety
   }
   → { paymentId }
   redirect →
     https://www.thebigidia.com/idia-checkout
       ?paymentId=<paymentId>
       &returnUrl=<encoded ${window.location.origin}/purchase?success=true>
   ```

   Keep all `[WIX_HANDOFF]` / `[WIX_DIRECT]` logging tags and the existing error → toast → `setStep("payment")` recovery.

2. The `returnUrl` points at `/purchase?success=true`, which is already routed to `UniversalPurchaseScreen` in `src/pages/Index.tsx`. That screen already:
   - Detects `searchParams.get("success") === "true"`
   - Sets `step = "success"`
   - Renders the confirmation/receipt panel ("Plan Activated", credits minted, Go to Billing CTA)

   So the receipt experience is reused as-is — no new page needed.

3. No changes to the USDC branch, the modal UI, the `top-up-credits` edge function, or `create-wix-payment` (that legacy function is unused after this and can be cleaned up separately).

### Files

- `src/components/billing/SynapsePurchaseModal.tsx` — rewrite the Wix branch only.

### Out of scope

- Persisting receipts/transaction history into the ledger UI (current success page is the receipt). If a richer per-purchase receipt page is wanted on `/billing`, that should be a follow-up.
