# Architecture decisions

- Keep the BIG IDIA Radio console mounted inside the authenticated layout and hide it with a native dialog; provider playback must survive console closure and in-app navigation, but stop on sign-out.
- Use official provider playlist embeds for the two radio decks; keep provider credentials server-side for catalog sync because embedded playback manages its own authorization and must not expose secrets.
- Per-user Spotify/Apple Music linking goes through the music-accounts edge function; provider tokens live only in service-role tables because users' credentials must never reach other clients (MusicKit's developer token is served at runtime since MusicKit JS requires it in the browser).
- Keep Trading Desk API Access as a Data Marketplace panel rather than a standalone navigation page so data access tools share one workspace.
