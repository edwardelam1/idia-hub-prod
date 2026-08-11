# Avatar URL should come from profiles.avatar_url

## Problem
The header avatar is rendered from `piiData.avatarUrl`, which is populated in `AuthContext` from the Supabase auth user metadata (`user_metadata.avatar_url`) — not from the `profiles.avatar_url` column. The profile row is already fetched (and stored in `profile.avatar_url`), but that value is never used for the avatar image.

## Fix
Make `profiles.avatar_url` the source of truth for the avatar:

1. In `src/contexts/AuthContext.tsx`, pass the fetched profile row into `fetchPiiData` and set `avatarUrl` to `profileRow.avatar_url`, falling back to auth metadata only when the column is empty.
2. Leave the existing cache-busting behavior in `TopBar` untouched — it keeps working with the new source.

## Technical notes
- `fetchPiiData(session)` becomes `fetchPiiData(session, profileRow)`; the call site at the end of `fetchProfileAndSubscription` already has `profileRow` in scope.
- No database or edge function changes; `life-pii-bridge` already prefers `profiles.avatar_url` and isn't the code path in use.
