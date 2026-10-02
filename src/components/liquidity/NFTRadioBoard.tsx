import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import appleLogo from "@/assets/apple-music-logo.png.asset.json";
import spotifyLogo from "@/assets/spotify-logo.svg.asset.json";
import { supabase } from "@/integrations/supabase/client";
import MusicAccountControls, { type MusicConnection, type MusicProvider } from "./MusicAccountControls";

// Official playlist embeds play previews; signed-in users get full playback and data sync
// through the music-accounts function, which keeps provider secrets and tokens server-side.
const PLAYERS: {
  id: MusicProvider;
  name: string;
  logo: string;
  logoClass: string;
  embed: string;
  link: string;
}[] = [
  {
    id: "apple_music",
    name: "Apple Music",
    logo: appleLogo.url,
    logoClass: "dark:invert",
    embed: "https://embed.music.apple.com/us/playlist/pl.u-EdAVz5rtXJ1lN0",
    link: "https://music.apple.com/us/playlist/pl.u-EdAVz5rtXJ1lN0",
  },
  {
    id: "spotify",
    name: "Spotify",
    logo: spotifyLogo.url,
    logoClass: "",
    embed: "https://open.spotify.com/embed/playlist/6p649dsAFP213xvwPjGkhq?utm_source=generator",
    link: "https://open.spotify.com/playlist/6p649dsAFP213xvwPjGkhq",
  },
];

const NFTRadioBoard = () => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [connections, setConnections] = useState<MusicConnection[]>([]);
  const [fullPlayback, setFullPlayback] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("music-accounts", { body: { action: "status" } });
    if (!error && data?.connections) setConnections(data.connections);
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  useEffect(() => {
    const launch = () => {
      setHasOpened(true);
      setOpen(true);
    };
    window.addEventListener("big-idia-radio:open", launch);
    return () => window.removeEventListener("big-idia-radio:open", launch);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // Spotify sign-in returns to this page with ?music=...; reopen feedback and clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("music");
    if (!status) return;
    if (status === "spotify_connected") toast.success("Spotify connected");
    else if (status === "spotify_failed") toast.error("Spotify sign-in failed");
    params.delete("music");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, []);

  const handlers = {
    apple_music: useCallback((v: boolean) => setFullPlayback((p) => ({ ...p, apple_music: v })), []),
    spotify: useCallback((v: boolean) => setFullPlayback((p) => ({ ...p, spotify: v })), []),
  };

  return (
    <dialog ref={dialogRef} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === dialogRef.current) setOpen(false); }} aria-labelledby="big-idia-radio-title" className="radio-console m-auto max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl overflow-y-auto border border-border p-4 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="big-idia-radio-title" className="text-lg font-semibold">BIG IDIA Radio · Master Console</h2>
            <p className="text-xs text-muted-foreground">Curated streams</p>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Close radio console" title="Close radio console" className="shrink-0"><X className="h-4 w-4" /></Button>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          {PLAYERS.map((player) => (
            <section key={player.id} className="radio-console-deck min-w-0 space-y-3 rounded-md border border-border p-3 sm:p-4" aria-label={`${player.name} player`}>
              <div className="flex h-9 items-center justify-between gap-3">
                <img src={player.logo} alt={player.name} className={`h-7 max-w-[150px] object-contain object-left ${player.logoClass}`} />
                <a href={player.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label={`Open ${player.name} playlist`} title={`Open in ${player.name}`}>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              {hasOpened && (
                <MusicAccountControls
                  provider={player.id}
                  connection={connections.find((c) => c.provider === player.id)}
                  onChanged={refresh}
                  onPlayingChange={handlers[player.id]}
                />
              )}
              {hasOpened && !fullPlayback[player.id] && (
                <iframe
                  title={`${player.name} curated playlist player`}
                  src={player.embed}
                  className="h-[352px] w-full rounded-md border-0 bg-muted"
                  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                  loading="eager"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              )}
            </section>
          ))}
        </div>
    </dialog>
  );
};

export default NFTRadioBoard;
