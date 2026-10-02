import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import appleLogo from "@/assets/apple-music-logo.png.asset.json";
import spotifyLogo from "@/assets/spotify-logo.svg.asset.json";
import { supabase } from "@/integrations/supabase/client";
import MusicAccountControls, { type MusicConnection, type MusicProvider } from "./MusicAccountControls";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tierName: string;
}

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

const NFTRadioBoard = ({ open, onOpenChange, tierName }: Props) => {
  const [connections, setConnections] = useState<MusicConnection[]>([]);
  const [fullPlayback, setFullPlayback] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("music-accounts", { body: { action: "status" } });
    if (!error && data?.connections) setConnections(data.connections);
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl overflow-y-auto border-border bg-background p-4 text-foreground sm:p-6">
        <DialogHeader className="space-y-1 pr-8 text-left">
          <DialogTitle className="text-lg font-semibold">BIG IDIA Radio · Master Console</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Curated streams · {tierName} tier</DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          {PLAYERS.map((player) => (
            <section key={player.id} className="min-w-0 space-y-3 rounded-md border border-border bg-card p-3 sm:p-4" aria-label={`${player.name} player`}>
              <div className="flex h-9 items-center justify-between gap-3">
                <img src={player.logo} alt={player.name} className={`h-7 max-w-[150px] object-contain object-left ${player.logoClass}`} />
                <a href={player.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label={`Open ${player.name} playlist`} title={`Open in ${player.name}`}>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              {open && (
                <MusicAccountControls
                  provider={player.id}
                  connection={connections.find((c) => c.provider === player.id)}
                  onChanged={refresh}
                  onPlayingChange={handlers[player.id]}
                />
              )}
              {open && !fullPlayback[player.id] && (
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
      </DialogContent>
    </Dialog>
  );
};

export default NFTRadioBoard;
