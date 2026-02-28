

# IDIA Hub: Supabase to AWS Migration - Frontend Architecture Plan

## Overview
Migrate the IDIA Hub React frontend away from Supabase by removing all Supabase client imports, creating a mock authentication context, building a standard API fetch wrapper, and updating navigation to reflect the new ecosystem routes.

---

## 1. Create Mock Authentication Context

**New file: `src/contexts/AuthContext.tsx`**

- Create a React Context with a hardcoded enterprise user session:
  - `user_id`: "mock-ent-9921"
  - `role`: "enterprise_admin"
  - `account_status`: "DELT_AUTHORIZED"
- Expose a `useAuth()` hook for components to read user state (e.g., Best Friend AI, DELT modals can gate features on `account_status`).
- Include `login()`, `logout()`, and `isAuthenticated` for future real auth integration.
- Wrap the app with `<AuthProvider>` in `src/App.tsx`.

---

## 2. Create Standard API Fetch Wrapper

**New file: `src/lib/api.ts`**

- Build a `fetchApi()` wrapper around native `fetch()` that:
  - Reads `VITE_API_BASE_URL` from environment (falls back to empty string).
  - Attaches a Bearer token from `localStorage` (`idia_auth_token`).
  - Returns JSON with proper error handling.
- Add mock endpoint handlers with 800ms simulated latency for:
  - `/api/v1/synapse/balance` -- returns Synapse credit balance (1250.00 CRD).
  - `/api/v1/aca/verify` -- returns ACA verification status.
  - `/api/v1/health/metrics` -- returns mock health metrics count.
  - `/api/v1/security/events` -- returns mock security event data.
  - `/api/v1/delt/transfer` -- returns mock liability token response.
  - `/api/v1/best-friend/chat` -- returns mock AI chat response.
- When `API_BASE_URL` is empty (current state), the wrapper intercepts calls and returns mock data. When a real URL is configured, it passes through to the real backend.

---

## 3. Remove Supabase Dependencies from Components

**Files to update** (12 files with direct Supabase imports):

| File | Change |
|------|--------|
| `src/integrations/supabase/client.ts` | Delete or empty out |
| `src/hooks/useSystemHealth.tsx` | Replace `supabase` calls with `fetchApi()` |
| `src/hooks/useBundleData.tsx` | Replace with `fetchApi()` |
| `src/hooks/usePipelineActivity.tsx` | Replace with `fetchApi()` |
| `src/hooks/useSecurityEvents.tsx` | Replace with `fetchApi()` |
| `src/hooks/useHealthMetrics.tsx` | Replace with `fetchApi()` |
| `src/hooks/useMarketplaceBundles.tsx` | Replace with `fetchApi()` |
| `src/hooks/useDataGeneration.tsx` | Replace with `fetchApi()` |
| `src/components/health/HealthDataInput.tsx` | Replace with `fetchApi()` |
| `src/components/health/PipelineMonitor.tsx` | Replace with `fetchApi()` |
| `src/components/health/HealthDataProcessor.tsx` | Replace with `fetchApi()` |
| `src/components/health/PipelineRecovery.tsx` | Replace with `fetchApi()` |
| `src/components/dashboards/SuperAdminDashboard.tsx` | Replace with `fetchApi()` |

**Components with hardcoded Supabase REST URLs** (inline `fetch()` calls):

| File | Change |
|------|--------|
| `src/components/ai/FloatingBestFriend.tsx` | Replace all `fetch('https://zxyngqciipcvveigrzqt.supabase.co/...')` calls with `fetchApi()` |
| `src/components/ai/BestFriendChat.tsx` | Replace Supabase edge function URL with `fetchApi('/api/v1/best-friend/chat')` |

**Update `src/contexts/SynapseCreditsContext.tsx`**:
- Replace the mock fetch with `fetchApi('/api/v1/synapse/balance')` to centralize all API calls through the new wrapper.

---

## 4. Update Navigation and Layout

**Update `src/components/layout/AppSidebar.tsx`**:
- Add four new navigation routes to the sidebar (for all roles, or enterprise_admin at minimum):
  - "Best Friend AI (Data Discovery)" -> `/best-friend`
  - "Synapse Ledger (Billing/Top-Up)" -> `/billing` (existing route, rename label)
  - "Egress Logs (Provenance)" -> `/egress-logs`
  - "Ecosystem Auth Settings" -> `/auth-settings`

**Update `src/pages/Index.tsx`**:
- Add route entries for `/egress-logs` and `/auth-settings` (placeholder pages).
- Wrap with `AuthProvider`.
- Inject `useAuth()` into the layout to conditionally render features based on `account_status`.

**Update `src/components/layout/AppLayout.tsx`**:
- Consume `useAuth()` and pass `account_status` down to child components that need gating.

---

## 5. Wire Up AuthContext for UI Gating

- In `FloatingBestFriend.tsx`: use `useAuth()` to check `account_status === 'DELT_AUTHORIZED'` before showing DELT-related alerts.
- In `DELTSimulationModal.tsx`: use `useAuth()` to conditionally enable the "Run DELT Simulation" button only when `account_status` is `DELT_AUTHORIZED`.

---

## Technical Notes

- The `@supabase/supabase-js` package will remain in `package.json` for now (no breaking removal) but will no longer be imported anywhere. It can be uninstalled in a follow-up.
- All mock responses in `api.ts` are designed to be swapped with real AWS API Gateway endpoints by simply setting `VITE_API_BASE_URL` in the environment.
- The `SynapseCreditsContext` continues to function identically but routes through the centralized `fetchApi` wrapper.
- Edge functions (`supabase/functions/`) are untouched in this frontend migration -- they will be migrated separately to AWS Lambda.

