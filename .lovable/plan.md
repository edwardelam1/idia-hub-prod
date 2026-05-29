## Goal

Derive `location_string` from the browser at session time (not from `profiles.location`), broken down hierarchically as **city → state/province → country**, so regional pool routing reflects the user's current physical location. Also remove the legacy `_shared/charge-usdc.ts`.

## Location string format

Hierarchical, hyphen-delimited, ISO-style, most-specific-first:

```
{CITY}-{STATE_OR_PROVINCE}-{COUNTRY}
```

Examples:
- `Austin-TX-US`
- `Toronto-ON-CA`
- `London-ENG-GB`
- `TX-US` (city unavailable)
- `US` (only country resolved)
- `undefined` (denied / unavailable → controller falls back to GLOBAL pool)

Rules:
- Country = ISO 3166-1 alpha-2 (`US`, `CA`, `GB`).
- State/province = ISO 3166-2 subdivision code when the geocoder returns it; otherwise the principal subdivision name slugified (spaces → none, ASCII only).
- City = localityInfo administrative city name, slugified (spaces → none, ASCII only, no diacritics).
- Drop any segment that's missing; never emit empty hyphens (no `--US`).

## Approach

### 1. New hook: `src/hooks/useBrowserLocation.ts`

- On mount, call `navigator.geolocation.getCurrentPosition` with `{ enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 }`.
- Reverse-geocode `{lat, lng}` via BigDataCloud's keyless endpoint:
  `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=…&longitude=…&localityLanguage=en`
  - Returns `city`, `principalSubdivision`, `principalSubdivisionCode` (e.g. `"US-TX"`), `countryCode`.
- Build the hierarchical string per the format above. Cache in `sessionStorage` under `idia.browserLocation` to avoid re-prompting on every page.
- Expose `{ locationString, status, error }` where `status ∈ idle | requesting | ready | denied | unavailable`.
- On any failure → `locationString = undefined`; controller already falls back to GLOBAL.

### 2. Wire into `src/pages/BestFriendPage.tsx`

- Replace `profile.location` read with `const { locationString } = useBrowserLocation();`.
- Drop `location` from the `profiles` select (keep `platform_guid`).
- Pass `location_string: locationString` in the edge-function payload.
- Update telemetry log to print `locationString ?? "<none>"`.

### 3. Edge functions

No changes needed — `best-friend-ai`, `synapse-controller`, and `idia-circular-settlement` already normalize blank/null to GLOBAL fallback.

### 4. Legacy cleanup

- Delete `supabase/functions/_shared/charge-usdc.ts`.
- Grep for any `charge-usdc` imports and remove dead references if found.

## Out of scope

- Storing browser location back to `profiles.location` (location is dynamic per session).
- Permission UX beyond the native browser prompt.
- Regional pool registration on the contract — controller's GLOBAL fallback handles unregistered regions today.

## Files touched

- add: `src/hooks/useBrowserLocation.ts`
- edit: `src/pages/BestFriendPage.tsx`
- delete: `supabase/functions/_shared/charge-usdc.ts`
