import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Cpu, Library, Database, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const INDICATORS = [
  {
    id: "apple-health-sync",
    name: "Apple Health Sync",
    icon: Activity,
    activeColor: "bg-rose-500",
    ringColor: "ring-rose-200",
  },
  {
    id: "synapse-controller",
    name: "Synapse Engine",
    icon: Cpu,
    activeColor: "bg-indigo-600",
    ringColor: "ring-indigo-200",
  },
  {
    id: "best-friend-ai",
    name: "Best Friend AI",
    icon: Library,
    activeColor: "bg-amber-500",
    ringColor: "ring-amber-200",
  },
  {
    id: "process-data-sale",
    name: "Shielding",
    icon: Database,
    activeColor: "bg-cyan-500",
    ringColor: "ring-cyan-200",
  },
  {
    id: "royalty-distribution",
    name: "Royalty Payment",
    icon: Wallet,
    activeColor: "bg-emerald-500",
    ringColor: "ring-emerald-200",
  },
];

export const SystemHealthDashboard = () => {
  const [nodeStates, setNodeStates] = useState<Record<string, boolean>>({});
  const [activeLog, setActiveLog] = useState<string>("PIPELINE STANDBY");

  useEffect(() => {
    const channel = supabase
      .channel("protocol-realtime-v5")

      // STAGE 1: Ingestion Heartbeat (Rose)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "raw_health_data" }, () => {
        pulseNode("apple-health-sync", "INGESTION_STAGED");
      })

      // STAGES 2 & 5: The Economic Ledger (Indigo & Emerald)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "synapse_credit_ledger" }, (payload) => {
        const { entry_type, description } = payload.new;

        if (entry_type === "USAGE") {
          pulseNode("synapse-controller", "GAS_BURN_EXECUTED");
        }

        if (entry_type === "ROYALTY") {
          pulseNode("royalty-distribution", "ROYALTY_DISTRIBUTED");
        }

        setActiveLog(description || `LEDGER: ${entry_type}`);
      })

      // STAGES 3 & 4: Egress & DELT (Amber & Cyan)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "egress_logs" }, (payload) => {
        const { egress_type, liability_token_hash } = payload.new;

        if (egress_type === "PURCHASE") {
          // STAGE 4: Cyan pulses for the DELT Minting event
          pulseNode("process-data-sale", `DELT MINTED: ${liability_token_hash?.slice(0, 8)}`);
        } else {
          // STAGE 3: Amber pulses for standard AI Query
          pulseNode("best-friend-ai", "AI_EGRESS_VERIFIED");
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const pulseNode = (nodeId: string, status: string) => {
    setActiveLog(status);
    setNodeStates((prev) => ({ ...prev, [nodeId]: true }));
    setTimeout(() => setNodeStates((prev) => ({ ...prev, [nodeId]: false })), 3000);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto bg-white min-h-screen font-sans">
      <div className="flex flex-col gap-2 mb-10">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Protocol Stream</h1>
        <div className="flex items-center gap-3 text-slate-500 font-mono text-xs bg-slate-50 px-4 py-2 rounded-2xl w-fit border border-slate-100 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-700 uppercase tracking-tighter">{activeLog}</span>
        </div>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden bg-white">
        <CardContent className="p-20 md:p-32 relative">
          <div className="relative flex flex-col md:flex-row justify-between items-center min-h-[300px]">
            <div className="hidden md:block absolute top-[64px] left-[10%] right-[10%] h-2 bg-slate-50 rounded-full z-0" />
            {INDICATORS.map((indicator) => {
              const isPulse = !!nodeStates[indicator.id];
              const Icon = indicator.icon;
              return (
                <div key={indicator.id} className="relative z-10 flex flex-col items-center w-full md:w-[18%] gap-6">
                  <div
                    className={cn(
                      "w-32 h-32 rounded-[2.5rem] flex items-center justify-center transition-all duration-500 border-[6px]",
                      isPulse
                        ? `${indicator.activeColor} scale-125 border-white ring-[18px] ${indicator.ringColor} shadow-2xl`
                        : "bg-white border-slate-50 text-slate-100",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-14 h-14 transition-all duration-500",
                        isPulse ? "text-white scale-110 animate-pulse" : "text-slate-100",
                      )}
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-black text-slate-900 text-xl tracking-tighter">{indicator.name}</h3>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
