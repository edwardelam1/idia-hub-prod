import { CircleDollarSign } from "lucide-react";

const StablecoinPanel = () => {
  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Stablecoin</span>
        <CircleDollarSign className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="mt-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold font-mono">$0.0000</span>
          <span className="text-[10px] text-muted-foreground">USDC</span>
        </div>
        <p className="text-[10px] text-muted-foreground">BASE Network</p>
      </div>
    </div>
  );
};

export default StablecoinPanel;
