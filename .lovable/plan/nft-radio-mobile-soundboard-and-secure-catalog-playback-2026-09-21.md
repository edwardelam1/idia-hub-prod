# NFT Radio: mobile soundboard and secure catalog playback

## Goal

Add a mobile-first NFT Radio experience beneath the dashboard page’s holdings. It will use a custom HTML5 audio player—not Spotify or Apple embeds—and continuously shuffle playable, unassigned tracks from a new `music_catalog` table.

## Verified foundation

- The Liquidity page already displays live protocol holdings and derives the user’s NFT Radio tier from `nft_radio_tiers`.
- The live tier table contains 21 ordered tiers across Free, Basic, Elevated, Quantium, Cosmos, and Interdimensional categories. The attached `atomic` row matches the live table.
- No `music_catalog` table or music catalog Edge Function currently exists.
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `APPLE_MUSIC_DEVELOPER_TOKEN` are already stored as Supabase secrets. None will be copied into frontend code or `VITE_` variables.

## 1. Catalog and access rules

Create `public.music_catalog` with fields for normalized provider metadata and NFT Radio economics, including:

- provider identity, source playlist, provider track ID, ISRC, title, artist, album, artwork, duration, external link, and `preview_audio_url`
- `ttm_nps_yield`, `buyout_valuation`, `assigned_to`, availability, sync timestamps, and created/updated timestamps
- uniqueness suitable for retry-safe playlist imports and indexes for the radio query (`assigned_to IS NULL`, available, playable)

Security and integrity:

- Grant only authenticated read access and service-role write access, then enable RLS in the same migration.
- Authenticated listeners may read the safe catalog projection; browser writes are prohibited.
- Financial values will never be invented. Playlist imports preserve existing curated `ttm_nps_yield` and `buyout_valuation`; unavailable values remain visibly unavailable until supplied by a verified source.
- `assigned_to` remains nullable and only rows where it is null can enter the public radio rotation.

## 2. Secure playlist ingestion and radio feed

Create a Supabase Edge Function for NFT Radio with strict input validation, CORS handling, authentication, safe response fields, and bracketed `[PHASE_START]` / `[PHASE_END]` logging for every provider call, database operation, loop, and mapping phase.

Use these as server-side catalog sources only:

- Spotify: `6p649dsAFP213xvwPjGkhq`
- Apple Music storefront `us`: `pl.u-EdAVz5rtXJ1lN0`

The server will:

- Exchange the Spotify client credentials server-side and use the stored Apple Music developer token server-side.
- Fetch and normalize playlist metadata, paginate fully, deduplicate primarily by ISRC and provider ID, and upsert without overwriting curated valuation fields.
- Store only provider-returned public preview URLs; never download, proxy, or re-host audio.
- Treat Spotify preview URLs as optional because Spotify no longer reliably supplies them for newer apps. Where possible, match Spotify items by ISRC to Apple catalog entries and use the provider-returned Apple `.m4a` preview. Tracks with no valid preview remain catalogued but are excluded from playback.
- Expose a listener action that returns a randomized safe projection from `music_catalog` where `assigned_to IS NULL`, the track is available, and `preview_audio_url` is present.
- Add a scheduled daily metadata refresh for the two curated sources, with retry-safe upserts and graceful provider-specific failures.

## 3. `NFTRadioBanner.tsx`

Build a full-width interactive banner immediately below `ProtocolHoldings` in the Liquidity page’s **Protocol Holdings** view.

The banner will include:

- “Listen to NFT Radio – Curated Catalog Streams”
- A clear “Tap to Launch” action
- The user’s live tier from the existing `nft_radio_tiers` logic
- A restrained animated waveform/live indicator using semantic design tokens and reduced-motion support
- A compact mobile layout with no clipped text or horizontal overflow

## 4. `NFTRadioBoard.tsx`

Open a custom sound-engineering board from the banner using the existing dialog system.

Player behavior:

- One native HTML5 audio deck driven only by `preview_audio_url` values returned by the Edge Function
- Explicit tap-to-play to satisfy mobile browser audio rules
- Randomized continuous playback, no immediate repeat, automatic advance on `ended`, manual next, play/pause, mute, and volume controls
- Skip broken or expired preview URLs without trapping the player; show loading, empty-catalog, and recoverable-error states
- Stop playback and release the audio source when the board closes

Console design:

- Matte, dark mixing-board surfaces with semantic neon purple and gold LED states, similar to the hub logo
- Digital screen showing `track_title`, `artist_name`, `ttm_nps_yield`, `buyout_valuation`, source attribution, and current tier
- CSS EQ meters, faders, and rotary-control styling that reflect playback state without pretending to alter unsupported audio properties
- No provider iframe, Web Playback SDK, external playlist widget, or credential-bearing browser request

## 5. Mobile-first behavior

- On phones, use a centered, edge-safe near-full-screen board constrained by `100dvh`, with one vertical control column and large touch targets.
- Keep the digital screen, controls, labels, and values within the viewport; long titles and artist names wrap or truncate predictably.
- On tablets and desktop, expand into a wider console arrangement while preserving the same single audio deck.
- Respect safe-area insets, reduced motion, keyboard focus, screen-reader labels, and portrait/landscape resizing.

## 6. Integration and verification

- Reuse the existing NFT Radio tier hook rather than duplicating tier rules.
- Keep all provider credentials in Supabase secrets; add no music secrets to `.env`, frontend constants, or `VITE_` variables.
- Verify migration grants/RLS, Edge Function preflight/authentication, provider failure handling, catalog filtering, shuffle/advance behavior, and audio cleanup.
- Test the Liquidity holdings view and radio board at mobile and desktop sizes, including iOS-style tap-to-start constraints, long metadata, missing valuation values, empty playable catalogs, and reduced motion.
- Run focused type checks/tests and confirm the preview build is clean.