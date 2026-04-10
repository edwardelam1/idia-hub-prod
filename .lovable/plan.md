

# Plan: Connect Auth, Profile, and Billing to Live Supabase Data

The root cause of all three issues is that `AuthContext` uses a hardcoded mock user (`mock-ent-9921`) instead of the actual Supabase auth session. This cascades everywhere: the profile shows fake names, the TopBar shows "Mike Davis", and billing queries find no subscription because they query with a fake user_id.

---

## Problem Summary

1. **AuthContext** hardcodes a mock user — never checks `supabase.auth.getSession()`
2. **SettingsProfile** hardcodes "John Smith" and "j.smith@acme-corp.io"
3. **TopBar** maps roles to hardcoded names ("Mike Davis", "Sarah Johnson", etc.)
4. **Billing** queries `user_subscriptions` with mock user_id, finds nothing, then falls back to "Professional $24,995/yr" — but the Subscription Tier card below shows "0 days remaining" because no real subscription was found
5. Eddie's real subscription tier is `pure_alpha` which isn't in PLAN_PRICING, so it also needs to be added

---

## Changes

### 1. `src/contexts/AuthContext.tsx` — Connect to Supabase Auth

- Import `supabase` client and add `useEffect` to call `supabase.auth.getSession()` on mount
- Subscribe to `onAuthStateChange` for session changes
- When a session exists, populate `user` from the Supabase session: `user_id` = `session.user.id`, email from `session.user.email`
- Fetch the user's profile from the `profiles` table to get `display_name`, `account_type`
- Fetch the user's subscription from `user_subscriptions` to determine role
- Expose `profile` data (display_name, email) on the context alongside the existing `user` object
- Keep the mock fallback for prototype quick-login (when no Supabase session exists and login() is called with overrides)
- Add `login` method to call `supabase.auth.signInWithPassword` for real auth
- Add `logout` to call `supabase.auth.signOut`
- Expose `profile: { first_name, last_name, email, display_name }` on context

### 2. `src/components/settings/SettingsProfile.tsx` — Pull from Live Data

- Read profile data from AuthContext instead of hardcoded strings
- Display `user.email` from Supabase auth session
- Display name from profile or auth metadata
- User ID from `user.user_id` (the real UUID)
- Account status from subscription or profile data

### 3. `src/components/layout/TopBar.tsx` — Pull Name from Auth

- Replace `getUserName()` hardcoded switch with profile data from AuthContext
- Replace `getOrganization()` with data from business_users/profiles or keep as fallback
- Show real initials from profile name

### 4. `src/components/LoginScreen.tsx` — Add Real Auth

- The "Sign In" button calls `supabase.auth.signInWithPassword` with the entered email/password
- On success, set the session which triggers AuthContext to populate
- Keep quick-access prototype buttons as mock mode fallback

### 5. `src/hooks/useBillingData.tsx` — Add `pure_alpha` Tier

- Add `pure_alpha` to `PLAN_PRICING` map so Eddie's subscription resolves correctly
- The subscription query will now work because it uses the real user UUID

### 6. `src/pages/Index.tsx` — Auth-Aware Routing

- Check Supabase session to determine if user is logged in instead of relying solely on `currentView` state
- When a Supabase session exists, skip splash/login and go directly to app

---

## Files Modified

1. `src/contexts/AuthContext.tsx` — Supabase auth integration + profile fetch
2. `src/components/settings/SettingsProfile.tsx` — live profile data
3. `src/components/layout/TopBar.tsx` — live name/org from auth context
4. `src/components/LoginScreen.tsx` — real signInWithPassword
5. `src/hooks/useBillingData.tsx` — add `pure_alpha` tier
6. `src/pages/Index.tsx` — session-aware routing

## No Database Changes Required

Eddie's profile row doesn't exist in `profiles` table yet, but the `handle_new_user` trigger should have created it. We may need to manually insert a profile row or handle the missing-profile case gracefully in the UI.

