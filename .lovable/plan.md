

# Fix: Logout Not Working / Forced Single Account

## Root Cause

Two bugs in `src/pages/Index.tsx`:

1. **`handleLogout` doesn't call Supabase sign-out.** It only sets local React state (`setCurrentView('login')`), but the Supabase session remains in localStorage. On the next render cycle, `isAuthenticated` is still `true`.

2. **The `useEffect` immediately overrides logout.** Lines 40-45 watch `isAuthenticated` and force `currentView` back to `'app'` whenever it's true. Since `handleLogout` doesn't clear the Supabase session, `isAuthenticated` stays `true` and the effect immediately puts the user back into the app.

Result: the user can never reach the login screen or sign into a different account.

## Fix

### `src/pages/Index.tsx`
- Import `logout` from `useAuth()` 
- In `handleLogout`, call `await logout()` (which calls `supabase.auth.signOut()` and clears PII) before setting local state
- This ensures the Supabase session is destroyed, `isAuthenticated` becomes `false`, and the login screen appears

```typescript
const { user, isAuthenticated, isLoading, logout: authLogout } = useAuth();

const handleLogout = async () => {
  await authLogout();  // clears Supabase session + PII
  setUserRole('');
  setCurrentView('login');
};
```

This is a one-file, two-line fix.

