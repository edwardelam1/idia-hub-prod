import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Pause, Play, RefreshCw, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type MusicProvider = "spotify" | "apple_music";

interface Connection {
  provider: MusicProvider;
  display_name: string | null;
  product: string | null;
  last_synced_at: string | null;
}

const SPOTIFY_PLAYLIST_URI = "spotify:playlist:6p649dsAFP213xvwPjGkhq";
const APPLE_PLAYLIST_ID = "pl.u-EdAVz5rtXJ1lN0";
const LABEL: Record<MusicProvider, string> = { spotify: "Spotify", apple_music: "Apple Music" };

const invoke = async <T,>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("music-accounts", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
};

const loadScript = (src: string, id: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.getElementById(id)) return resolve();
    const s = document.createElement("script");
    s.id = id;
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });

/* ---------------------- Spotify full playback ---------------------- */
const loadSpotifySdk = () =>
  new Promise<any>((resolve, reject) => {
    const w = window as any;
    if (w.Spotify) return resolve(w.Spotify);
    w.onSpotifyWebPlaybackSDKReady = () => resolve(w.Spotify);
    loadScript("https://sdk.scdn.co/spotify-player.js", "spotify-sdk").catch(reject);
  });

/* ---------------------- Apple MusicKit ---------------------- */
let musicKitPromise: Promise<any> | null = null;
const getMusicKit = () => {
  if (!musicKitPromise) {
    musicKitPromise = (async () => {
      const { developer_token } = await invoke<{ developer_token: string }>({ action: "apple_developer_token" });
      await loadScript("https://js-cdn.music.apple.com/musickit/v3/musickit.js", "musickit-sdk");
      const w = window as any;
      if (!w.MusicKit) await new Promise((r) => document.addEventListener("musickitloaded", r, { once: true }));
      return w.MusicKit.configure({ developerToken: developer_token, app: { name: "BIG IDIA Hub", build: "1.0.0" } });
    })().catch((e) => {
      musicKitPromise = null;
      throw e;
    });
  }
  return musicKitPromise;
};

interface Props {
  provider: MusicProvider;
  connection: Connection | undefined;
  onChanged: () => void;
  onPlayingChange: (fullPlayback: boolean) => void;
}

const MusicAccountControls = ({ provider, connection, onChanged, onPlayingChange }: Props) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(true);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const spotifyPlayer = useRef<any>(null);

  useEffect(() => {
    return () => {
      spotifyPlayer.current?.disconnect?.();
      if (provider === "apple_music" && musicKitPromise) musicKitPromise.then((m) => m.stop?.()).catch(() => undefined);
    };
  }, [provider]);

  useEffect(() => onPlayingChange(active), [active, onPlayingChange]);

  const connect = async () => {
    setBusy("connect");
    try {
      if (provider === "spotify") {
        const { url } = await invoke<{ url: string }>({ action: "spotify_authorize", return_to: window.location.href.split("?")[0] });
        window.location.href = url;
        return;
      }
      const music = await getMusicKit();
      const token = await music.authorize();
      await invoke({ action: "apple_connect", music_user_token: token });
      toast.success("Apple Music connected");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? `${LABEL[provider]} sign-in failed`);
    }
    setBusy(null);
  };

  const sync = async () => {
    setBusy("sync");
    try {
      const { counts } = await invoke<{ counts: { history: number; library: number } }>({ action: "sync", provider });
      toast.success(`${LABEL[provider]} synced · ${counts.history} plays · ${counts.library} library items`);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Sync failed");
    }
    setBusy(null);
  };

  const disconnect = async () => {
    setBusy("disconnect");
    try {
      spotifyPlayer.current?.disconnect?.();
      if (provider === "apple_music") (await getMusicKit().catch(() => null))?.unauthorize?.();
      await invoke({ action: "disconnect", provider });
      setActive(false);
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Disconnect failed");
    }
    setBusy(null);
  };

  const startFull = useCallback(async () => {
    setBusy("play");
    try {
      if (provider === "spotify") {
        const Spotify = await loadSpotifySdk();
        const player = new Spotify.Player({
          name: "BIG IDIA Radio",
          volume: 0.8,
          getOAuthToken: (cb: (t: string) => void) =>
            invoke<{ access_token: string }>({ action: "spotify_player_token" }).then((r) => cb(r.access_token)),
        });
        player.addListener("player_state_changed", (s: any) => {
          if (!s) return;
          setPaused(s.paused);
          const t = s.track_window?.current_track;
          setNowPlaying(t ? `${t.name} — ${(t.artists ?? []).map((a: any) => a.name).join(", ")}` : null);
        });
        player.addListener("account_error", () => toast.error("Full-song playback needs Spotify Premium"));
        player.addListener("authentication_error", (e: any) => toast.error(e?.message ?? "Spotify authentication failed"));
        const deviceId: string = await new Promise((resolve, reject) => {
          player.addListener("ready", ({ device_id }: { device_id: string }) => resolve(device_id));
          player.addListener("initialization_error", (e: any) => reject(new Error(e?.message)));
          player.connect();
        });
        spotifyPlayer.current = player;
        const { access_token } = await invoke<{ access_token: string }>({ action: "spotify_player_token" });
        const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ context_uri: SPOTIFY_PLAYLIST_URI }),
        });
        if (!res.ok) throw new Error(res.status === 403 ? "Full-song playback needs Spotify Premium" : `Spotify playback failed (${res.status})`);
      } else {
        const music = await getMusicKit();
        if (!music.isAuthorized) await music.authorize();
        music.addEventListener("nowPlayingItemDidChange", () => {
          const i = music.nowPlayingItem;
          setNowPlaying(i ? `${i.title} — ${i.artistName}` : null);
        });
        music.addEventListener("playbackStateDidChange", () => setPaused(!music.isPlaying));
        await music.setQueue({ playlist: APPLE_PLAYLIST_ID, startPlaying: true });
      }
      setActive(true);
      setPaused(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Playback failed");
      spotifyPlayer.current?.disconnect?.();
      setActive(false);
    }
    setBusy(null);
  }, [provider]);

  const toggle = async () => {
    if (provider === "spotify") return spotifyPlayer.current?.togglePlay();
    const music = await getMusicKit();
    music.isPlaying ? music.pause() : music.play();
  };
  const next = async () => {
    if (provider === "spotify") return spotifyPlayer.current?.nextTrack();
    (await getMusicKit()).skipToNextItem();
  };

  if (!connection) {
    return (
      <Button size="sm" variant="outline" className="w-full" onClick={connect} disabled={!!busy}>
        {busy === "connect" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Sign in with {LABEL[provider]}
      </Button>
    );
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-muted-foreground">
          Connected{connection.display_name ? ` · ${connection.display_name}` : ""}
          {connection.last_synced_at ? ` · synced ${new Date(connection.last_synced_at).toLocaleDateString()}` : ""}
        </span>
        <div className="flex shrink-0 gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={sync} disabled={!!busy} aria-label="Sync now" title="Sync now">
            <RefreshCw className={`h-3.5 w-3.5 ${busy === "sync" ? "animate-spin" : ""}`} />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={disconnect} disabled={!!busy} aria-label="Disconnect" title="Disconnect">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {active ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={toggle} aria-label={paused ? "Play" : "Pause"}>
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={next} aria-label="Next track">
            <SkipForward className="h-4 w-4" />
          </Button>
          <span className="min-w-0 flex-1 truncate">{nowPlaying ?? "Loading…"}</span>
        </div>
      ) : (
        <Button size="sm" variant="secondary" className="w-full" onClick={startFull} disabled={!!busy}>
          {busy === "play" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Play full songs
        </Button>
      )}
    </div>
  );
};

export default MusicAccountControls;
export type { Connection as MusicConnection };
