

# Fix Build Error + Implement Tier-Based Route Guards

## Part 1: Fix Build Error (Critical)

**File: `src/contexts/AuthContext.tsx`**

- **Line 99**: Change `"avatar_url, account_type, display_name"` to `"avatar_url, account_type"`
- **Lines 103-111**: Remove the strict policy enforcement block that checks `display_name` (column no longer exists after Zero-PII migration)
- **Line 113**: Will now type-check correctly against `ProfileData`

## Part 2: Add `subscriptionTier` to AuthContext

**File: `src/contexts/AuthContext.tsx`**

- Add `SubscriptionTier` type export: `'none' | 'base' | 'analyst' | 'professional' | 'enterprise'`
- Add `subscriptionTier` to `AuthContextType` interface and state (`useState<SubscriptionTier>('none')`)
- After fetching subscription (line ~127), derive tier: `pure_alpha`/`enterprise` → `'enterprise'`, missing sub → `'base'`, otherwise map directly
- Set `subscriptionTier` in mock login (super-admin → enterprise, others → base)
- Clear to `'none'` on logout
- Expose `subscriptionTier` in the Provider value

## Part 3: Create New Files

### `src/utils/tierLogic.ts`
- Export `SubscriptionTier` type and `hasRequiredTier()` function using weight comparison (none=0, base=1, analyst=2, professional=3, enterprise=4)

### `src/components/layout/FeatureLocked.tsx`
- Lock screen with icon, tier/business explanation text, and buttons to navigate to dashboard or `/billing` (upgrade) / `/compliance` (enroll business)

### `src/components/layout/ProtectedRoute.tsx`
- Accepts `requiredTier` and `requireBusiness` props
- Reads `subscriptionTier`, `isBusinessAccount`, `user.role` from `useAuth()`
- Super-admin bypasses all gates
- Renders `<FeatureLocked>` on failure, children on success

## Part 4: Wrap Routes in Index.tsx

**File: `src/pages/Index.tsx`**

Import `ProtectedRoute` and wrap routes per access matrix:

- **Base (no guard)**: `/dashboard`, `/settings`, `/best-friend`, `/onboarding`, `/purchase`, `/billing`, `/top-up`, `/earnings`, `/earnings/banking`
- **Analyst**: `/marketplace`, `/data-viewer/*`, `/my-reports`, `/saved-searches`, `/analytics`, `/my-lists`
- **Professional**: `/liquidity`, `/trading`, `/egress-logs`, `/system-health`, `/pay-blueprint`
- **Business required**: `/organizations`, `/teams`, `/ai-management`, `/compliance`, `/security`, `/auth-settings`

## Technical Details

Tier derivation logic:
```text
deriveTier(sub):
  no subscription → 'base'
  tier includes 'pure_alpha' or 'enterprise' → 'enterprise'
  tier matches known value → use directly
  fallback → 'base'
```

ProtectedRoute evaluation order:
```text
1. Super-admin? → bypass all
2. requireBusiness && !isBusinessAccount? → FeatureLocked(business)
3. !hasRequiredTier(userTier, requiredTier)? → FeatureLocked(tier)
4. Pass → render children
```

