import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID") ?? "";
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET") ?? "";
const APPLE_MUSIC_DEVELOPER_TOKEN = Deno.env.get("APPLE_MUSIC_DEVELOPER_TOKEN") ?? "";

const SPOTIFY_PLAYLIST_ID = "6p649dsAFP213xvwPjGkhq";
const APPLE_PLAYLIST_ID = "pl.u-EdAVz5rtXJ1lN0";
const APPLE_STOREFRONT = "us";

const SAFE_FIELDS =
  "id,provider,track_title,artist_name,album_title,artwork_url,duration_ms,external_url,preview_audio_url,ttm_nps_yield,buyout_valuation";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const logErr = (phase: string, err: unknown) => {
  const e = err as Error;
  console.error(`🚨 [ERROR:${phase}] ${e?.message ?? String(err)}`);
  if (e?.stack) console.error(`[ERROR:${phase}:STACK] ${e.stack}`);
};

const admin = () => createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/* ------------------------------------------------------------------ */
/* Apple Music                                                         */
/* ------------------------------------------------------------------ */
async function fetchAppleTracks() {
  console.log("[PHASE_START] APPLE_FETCH");
  if (!APPLE_MUSIC_DEVELOPER_TOKEN) {
    console.warn("[APPLE_FETCH] no developer token configured — skipping");
    console.log("[PHASE_END] APPLE_FETCH");
    return [];
  }
  const rows: Record<string, unknown>[] = [];
  let url:
    | string
    | null = `https://api.music.apple.com/v1/catalog/${APPLE_STOREFRONT}/playlists/${APPLE_PLAYLIST_ID}/tracks?limit=100`;

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${APPLE_MUSIC_DEVELOPER_TOKEN}` } });
    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      throw new Error(`Apple playlist fetch failed ${res.status}: ${text.slice(0, 300)}`);
    }
    const body = await res.json();
    for (const item of body.data ?? []) {
      const a = item.attributes ?? {};
      rows.push({
        provider: "apple_music",
        source_playlist_id: APPLE_PLAYLIST_ID,
        provider_track_id: String(item.id),
        isrc: a.isrc ?? null,
        track_title: a.name ?? "Untitled",
        artist_name: a.artistName ?? "Unknown artist",
        album_title: a.albumName ?? null,
        artwork_url: a.artwork?.url
          ? String(a.artwork.url).replace("{w}", "400").replace("{h}", "400")
          : null,
        duration_ms: a.durationInMillis ?? null,
        external_url: a.url ?? null,
        preview_audio_url: a.previews?.[0]?.url ?? null,
        is_available: true,
        provider_metadata: { genres: a.genreNames ?? [] },
        last_synced_at: new Date().toISOString(),
      });
    }
    url = body.next ? `https://api.music.apple.com${body.next}` : null;
  }
  console.log(`[PHASE_END] APPLE_FETCH count=${rows.length}`);
  return rows;
}

/* ------------------------------------------------------------------ */
/* Spotify                                                             */
/* ------------------------------------------------------------------ */
async function spotifyToken() {
  console.log("[PHASE_START] SPOTIFY_TOKEN");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Spotify token failed ${res.status}`);
  const body = await res.json();
  console.log("[PHASE_END] SPOTIFY_TOKEN");
  return body.access_token as string;
}

async function fetchSpotifyTracks() {
  console.log("[PHASE_START] SPOTIFY_FETCH");
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    console.warn("[SPOTIFY_FETCH] credentials missing — skipping");
    console.log("[PHASE_END] SPOTIFY_FETCH");
    return [];
  }
  const token = await spotifyToken();
  const rows: Record<string, unknown>[] = [];
  let url: string | null =
    `https://api.spotify.com/v1/playlists/${SPOTIFY_PLAYLIST_ID}/tracks?limit=100&market=US`;

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      throw new Error(`Spotify playlist fetch failed ${res.status}: ${text.slice(0, 300)}`);
    }
    const body = await res.json();
    for (const item of body.items ?? []) {
      const t = item.track;
      if (!t?.id) continue;
      rows.push({
        provider: "spotify",
        source_playlist_id: SPOTIFY_PLAYLIST_ID,
        provider_track_id: String(t.id),
        isrc: t.external_ids?.isrc ?? null,
        track_title: t.name ?? "Untitled",
        artist_name: (t.artists ?? []).map((a: any) => a.name).join(", ") || "Unknown artist",
        album_title: t.album?.name ?? null,
        artwork_url: t.album?.images?.[0]?.url ?? null,
        duration_ms: t.duration_ms ?? null,
        external_url: t.external_urls?.spotify ?? null,
        // Spotify no longer reliably returns previews; may be null.
        preview_audio_url: t.preview_url ?? null,
        is_available: true,
        provider_metadata: { popularity: t.popularity ?? null },
        last_synced_at: new Date().toISOString(),
      });
    }
    url = body.next ?? null;
  }
  console.log(`[PHASE_END] SPOTIFY_FETCH count=${rows.length}`);
  return rows;
}

/* ------------------------------------------------------------------ */
/* Sync                                                                */
/* ------------------------------------------------------------------ */
async function runSync() {
  console.log("[PHASE_START] SYNC");
  const db = admin();
  const errors: string[] = [];

  let apple: Record<string, unknown>[] = [];
  let spotify: Record<string, unknown>[] = [];
  try {
    apple = await fetchAppleTracks();
  } catch (e) {
    logErr("APPLE_FETCH", e);
    errors.push(`apple: ${(e as Error).message}`);
  }
  try {
    spotify = await fetchSpotifyTracks();
  } catch (e) {
    logErr("SPOTIFY_FETCH", e);
    errors.push(`spotify: ${(e as Error).message}`);
  }

  // Cross-match: Spotify rows with no preview borrow the Apple preview by ISRC.
  console.log("[PHASE_START] ISRC_MATCH");
  const appleByIsrc = new Map<string, string>();
  for (const a of apple) {
    if (a.isrc && a.preview_audio_url) appleByIsrc.set(String(a.isrc), String(a.preview_audio_url));
  }
  for (const s of spotify) {
    if (!s.preview_audio_url && s.isrc && appleByIsrc.has(String(s.isrc))) {
      s.preview_audio_url = appleByIsrc.get(String(s.isrc));
    }
  }
  console.log(`[PHASE_END] ISRC_MATCH apple_isrc=${appleByIsrc.size}`);

  const rows = [...apple, ...spotify];
  let upserted = 0;
  console.log("[PHASE_START] UPSERT");
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await db
      .from("music_catalog")
      .upsert(chunk, { onConflict: "provider,provider_track_id" });
    if (error) {
      logErr("UPSERT", error);
      errors.push(`upsert: ${error.message}`);
    } else {
      upserted += chunk.length;
    }
  }
  console.log(`[PHASE_END] UPSERT upserted=${upserted}`);
  console.log("[PHASE_END] SYNC");
  return { upserted, apple: apple.length, spotify: spotify.length, errors };
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  console.log("[PHASE_START] REQUEST");
  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "feed";
    console.log(`[REQUEST] action=${action}`);

    if (action === "sync") {
      const result = await runSync();
      console.log("[PHASE_END] REQUEST");
      return json({ success: true, ...result });
    }

    if (action !== "feed") return json({ error: "Unsupported action" }, 400);

    // Feed requires an authenticated listener.
    console.log("[PHASE_START] AUTH");
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      console.log("[PHASE_END] AUTH unauthenticated");
      return json({ error: "Authentication required", failed_at: "AUTH" }, 401);
    }
    console.log("[PHASE_END] AUTH");

    console.log("[PHASE_START] FEED_QUERY");
    const db = admin();
    const { data, error } = await db
      .from("music_catalog")
      .select(SAFE_FIELDS)
      .is("assigned_to", null)
      .eq("is_available", true)
      .not("preview_audio_url", "is", null)
      .limit(300);
    if (error) throw error;
    console.log(`[PHASE_END] FEED_QUERY rows=${data?.length ?? 0}`);

    console.log("[PHASE_START] SHUFFLE");
    const tracks = [...(data ?? [])];
    for (let i = tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    }
    console.log("[PHASE_END] SHUFFLE");
    console.log("[PHASE_END] REQUEST");
    return json({ success: true, tracks });
  } catch (err) {
    logErr("REQUEST", err);
    console.log("[PHASE_END] REQUEST (error)");
    return json({ error: (err as Error)?.message ?? "Unexpected error" }, 500);
  }
});
