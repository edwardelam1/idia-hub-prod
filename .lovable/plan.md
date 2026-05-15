## Goal

Refactor `UniversalPurchaseScreen.handlePurchase` to talk directly to the Wix `/_functions/checkout` HTTP endpoint and redirect the user to the Wix-hosted checkout page. The `create-wix-payment` Supabase Edge Function (currently throwing `Wix API rejection: Not Found / Internal Server Error`) is removed from the React circuit.

## Changes

### `src/components/billing/UniversalPurchaseScreen.tsx`

Replace the `supabase.functions.invoke("create-wix-payment", …)` block in `handlePurchase` with a direct `fetch` to Wix:

```ts
const WIX_DOMAIN = "https://www.thebigidia.com";
const returnUrl = encodeURIComponent(`${window.location.origin}/billing?success=true`);

const wixResponse = await fetch(`${WIX_DOMAIN}/_functions/checkout`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    amount: plan.price,
    credits: plan.credits,
    userId,
    planId: plan.id,
    type: "subscription",
  }),
});

if (!wixResponse.ok) throw new Error(`Wix checkout failed: ${wixResponse.status}`);
const wixData = await wixResponse.json();
if (!wixData.paymentId) throw new Error("Failed to get payment ID from Wix");

window.location.href = `${WIX_DOMAIN}/idia-checkout?paymentId=${wixData.paymentId}&returnUrl=${returnUrl}`;
```

Keep all other logic intact:
- `step` state machine (`review` → `processing` → `success`)
- `isSuccessReturn` detection of `?success=true` (still triggered when Wix redirects back to `/billing?success=true`; no behavior change here since the success screen is gated by route + query — note the success-state UI lives on `/purchase`, but the user-confirmed redirect target is `/billing`, so settlement confirmation is now handled by the Billing page's existing flow)
- Error handling with `toast.error` and `setStep("review")`
- All existing `[START]`/`[SUCCESS]`/`[FAILED]` console log markers, retargeted from `WIX_HANDOFF` (Edge Function) to `WIX_DIRECT`

### Untouched

- `supabase/functions/create-wix-payment/*` — left in place but no longer invoked from this screen. Not deleted in case other surfaces reference it.
- All other billing components, payload shapes, UI, and styling.

## Prerequisites (Wix side, outside this codebase)

The Wix site at `https://www.thebigidia.com` must:

1. Expose `POST /_functions/checkout` returning `{ paymentId: string }`.
2. Send CORS headers permitting the Lovable preview origin and `https://hub.thebigidia.com`:
   - `Access-Control-Allow-Origin: *` (or explicit origins)
   - `Access-Control-Allow-Methods: POST, OPTIONS`
   - `Access-Control-Allow-Headers: Content-Type`
3. Honor `returnUrl` on `/idia-checkout` and redirect back to `${origin}/billing?success=true` after a completed payment.

If CORS is not configured on the Wix endpoint, the browser will block the request. That is a Wix-side configuration task, not a code change here.
