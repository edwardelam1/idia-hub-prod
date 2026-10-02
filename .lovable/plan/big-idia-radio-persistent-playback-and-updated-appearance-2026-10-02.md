# BIG IDIA Radio: persistent playback and updated appearance

## What will change
1. Keep the Apple Music and Spotify players alive when the Master Console closes. Closing it will hide the controls, not stop or recreate an active player; reopening will show the same playback state. Keep the radio mounted while moving among signed-in Hub pages, and stop/release playback when leaving the Hub or signing out.
2. Replace the existing dashboard radio banner, for every user type, with the supplied artwork. Show the image without a surrounding card, badge, waveform, or extra copy. Keep a single clear launch button alongside/over the artwork, positioned to remain usable on narrow phones without obscuring its key text and boombox. Scale the full artwork proportionally rather than cropping it.
3. Change the Master Console background to the artwork's deep purple, using a dedicated themed color token. Preserve readable controls, the two provider players, and mobile scrolling.
4. Verify that playback survives close/reopen and dashboard navigation for both providers where their playback is available, and check the banner and console at phone and desktop widths.

## Technical details
- Store the uploaded image through the project asset flow and render it from the resulting pointer.
- Today the console's embeds and account controls are rendered only while open; closing the dialog unmounts the Spotify SDK player, stops MusicKit, and removes both iframes. Move the playback-owning portion into a persistent authenticated-level host, with the console controlling visibility rather than component lifetime. Avoid reloading the provider iframes on close. Preserve provider sign-in, sync and playback controls.
- Use a semantic radio-purple surface token in global CSS; do not change the rest of the app's theme.
- Browser/provider restrictions may still pause audio on backgrounding, page reload, or when a provider refuses playback; the target is continuity on closing the console and navigating within the signed-in Hub.
