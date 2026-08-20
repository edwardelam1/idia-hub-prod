# Terms Acceptance Gate (CDLA / Trading Desk ToS)

Every Hub user must read and accept the Commercial Data License Agreement before using the app. Acceptance is recorded on their profile, and the accepted date/time plus a download link appear in Settings.

## What the user sees

1. **On first (or next) login**, a full-screen, non-dismissible Terms modal appears before the dashboard.
   - Header: agreement title + effective date.
   - Scrollable body with the full agreement text.
   - A "Download PDF" button (always enabled).
   - "Accept Terms" button, **disabled until the user scrolls to the very bottom** of the document. A hint reads "Scroll to the end to enable acceptance", with a small read-progress indicator.
   - No close button, no ESC or outside-click dismiss. A "Decline & Sign Out" link is the only other exit.
2. After accepting, the modal closes and never reappears (unless the agreement version changes).
3. **Settings > My Profile > Identity & Profile** gains a "Legal & Agreements" section showing the agreement name, version, and the exact date/time accepted (local time), plus a "Download Terms (PDF)" button. If not yet accepted, it shows "Not accepted" with a "Review & Accept" action.

## Technical details

**Database (migration on `public.profiles`)**
- `terms_accepted boolean not null default false`
- `terms_accepted_at timestamptz`
- `terms_version text`
- Users update their own row via profile RLS; confirm an UPDATE policy scoped to `auth.uid()` exists and add one if missing.

**Terms content**
- Publish the provided PDF as a Lovable asset and use its URL for the download buttons.
- Add `src/content/terms-cdla.ts` holding the agreement text (extracted from the PDF, structured into sections) so the modal renders real scrollable HTML — reliable scroll-to-bottom detection is not possible with an embedded PDF iframe.
- Add a shared `TERMS_VERSION = "2026-08-20"` constant used by the modal and Settings.

**Components**
- `src/components/legal/TermsAcceptanceModal.tsx` — scroll container with an `onScroll` check (`scrollTop + clientHeight >= scrollHeight - 8`) enabling Accept; on accept, update the profile row, refresh auth state, toast on success/failure.
- `src/components/legal/TermsDownloadButton.tsx` — shared download link to the PDF asset.
- `src/contexts/AuthContext.tsx` — extend the profile select with the three new columns, expose `termsAccepted` / `termsAcceptedAt` / `termsVersion` and a `refreshProfile()` helper.
- `src/pages/Index.tsx` — render the modal above `AppLayout` when authenticated and (`!terms_accepted` or `terms_version !== TERMS_VERSION`).
- `src/components/settings/SettingsProfile.tsx` — new "Legal & Agreements" card with the acceptance timestamp and download button.

**Edge cases**
- Short viewports where the content fits without scrolling: treat as read-complete once fully visible.
- Failed write keeps the modal open with a retry.