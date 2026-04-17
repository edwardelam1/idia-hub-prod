

## Plan: Add Apple & Google Sign-In to LoginScreen

### Context
- OAuth secrets for Apple and Google are already configured in Supabase (per user).
- Google OAuth requires the `prompt: 'select_account'` flow already wired in IDIA Life.
- Supabase JS handles the OAuth redirect flow client-side via `supabase.auth.signInWithOAuth()`.
- Current `LoginScreen.tsx` has email/password + an "Enterprise SSO" tab + quick-access prototype buttons.

### Changes

**`src/components/LoginScreen.tsx`** — add two branded OAuth buttons above the Standard/SSO tabs:

1. **Apple Sign-In button** — black bg, white Apple logo (lucide `Apple` icon), label "Continue with Apple".
2. **Google Sign-In button** — white bg with border, multi-color Google "G" SVG (inline), label "Continue with Google".

Both call:
```ts
await supabase.auth.signInWithOAuth({
  provider: 'apple' | 'google',
  options: {
    redirectTo: `${window.location.origin}/`,
    ...(provider === 'google' && { queryParams: { access_type: 'offline', prompt: 'select_account' } })
  }
});
```

3. Add a divider ("or continue with email") between the OAuth buttons and the existing tabs.
4. Handle errors via `toast.error()`; loading state per provider (`isAppleLoading`, `isGoogleLoading`) to disable buttons during redirect.
5. On success, Supabase redirects back → existing `AuthContext.onAuthStateChange` picks up the session → `Index.tsx` auto-routes to `/dashboard`. No additional routing logic needed.

### Layout
```
[Apple Sign-In Button — full width, black]
[Google Sign-In Button — full width, white + border]
─── or continue with email ───
[Standard / Enterprise SSO tabs]  (existing)
[Quick Access prototype buttons]  (existing)
```

### Files Modified
- `src/components/LoginScreen.tsx` — add 2 OAuth buttons + handlers + divider.

### Notes (verify before implementing)
- Ensure Apple & Google providers are enabled in Supabase Dashboard → Authentication → Providers (user confirmed secrets exist; I'll add a chat note linking to the providers page in case re-verification is needed).
- Site URL & Redirect URLs in Supabase must include `https://hub.thebigidia.com` and the preview URL — assumed already configured since IDIA Life uses the same Apple provider.

