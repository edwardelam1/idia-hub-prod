import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useNftRadioFeed, type RadioTrack } from "@/hooks/useNftRadioFeed";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tierName: string;
}

const money = (n: number | null) =>
  n == null ? "—" : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EQ_BARS = Array.from({ length: 14 }, (_, i) => i);

const NFTRadioBoard = ({ open, onOpenChange, tierName }: Props) => {
  const { data, isLoading, isError, refetch } = useNftRadioFeed(open);
  const tracks = useMemo(() => data ?? [], [data]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const playable = useMemo(() => tracks.filter((t) => !failed.has(t.id)), [tracks, failed]);
  const current: RadioTrack | undefined = playable[index % Math.max(playable.length, 1)];

  const advance = useCallback(() => {
    setProgress(0);
    setIndex((i) => (playable.length ? (i + 1) % playable.length : 0));
  }, [playable.length]);

  const togglePlay = useCallback(async () => {
    const el = audioRef.current;
    if (!el || !current) return;
    try {
      if (el.paused) {
        setPlaybackError(null);
        await el.play();
        setPlaying(true);
      } else {
        el.pause();
        setPlaying(false);
      }
    } catch (err) {
      console.error("[ERROR] NFTRadioBoard play:", (err as Error)?.message);
      setPlaybackError("Tap play again to start audio on this device.");
      setPlaying(false);
    }
  }, [current]);

  // Volume / mute
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
    el.muted = muted;
  }, [volume, muted]);

  // Load new source and continue playback
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !current) return;
    el.src = current.preview_audio_url;
    el.load();
    if (playing) {
      el.play().catch((err) => {
        console.error("[ERROR] NFTRadioBoard autoplay:", (err as Error)?.message);
        setPlaying(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Release audio when the board closes
  useEffect(() => {
    if (open) return;
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
    setPlaying(false);
    setProgress(0);
  }, [open]);

  const handleError = () => {
    if (!current) return;
    console.error("[ERROR] NFTRadioBoard: preview unavailable for", current.id);
    setFailed((prev) => new Set(prev).add(current.id));
    advance();
  };

  const level = (i: number) => {
    if (!playing) return 0.12;
    const base = Math.sin((progress * 6 + i) * 1.3) * 0.5 + 0.5;
    return 0.2 + base * 0.8;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[100dvh] w-[calc(100vw-1.5rem)] max-w-lg overflow-y-auto border-border/70 bg-zinc-950 p-4 text-zinc-100 sm:p-6">
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-base font-semibold">BIG IDIA Radio Console</DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Curated catalog previews · Tier {tierName}
          </DialogDescription>
        </DialogHeader>

        {/* Digital screen */}
        <div className="rounded-lg border border-primary/30 bg-black/70 p-3 shadow-inner">
          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-xs text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
            </div>
          ) : isError ? (
            <div className="space-y-2 py-4 text-xs text-destructive">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Could not load the catalog.
              </div>
              <Button size="sm" variant="secondary" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : !current ? (
            <p className="py-6 text-xs text-zinc-400">
              No playable tracks are in rotation yet. Curated previews appear here once the catalog syncs.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="truncate font-mono text-sm font-bold text-primary">{current.track_title}</p>
              <p className="truncate text-xs text-zinc-400">{current.artist_name}</p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-mono">
                <div>
                  <span className="block uppercase tracking-wide text-zinc-500">TTM NPS Yield</span>
                  <span className="text-amber-400">{money(current.ttm_nps_yield)}</span>
                </div>
                <div>
                  <span className="block uppercase tracking-wide text-zinc-500">Buyout</span>
                  <span className="text-amber-400">{money(current.buyout_valuation)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <Badge variant="outline" className="border-primary/40 text-[10px] uppercase text-primary">
                  {current.provider}
                </Badge>
                {current.external_url && (
                  <a
                    href={current.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open track with the provider"
                    className="text-zinc-400 hover:text-primary"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* EQ meters */}
        <div className="flex h-16 items-end justify-between gap-[3px] rounded-lg border border-zinc-800 bg-zinc-900 p-2">
          {EQ_BARS.map((i) => (
            <span
              key={i}
              className="flex-1 rounded-sm bg-gradient-to-t from-primary/50 to-amber-400 transition-all duration-150"
              style={{ height: `${level(i) * 100}%` }}
              aria-hidden
            />
          ))}
        </div>

        {/* Transport */}
        <div className="flex items-center gap-2">
          <Button
            size="lg"
            onClick={togglePlay}
            disabled={!current}
            className="h-12 flex-1"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            <span className="ml-2 text-sm">{playing ? "Pause" : "Play"}</span>
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={advance}
            disabled={playable.length < 2}
            className="h-12"
            aria-label="Next track"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setMuted((m) => !m)}
            className="h-12"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
        </div>

        {/* Fader */}
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wide text-zinc-500">Master fader</span>
          <Slider
            value={[Math.round(volume * 100)]}
            onValueChange={(v) => setVolume((v[0] ?? 0) / 100)}
            max={100}
            step={1}
            aria-label="Volume"
          />
        </div>

        {playbackError && <p className="text-[11px] text-amber-400">{playbackError}</p>}

        <audio
          ref={audioRef}
          preload="none"
          onEnded={advance}
          onError={handleError}
          onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default NFTRadioBoard;
