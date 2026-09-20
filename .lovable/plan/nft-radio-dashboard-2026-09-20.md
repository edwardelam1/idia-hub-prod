# NFT Radio Dashboard

## Result
Add a responsive, hardware-inspired NFT Radio deck to the individual dashboard. It will connect real liquidity-lock eligibility to real music playback and the existing `claim-mystery-nft` service, without simulated tracks, claims, yields, or ownership.

## Confirmed foundation
- The individual dashboard already shows the primary ETH, Synapse Credit, USDC, and IDIA cards.
- `nft_radio_tiers` is live with 21 ordered tiers and public read access.
- `liquidity_locks` is live with wallet address, staked USD value, maturity date, status, token ID, and transaction hash.
- The Liquidity page already derives a tier from combined v3/v4 position value and displays lock status, but its mystery-claim button is not connected.
- The tier hook already exists; it needs the requested log lifecycle and 30-minute cache adjustment rather than a duplicate file.
- No separate music catalog or owned-music table is currently exposed in the public schema. The existing `claim-mystery-nft` Edge Function will therefore remain the authority for claim selection and returned NFT metadata.

## Dashboard launcher
- Add a wide **NFT RADIO DECK** launcher directly below the four balance cards.
- Use a compact carbon/rack-panel treatment, logo-colored LEDs, waveform icon, title, and supplied subtitle.
- Keep the full banner readable at the current 393px mobile width and open the deck in a dialog.

## Radio deck interface
- Build `NFTRadioModal` as a responsive rack-console dialog using the existing buttons, badges, progress, dialog, and drawer primitives.
- Add Channel A / Channel B switching, POWER, FM STEREO, and BASE MAINNET indicators.
- Show the qualified tier, RWA eligibility, selected lock, and a live `DD : HH : MM : SS` countdown from `maturity_date`.
- Add a central VFD-style now-playing display and two CSS-animated VU meters that animate only while audio is playing and stop for reduced-motion users.
- Keep mobile controls centered, stacked, and touch-safe; keep desktop controls dense and console-like.

## Real data and eligibility
- Extract the reusable lock query from the Liquidity page into a typed hook and share it with the radio deck.
- Select the relevant active/matured lock deterministically, derive its tier from its recorded USD value, and distinguish no wallet, no lock, below-RWA tier, active lock, matured lock, loading, and error states.
- Update `useNftRadioTiers` to use the requested `[START]`, `[PROCESS]`, `[ERROR]`, and `[END]` logging and a 30-minute cache while retaining safe TypeScript handling for the large generated Supabase schema.
- Keep the existing Liquidity page tier and lock presentation working through the shared hooks.

## Channel A: Protocol Radio
- Add a provider adapter supporting both Apple MusicKit JS and Spotify embeds/previews, with licensed direct preview audio as the final fallback.
- Populate stations only from real provider identifiers or preview URLs returned by the production catalog/claim service; show an unavailable state rather than sample music when no playable source exists.
- Implement play, pause, and randomized next-station controls. Individual track selection remains disabled and the required Mystery Draw disclaimer stays visible.
- Add lowest-level playback logging for provider selection, channel switches, transport actions, media events, and failures.

## Channel B: My Crate
- Hydrate owned items from the existing claim service’s ownership/list response and switch here after a successful claim.
- Render Channel B only when at least one claimed NFT is returned for the signed-in wallet.
- Add search, artwork, artist/title, royalty share, TTM NPS, 10× buyout value, Base ownership details, and an LOD drawer using only returned production metadata.
- If the deployed function currently supports only the supplied claim action, preserve that action and add a non-mutating ownership/list action to the same service once its source is synchronized into the project; do not create a parallel ownership system.

## Mystery claim flow
- For an immature lock, disable claiming and show **TUNING IN… (XX DAYS LEFT)** plus the tier’s real mystery-value range.
- For a matured RWA-eligible lock, enable the amber **PICK MYSTERY NFT** action.
- Invoke `claim-mystery-nft` with `{ walletAddress, rwaLevel }`; never randomize or assign an NFT in the browser.
- Validate the response before reveal. Show artwork, track, artist, royalty share, transaction state, and the **CLAIM NFT & ASSIGN ROYALTIES** action according to the service’s real transaction contract.
- Prevent duplicate submissions, surface wallet/auth/service errors, refresh ownership after success, switch to My Crate, and log `[START]`, `[PROCESS]`, `[ERROR]`, and `[END]` around every claim stage.

## Technical safeguards
- No mock tracks, fabricated yields, placeholder ownership, arcade counters, cooldown meters, or point systems.
- No new database tables are planned; the existing tier, lock, wallet, and claim authorities remain canonical.
- Do not expose Apple developer tokens or other secrets in browser code. If MusicKit authorization is not already available from the server-side catalog service, present Spotify/direct previews and a clear Apple-unavailable state until it is configured securely.
- Keep timers and audio listeners cleaned up when the dialog closes; stop playback on unmount.

## Validation
- Verify clean typecheck/build and current preview logs.
- Test launcher and deck at 393×754 mobile and desktop widths for overflow, centering, and control reachability.
- Verify channel switching, timer rollover, reduced motion, playback fallback order, empty/error states, and dialog cleanup.
- Test an authenticated mature-lock claim only against the existing server-secure function; confirm the returned NFT appears in My Crate and that repeated clicks cannot duplicate the transaction.
