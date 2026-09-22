import { useState } from "react";
import { Radio, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import NFTRadioBoard from "./NFTRadioBoard";

interface Props {
  tierName: string;
}

const BARS = [0.35, 0.7, 0.45, 0.9, 0.55, 0.8, 0.4];

const NFTRadioBanner = ({ tierName }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        aria-label="Launch NFT Radio"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="w-full cursor-pointer overflow-hidden border-primary/40 bg-gradient-to-r from-primary/10 via-background to-background p-3 transition-colors hover:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <span className="absolute inset-0 rounded-full bg-primary/30 motion-safe:animate-ping" aria-hidden />
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/20">
              <Radio className="h-4 w-4 text-primary" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">Listen to NFT Radio – Curated Catalog Streams</p>
            <div className="mt-0.5 flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                Tier: {tierName}
              </Badge>
              <span className="flex h-4 items-end gap-[2px]" aria-hidden>
                {BARS.map((h, i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-sm bg-primary/70 motion-safe:animate-pulse"
                    style={{ height: `${h * 100}%`, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>

          <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
            <Play className="h-3 w-3" /> Tap to Launch
          </span>
        </div>
      </Card>

      <NFTRadioBoard open={open} onOpenChange={setOpen} tierName={tierName} />
    </>
  );
};

export default NFTRadioBanner;
