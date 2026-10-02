import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID") ?? "";
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET") ?? "";
const APPLE_MUSIC_DEVELOPER_TOKEN = Deno.env.get("APPLE_MUSIC_DEVELOPER_TOKEN") ?? "";

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/music-accounts`;
const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-read-private",
  "user-read-recently-played",
  "user-top-read",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-library-read",
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

const ALLOWED_RETURN = [
  /^https:\/\/hub\.thebigidia\.com$/,
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
  /^http:\/\/localhost(:\d+)?$/,
];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const logErr = (phase: string, err: unknown) => {
  const e = err as Error;
  console.error(`🚨 [ERROR:${phase}] ${e?.message ?? String(err)}`);
  if (e?.stack) console.error(`[ERROR:${phase}:STACK] ${e.stack}`);
};

const admin = () => createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function safeReturn(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 500) return null;
  try {
    const u = new URL(raw);
    return ALLOWED_RETURN.some((r) => r.test(u.origin)) ? u.toString() : null;
  } catch {
    return null;
  }
}

async function requireUser(req: Request) {
  console.log("[PHASE_START] AUTH");
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  console.log(`[PHASE_END] AUTH ok=${!!data?.user}`);
  if (error || !data?.user) return null;
  return data.user.id;
}

/* ------------------------------ Spotify ------------------------------ */
async function spotifyTokenRequest(params: Record<string, string>) {
  console.log(`[PHASE_START] SPOTIFY_TOKEN grant=${params.grant_type}`);
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
    },
    body: new URLSearchParams(params).toString(),
  });
  const body = await res.json().catch(() => ({}));
  console.log(`[PHASE_END] SPOTIFY_TOKEN status=${res.status}`);
  if (!res.ok) throw new Error(`Spotify token ${res.status}: ${body?.error_description ?? body?.error ?? "unknown"}`);
  return body as { access_token: string; refresh_token?: string; expires_in: number; scope?: string };
}

async function spotifyAccessToken(userId: string): Promise<string> {
  const db = admin();
  console.log("[PHASE_START] DB_READ_SPOTIFY_CONNECTION");
  const { data, error } = await db
    .from("music_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "spotify")
    .maybeSingle();
  console.log("[PHASE_END] DB_READ_SPOTIFY_CONNECTION");
  if (error) throw error;
  if (!data) throw new Error("Spotify is not connected");
  if (data.expires_at && new Date(data.expires_at).getTime() - 60_000 > Date.now()) return data.access_token;
  const t = await spotifyTokenRequest({ grant_type: "refresh_token", refresh_token: data.refresh_token ?? "" });
  console.log("[PHASE_START] DB_UPDATE_SPOTIFY_TOKEN");
  await db
    .from("music_connections")
    .update({
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? data.refresh_token,
      expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "spotify");
  console.log("[PHASE_END] DB_UPDATE_SPOTIFY_TOKEN");
  return t.access_token;
}

async function spGet(token: string, url: string) {
  const res = await fetch(url.startsWith("http") ? url : `https://api.spotify.com/v1${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Spotify GET ${url} → ${res.status}`);
  return res.json();
}

async function spPaged(token: string, first: string, maxPages = 10) {
  const items: any[] = [];
  let url: string | null = first;
  let pages = 0;
  while (url && pages < maxPages) {
    console.log(`[PHASE_START] SPOTIFY_PAGE ${url}`);
    const body = await spGet(token, url);
    items.push(...(body.items ?? []));
    url = body.next ?? null;
    pages++;
    console.log(`[PHASE_END] SPOTIFY_PAGE items=${items.length}`);
  }
  return items;
}

async function syncSpotify(userId: string) {
  console.log("[PHASE_START] SYNC_SPOTIFY");
  const token = await spotifyAccessToken(userId);
  const db = admin();
  const now = new Date().toISOString();

  const recent = (await spGet(token, "/me/player/recently-played?limit=50")).items ?? [];
  const history = recent
    .filter((i: any) => i.track?.id)
    .map((i: any) => ({
      user_id: userId,
      provider: "spotify",
      track_id: i.track.id,
      track_name: i.track.name,
      artists: (i.track.artists ?? []).map((a: any) => a.name).join(", "),
      album: i.track.album?.name ?? null,
      isrc: i.track.external_ids?.isrc ?? null,
      duration_ms: i.track.duration_ms ?? null,
      played_at: i.played_at,
    }));

  const library: Record<string, unknown>[] = [];
  for (const range of ["short_term", "medium_term", "long_term"]) {
    const artists = (await spGet(token, `/me/top/artists?limit=50&time_range=${range}`)).items ?? [];
    artists.forEach((a: any, idx: number) =>
      library.push({ user_id: userId, provider: "spotify", kind: "top_artist", time_range: range, item_id: a.id, name: a.name, rank: idx + 1, payload: { genres: a.genres ?? [], image: a.images?.[0]?.url ?? null }, synced_at: now }),
    );
    const tracks = (await spGet(token, `/me/top/tracks?limit=50&time_range=${range}`)).items ?? [];
    tracks.forEach((t: any, idx: number) =>
      library.push({ user_id: userId, provider: "spotify", kind: "top_track", time_range: range, item_id: t.id, name: t.name, rank: idx + 1, payload: { artists: (t.artists ?? []).map((a: any) => a.name), album: t.album?.name ?? null, isrc: t.external_ids?.isrc ?? null }, synced_at: now }),
    );
  }
  const playlists = await spPaged(token, "/me/playlists?limit=50", 5);
  playlists.filter((p: any) => p?.id).forEach((p: any) =>
    library.push({ user_id: userId, provider: "spotify", kind: "playlist", item_id: p.id, name: p.name ?? "Untitled", payload: { tracks: p.tracks?.total ?? null, owner: p.owner?.display_name ?? null, uri: p.uri }, synced_at: now }),
  );
  const saved = await spPaged(token, "/me/tracks?limit=50", 10);
  saved.filter((s: any) => s.track?.id).forEach((s: any) =>
    library.push({ user_id: userId, provider: "spotify", kind: "saved_track", item_id: s.track.id, name: s.track.name, payload: { artists: (s.track.artists ?? []).map((a: any) => a.name), album: s.track.album?.name ?? null, added_at: s.added_at }, synced_at: now }),
  );

  const counts = await persist(db, userId, "spotify", history, library);
  console.log(`[PHASE_END] SYNC_SPOTIFY ${JSON.stringify(counts)}`);
  return counts;
}

/* ---------------------------- Apple Music ---------------------------- */
async function amGet(userToken: string, path: string) {
  const res = await fetch(`https://api.music.apple.com${path}`, {
    headers: { Authorization: `Bearer ${APPLE_MUSIC_DEVELOPER_TOKEN}`, "Music-User-Token": userToken },
  });
  if (!res.ok) throw new Error(`Apple GET ${path} → ${res.status}`);
  return res.json();
}

async function amPaged(userToken: string, first: string, maxPages = 10) {
  const items: any[] = [];
  let path: string | null = first;
  let pages = 0;
  while (path && pages < maxPages) {
    console.log(`[PHASE_START] APPLE_PAGE ${path}`);
    const body = await amGet(userToken, path);
    items.push(...(body.data ?? []));
    path = body.next ?? null;
    pages++;
    console.log(`[PHASE_END] APPLE_PAGE items=${items.length}`);
  }
  return items;
}

async function syncApple(userId: string) {
  console.log("[PHASE_START] SYNC_APPLE");
  const db = admin();
  const { data: conn, error } = await db
    .from("music_connections")
    .select("access_token")
    .eq("user_id", userId)
    .eq("provider", "apple_music")
    .maybeSingle();
  if (error) throw error;
  if (!conn) throw new Error("Apple Music is not connected");
  const ut = conn.access_token;
  const now = new Date().toISOString();

  // Apple does not expose play timestamps; record newly observed plays at observation time.
  console.log("[PHASE_START] APPLE_RECENT");
  const recent = await amPaged(ut, "/v1/me/recent/played/tracks?limit=30", 2);
  const { data: lastSeen } = await db
    .from("music_listening_history")
    .select("track_id")
    .eq("user_id", userId)
    .eq("provider", "apple_music")
    .order("played_at", { ascending: false })
    .limit(60);
  const seen = new Set((lastSeen ?? []).map((r) => r.track_id));
  const history = recent
    .filter((t: any) => t?.id && !seen.has(String(t.id)))
    .map((t: any) => ({
      user_id: userId,
      provider: "apple_music",
      track_id: String(t.id),
      track_name: t.attributes?.name ?? "Untitled",
      artists: t.attributes?.artistName ?? null,
      album: t.attributes?.albumName ?? null,
      isrc: t.attributes?.isrc ?? null,
      duration_ms: t.attributes?.durationInMillis ?? null,
      played_at: now,
    }));
  console.log(`[PHASE_END] APPLE_RECENT new=${history.length}`);

  const library: Record<string, unknown>[] = [];
  const heavy = await amPaged(ut, "/v1/me/history/heavy-rotation?limit=10", 3);
  heavy.forEach((h: any, idx: number) =>
    library.push({ user_id: userId, provider: "apple_music", kind: h.type === "artists" || h.type === "library-artists" ? "top_artist" : "top_track", time_range: "heavy_rotation", item_id: String(h.id), name: h.attributes?.name ?? "Untitled", rank: idx + 1, payload: { type: h.type, artist: h.attributes?.artistName ?? null }, synced_at: now }),
  );
  const playlists = await amPaged(ut, "/v1/me/library/playlists?limit=100", 5);
  playlists.forEach((p: any) =>
    library.push({ user_id: userId, provider: "apple_music", kind: "playlist", item_id: String(p.id), name: p.attributes?.name ?? "Untitled", payload: { can_edit: p.attributes?.canEdit ?? null }, synced_at: now }),
  );
  const songs = await amPaged(ut, "/v1/me/library/songs?limit=100", 10);
  songs.forEach((s: any) =>
    library.push({ user_id: userId, provider: "apple_music", kind: "saved_track", item_id: String(s.id), name: s.attributes?.name ?? "Untitled", payload: { artist: s.attributes?.artistName ?? null, album: s.attributes?.albumName ?? null, added_at: s.attributes?.dateAdded ?? null }, synced_at: now }),
  );

  const counts = await persist(db, userId, "apple_music", history, library);
  console.log(`[PHASE_END] SYNC_APPLE ${JSON.stringify(counts)}`);
  return counts;
}

/* ------------------------------ Persist ------------------------------ */
async function persist(db: ReturnType<typeof admin>, userId: string, provider: string, history: any[], library: any[]) {
  console.log(`[PHASE_START] DB_UPSERT_HISTORY rows=${history.length}`);
  if (history.length) {
    const { error } = await db.from("music_listening_history").upsert(history, { onConflict: "user_id,provider,played_at,track_id", ignoreDuplicates: true });
    if (error) throw error;
  }
  console.log("[PHASE_END] DB_UPSERT_HISTORY");
  console.log(`[PHASE_START] DB_UPSERT_LIBRARY rows=${library.length}`);
  for (let i = 0; i < library.length; i += 300) {
    const { error } = await db.from("music_user_library").upsert(library.slice(i, i + 300), { onConflict: "user_id,provider,kind,time_range,item_id" });
    if (error) throw error;
  }
  console.log("[PHASE_END] DB_UPSERT_LIBRARY");
  await db.from("music_connections").update({ last_synced_at: new Date().toISOString() }).eq("user_id", userId).eq("provider", provider);
  return { history: history.length, library: library.length };
}

/* ------------------------------ Callback ----------------------------- */
async function handleSpotifyCallback(url: URL) {
  console.log("[PHASE_START] SPOTIFY_CALLBACK");
  const state = url.searchParams.get("state") ?? "";
  const code = url.searchParams.get("code");
  const db = admin();
  const { data: st } = await db.from("music_oauth_states").select("*").eq("state", state).maybeSingle();
  if (!st) return new Response("Invalid or expired sign-in request.", { status: 400 });
  await db.from("music_oauth_states").delete().eq("state", state);
  const back = new URL(st.return_to);
  const fresh = Date.now() - new Date(st.created_at).getTime() < 15 * 60_000;
  if (!code || !fresh) {
    back.searchParams.set("music", "spotify_cancelled");
    return Response.redirect(back.toString(), 302);
  }
  try {
    const t = await spotifyTokenRequest({ grant_type: "authorization_code", code, redirect_uri: REDIRECT_URI });
    const me = await spGet(t.access_token, "/me");
    console.log("[PHASE_START] DB_UPSERT_CONNECTION");
    const { error } = await db.from("music_connections").upsert(
      {
        user_id: st.user_id,
        provider: "spotify",
        provider_user_id: me.id,
        display_name: me.display_name ?? me.id,
        product: me.product ?? null,
        scopes: t.scope ?? SPOTIFY_SCOPES,
        access_token: t.access_token,
        refresh_token: t.refresh_token ?? null,
        expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
      },
      { onConflict: "user_id,provider" },
    );
    console.log("[PHASE_END] DB_UPSERT_CONNECTION");
    if (error) throw error;
    try {
      await syncSpotify(st.user_id);
    } catch (e) {
      logErr("INITIAL_SPOTIFY_SYNC", e);
    }
    back.searchParams.set("music", "spotify_connected");
  } catch (e) {
    logErr("SPOTIFY_CALLBACK", e);
    back.searchParams.set("music", "spotify_failed");
  }
  console.log("[PHASE_END] SPOTIFY_CALLBACK");
  return Response.redirect(back.toString(), 302);
}

/* ------------------------------ Handler ------------------------------ */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  console.log("[PHASE_START] REQUEST");
  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      if (url.searchParams.has("state")) return await handleSpotifyCallback(url);
      return json({ error: "Not found" }, 404);
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";
    console.log(`[REQUEST] action=${action}`);
    const userId = await requireUser(req);
    if (!userId) return json({ error: "Authentication required", failed_at: "AUTH" }, 401);
    const db = admin();

    switch (action) {
      case "status": {
        const { data, error } = await db
          .from("music_connections")
          .select("provider, display_name, product, last_synced_at")
          .eq("user_id", userId);
        if (error) throw error;
        return json({
          success: true,
          connections: data ?? [],
          configured: { spotify: !!(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET), apple_music: !!APPLE_MUSIC_DEVELOPER_TOKEN },
        });
      }
      case "spotify_authorize": {
        if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return json({ error: "Spotify is not configured" }, 503);
        const ret = safeReturn(body.return_to);
        if (!ret) return json({ error: "Invalid return_to" }, 400);
        const state = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
        const { error } = await db.from("music_oauth_states").insert({ state, user_id: userId, provider: "spotify", return_to: ret });
        if (error) throw error;
        const q = new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, response_type: "code", redirect_uri: REDIRECT_URI, scope: SPOTIFY_SCOPES, state, show_dialog: "true" });
        return json({ success: true, url: `https://accounts.spotify.com/authorize?${q}` });
      }
      case "spotify_player_token": {
        const token = await spotifyAccessToken(userId);
        return json({ success: true, access_token: token });
      }
      case "apple_developer_token": {
        // MusicKit JS requires the developer token in the browser; it is served at runtime, never bundled.
        if (!APPLE_MUSIC_DEVELOPER_TOKEN) return json({ error: "Apple Music is not configured" }, 503);
        return json({ success: true, developer_token: APPLE_MUSIC_DEVELOPER_TOKEN });
      }
      case "apple_connect": {
        const mut = typeof body.music_user_token === "string" ? body.music_user_token : "";
        if (mut.length < 20 || mut.length > 4000) return json({ error: "Invalid music user token" }, 400);
        const sf = await amGet(mut, "/v1/me/storefront");
        const { error } = await db.from("music_connections").upsert(
          { user_id: userId, provider: "apple_music", provider_user_id: null, display_name: "Apple Music", product: sf.data?.[0]?.id ?? null, access_token: mut, refresh_token: null, expires_at: null },
          { onConflict: "user_id,provider" },
        );
        if (error) throw error;
        let counts = null;
        try {
          counts = await syncApple(userId);
        } catch (e) {
          logErr("INITIAL_APPLE_SYNC", e);
        }
        return json({ success: true, counts });
      }
      case "sync": {
        const provider = body.provider;
        if (provider === "spotify") return json({ success: true, counts: await syncSpotify(userId) });
        if (provider === "apple_music") return json({ success: true, counts: await syncApple(userId) });
        return json({ error: "Invalid provider" }, 400);
      }
      case "disconnect": {
        if (body.provider !== "spotify" && body.provider !== "apple_music") return json({ error: "Invalid provider" }, 400);
        const { error } = await db.from("music_connections").delete().eq("user_id", userId).eq("provider", body.provider);
        if (error) throw error;
        return json({ success: true });
      }
      default:
        return json({ error: "Unsupported action" }, 400);
    }
  } catch (err) {
    logErr("REQUEST", err);
    return json({ error: (err as Error)?.message ?? "Unexpected error" }, 500);
  } finally {
    console.log("[PHASE_END] REQUEST");
  }
});
