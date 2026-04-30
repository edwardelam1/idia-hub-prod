# Wrap real POSModule with omni-vertical chassis

## Source of truth

The real `POSModule.tsx` you just pasted is now the baseline. Lovable's current on-disk copy is a stripped placeholder and will be **fully replaced** with the version you pasted, then modified per your 7 steps. Nothing in the data/cart/payment layer will be invented or altered.

## What gets preserved verbatim

- All imports you pasted (toast, supabase, `getBusinessId`, `LiveCheckout`, `recordPosTransaction`, `MenuItem`/`CartItem` interfaces).
- All state: `cart`, `searchTerm`, `selectedCategory`, `customerInfo`, `isCheckoutOpen`, `isNfcPaymentOpen`, `isGiftCardOpen`, `isLiveCheckoutOpen`, `giftCardData`, `isProcessingPayment`, `notifications`, `cartNotification`, `menuItems`, `categories`.
- All effects: `loadMenuItems` on mount, real-time `merchant-notifications` subscription.
- All handlers: `loadMenuItems`, `addToCart`, `removeFromCart`, `updateQuantity`, `calculateTotal`, `calculateTax`, `calculateGrandTotal`, `handleCheckout`, `processPayment` (incl. terminal-payment edge call), `processNfcPayment`, `processGiftCardPayment`.
- The Mobile Cart Toggle Button.
- The Desktop Cart Sidebar (header, scrollable items, summary, Live + Standard Checkout buttons).
- All 4 dialogs: Checkout, NFC Payment, Gift Card, Live Checkout.

## The 7 changes (additive only)

1. **Imports** — add `Activity, Flame, Radio, Server, Clock` to the existing `lucide-react` import line. (`AlertCircle`, `Users`, and `Zap` are already imported in your paste.)

2. **Component signature** — add the props interface and accept `activeBites`:
   ```ts
   interface POSModuleProps {
     activeBites?: string[];
   }
   export const POSModule = ({ activeBites = [] }: POSModuleProps) => {
   ```

3. **Dynamic state** — declare immediately after the opening brace, **above** the existing `useState` calls:
   ```ts
   const hasSpatialFlow = activeBites.includes('hosp.ops.guest_flow_tracking');
   const hasKitchenTelemetry = activeBites.includes('hosp.ops.kitchen_telemetry');
   const hasQSRLineSpeed = activeBites.includes('qsr.ops.line');
   const hasBoutiqueConsult = activeBites.includes('retail.boutique.ops.consult');
   const [activeView, setActiveView] = useState<"pos" | "spatial" | "kds">("pos");
   ```

4. **Inject telemetry header + nav** — directly inside `<div className="flex-1 flex flex-col p-2 min-h-0 overflow-hidden pb-20 md:pb-0">` (the Menu Items Section wrapper), at the very top, before the existing `<Card>` that holds "Point of Sale" + search + category filter. Inserts the 4-card telemetry grid and the 3-button view switcher exactly as you specified.

5. **Wrap existing POS view** — wrap the existing **Point-of-Sale `<Card>`** (title + search + category filter) **and** the existing **Menu Grid scrollable area** (`filteredItems.map`) together in:
   ```tsx
   {activeView === "pos" && (
     <>
       {/* existing Card + existing Menu Grid */}
     </>
   )}
   ```
   Nothing inside is renamed, reordered, or restyled.

6. **Append Spatial Matrix + Autonomic KDS views** — after the `activeView === "pos"` block (still inside the same Menu Items Section wrapper), paste the two new view blocks exactly as you supplied them.

7. **Untouched** — Mobile Cart Toggle, Desktop Cart Sidebar, Checkout Dialog, NFC Payment Dialog, Gift Card Dialog, Live Checkout Dialog all remain byte-identical to your paste.

## Files changed

- `src/components/modules/POSModule.tsx` — replaced with your pasted version + the 6 additive edits above. No other file touched.

## Risks / call-outs

- Your paste references `@/lib/business-access` (`getBusinessId`) and `@/hooks/use-pos-data` (`recordPosTransaction`). I'll verify both exist on disk before writing. If either is missing in this Lovable project, I'll stop and tell you — I will **not** stub them.
- Your paste also calls edge functions `process-terminal-payment`, `process-nfc-payment`, `redeem-gift-card`. I'll verify they exist under `supabase/functions/`. If any are missing, I'll flag it — not stub it.
- The JSX in your paste has some lines where attribute values appear stripped (e.g. `<Badge variant=` with nothing after). I'll restore the obvious idiomatic values (`variant="secondary"`, etc.) only where the chat formatting clearly truncated them, and I'll list every such restoration at the end so you can review. If there's any line where intent is genuinely ambiguous, I'll pause and ask rather than guess.
