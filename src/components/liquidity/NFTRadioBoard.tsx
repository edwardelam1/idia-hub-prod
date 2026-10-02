import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import appleLogo from "@/assets/apple-music-logo.png.asset.json";
import spotifyLogo from "@/assets/spotify-logo.svg.asset.json";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tierName: string;
}

// Official playlist embeds supply their own playback and account authorization.
// Provider credentials remain on the server for catalog synchronization only.
const PLAYERS = [
  {
    name: "Apple Music",
    logo: appleLogo.url,
    embed: "https://embed.music.apple.com/us/playlist/pl.u-EdAVz5rtXJ1lN0",
    link: "https://music.apple.com/us/playlist/pl.u-EdAVz5rtXJ1lN0",
  },
  {
    name: "Spotify",
    logo: spotifyLogo.url,
    embed: "https://open.spotify.com/embed/playlist/6p649dsAFP213xvwPjGkhq?utm_source=generator",
    link: "https://open.spotify.com/playlist/6p649dsAFP213xvwPjGkhq",
  },
] as const;

const NFTRadioBoard = ({ open, onOpenChange, tierName }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-5xl overflow-y-auto border-border bg-background p-4 text-foreground sm:p-6">
        <DialogHeader className="space-y-1 pr-8 text-left">
          <DialogTitle className="text-lg font-semibold">BIG IDIA Radio · Master Console</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Curated streams · {tierName} tier</DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          {PLAYERS.map((player) => (
            <section key={player.name} className="min-w-0 space-y-3 rounded-md border border-border bg-card p-3 sm:p-4" aria-label={`${player.name} player`}>
              <div className="flex h-9 items-center justify-between gap-3">
                <img src={player.logo} alt={player.name} className="h-7 max-w-[150px] object-contain object-left dark:first:invert" />
                <a href={player.link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label={`Open ${player.name} playlist`} title={`Open in ${player.name}`}>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
              {open && (
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
