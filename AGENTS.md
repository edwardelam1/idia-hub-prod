# Architecture decisions

- Use official provider playlist embeds for the two radio decks; keep provider credentials server-side for catalog sync because embedded playback manages its own authorization and must not expose secrets.