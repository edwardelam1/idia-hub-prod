import { RefreshCw } from "lucide-react";
import { SynapseCreditIcon } from "@/components/brand/TokenIcons";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";

const SynapseGasGauge = () => {
  const { balanceData, refreshBalance } = useSynapseCredits();
  const credits = balanceData?.available_credits ?? 0;
  return (
    <div className="p-3 bg-black/20 rounded-lg border border-primary/20">
      <div className="flex justify-between items-center text-primary mb-2">
        <div className="flex items-center gap-1.5">
          <SynapseCreditIcon className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Synapse Gas</span>
        </div>
        <button onClick={refreshBalance}>
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-mono font-bold text-primary">{Math.floor(credits).toLocaleString()}</span>
        <span className="text-[10px] font-bold text-primary/70">Credits</span>
      </div>
    </div>
  );
};

export default SynapseGasGauge;
export { SynapseGasGauge };
