## Show profile picture in TopBar

Replace the initials-only avatar in `src/components/layout/TopBar.tsx` with the user's actual profile picture, falling back to initials when no image is available. The avatar URL is already loaded into the auth context via the IDIA Life PII bridge (`piiData.avatarUrl`) and the `profiles.avatar_url` column — no new query or upload logic needed.

### Changes

**`src/components/layout/TopBar.tsx`**
- Import `AvatarImage` alongside `Avatar` and `AvatarFallback`.
- Read `piiData?.avatarUrl` from the existing `useAuth()` call.
- In the dropdown trigger `<Avatar>`, render `<AvatarImage src={avatarUrl} alt={displayName} />` above the existing `<AvatarFallback>` so initials remain the graceful fallback when the image is missing or fails to load.
- Add a cache-bust query param (`?t=…`) keyed to an `avatar-updated` window event listener (mirroring the Life app pattern) so a future upload flow can refresh the header instantly without a reload.

### Out of scope
- No upload UI is added in the Hub (Hub is zero-PII; uploads stay in the Life app).
- No changes to `life-pii-bridge`, `AuthContext`, or the `profiles` table — `avatar_url` is already fetched.
- No changes to dropdown menu items, identity pills, or credits chip.
