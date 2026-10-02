import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import banner from "@/assets/big-idia-radio-banner.png.asset.json";

const NFTRadioBanner = () => {
  return (
    <div className="w-full min-w-0">
      <img src={banner.url} alt="BIG IDIA Radio — a marketplace for fans and a funding source for artists" className="block h-auto w-full" />
      <div className="flex justify-end pt-2">
        <Button type="button" onClick={() => window.dispatchEvent(new Event("big-idia-radio:open"))} aria-label="Launch BIG IDIA Radio">
          <Play className="mr-2 h-4 w-4" /> Launch Radio
        </Button>
      </div>
    </div>
  );
};

export default NFTRadioBanner;
