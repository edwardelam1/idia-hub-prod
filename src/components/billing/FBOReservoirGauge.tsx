import { Landmark } from "lucide-react";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";

const FBOReservoirGauge = () => {
  const { balanceData } = useSynapseCredits();
  const fbo = balanceData?.fbo_balance ?? null;

  return (
    <div className="flex flex-col justify-between h-full">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          FBO Reservoir
        </span>
        <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="mt-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold font-mono">
            {fbo == null
              ? "--"
              : `$${fbo.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
          <span className="text-[10px] text-muted-foreground">USD</span>
        </div>
        <p className="text-[10px] text-muted-foreground">JPM Custody</p>
      </div>
    </div>
  );
};

export default FBOReservoirGauge;
