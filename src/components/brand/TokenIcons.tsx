import synapse from "@/assets/synapse-credit.png.asset.json";
import synapse3d from "@/assets/synapse-credit-3d.png.asset.json";
import idia from "@/assets/idia-token.png.asset.json";
import idia3d from "@/assets/idia-token-3d.png.asset.json";
import usdc from "@/assets/usdc.png.asset.json";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  variant?: "flat" | "3d";
}

const make = (flat: string, three: string, alt: string) =>
  ({ className, variant = "flat" }: Props) => (
    <img
      src={variant === "3d" ? three : flat}
      alt={alt}
      draggable={false}
      className={cn("h-4 w-4 shrink-0 rounded-full object-cover", className)}
    />
  );

export const SynapseCreditIcon = make(synapse.url, synapse3d.url, "Synapse Credit");
export const IdiaTokenIcon = make(idia.url, idia3d.url, "IDIA Token");
export const UsdcIcon = make(usdc.url, usdc.url, "USDC");
