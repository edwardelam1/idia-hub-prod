import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Cpu, Library, Database, Wallet, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const INDICATORS = [
  {
    id: "apple-health-sync",
    name: "Apple Health Sync",
    description: "DELT-Verified HK Normalization",
    icon: Activity,
    activeColor: "bg-rose-500",
    ringColor: "ring-rose-100",
  },
  {
    id: "synapse-controller",
    name: "Synapse Controller",
    description: "Flat-Rate Gas & Egress Billing",
    icon: Cpu,
    activeColor: "bg-indigo-600",
    ringColor: "ring-indigo-100",
  },
  {
    id: "best-friend-ai",
    name: "Best Friend AI",
    description: "Library Omni-Fetch & Analysis",
    icon: Library,
    activeColor: "bg-amber-500",
    ringColor: "ring-amber-100",
  },
  {
    id: "process-data-sale",
    name: "Data Sale / DELT",
    description: "60/30/10 Protocol Settlement",
    icon: Database,
    activeColor: "bg-cyan-500",
    ringColor: "ring-cyan-100",
  },
  {
    id: "royalty-distribution",
    name: "Royalty Payment",
    description: "Settling User Ledger Rewards",
    icon: Wallet,
    activeColor: "bg-emerald-500",
    ringColor: "ring-emerald-100",
  },
];

export const SystemHealthDashboard = () => {
  // Use a Record to track multiple simultaneous active nodes independently
  const [nodeStates, setNodeStates] = useState<Record<string, boolean>>({});
  const [protocolLog, setProtocolLog] = useState<string>("SYSTEM_STANDBY");

  useEffect(() => {
    const channel = supabase
      .channel("protocol-live-v4")
      // STAGE 1: Real Ingestion Pulse
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "raw_health_data" }, () => {
        activateNode("apple-health-sync", "DATA_STAGED");
      })
      // STAGE 2, 4, 5: Economic Pulses
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "synapse_credit_ledger" }, (payload) => {
        const { transaction_type, entry_type, description } = payload.new;
        if (transaction_type === "FEE") activateNode("synapse-controller", "GAS_BILLED");
        if (transaction_type === "DATA_SALE") activateNode("process-data-sale", "SETTLEMENT_ACTIVE");
        if (entry_type === "ROYALTY") activateNode("royalty-distribution", "WALLET_CREDITED");
        setProtocolLog(description);
      })
      // STAGE 3: AI Intelligence Pulse
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "egress_logs" }, (payload) => {
        activateNode("best-friend-ai", `RESEARCH: ${payload.new.egress_type}`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const activateNode = (nodeId: string, status: string) => {
    setNodeStates((prev) => ({ ...prev, [nodeId]: true }));
    setProtocolLog(status);
    // Node stays active for 4s then returns to idle state autonomously
    setTimeout(() => setNodeStates((prev) => ({ ...prev, [nodeId]: false })), 4000);
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto bg-white min-h-screen">
      <div className="flex flex-col gap-3 mb-12">
        <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase">Ecosystem Pipeline</h1>
        <div className="flex items-center gap-3 text-slate-500 font-mono text-sm bg-slate-50 px-4 py-2 rounded-2xl w-fit border border-slate-100 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-700">{protocolLog}</span>
        </div>
      </div>

      <Card className="w-full bg-white border-slate-200 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.06)] rounded-[4rem] overflow-hidden">
        <CardContent className="p-20 md:p-32 relative">
          <div className="relative flex flex-col md:flex-row justify-between items-center min-h-[300px] gap-12 md:gap-0">
            {/* Background Track */}
            <div className="hidden md:block absolute top-[64px] left-[10%] right-[10%] h-2 bg-slate-100 rounded-full z-0" />

            {INDICATORS.map((indicator) => {
              const isActive = !!nodeStates[indicator.id];
              const Icon = indicator.icon;

              return (
                <div key={indicator.id} className="relative z-10 flex flex-col items-center w-full md:w-[18%] gap-6">
                  <div
                    className={cn(
                      "w-32 h-32 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 border-[6px]",
                      isActive
                        ? `${indicator.activeColor} scale-125 border-white ring-[20px] ${indicator.ringColor} shadow-2xl`
                        : "bg-white border-slate-50 text-slate-200",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-14 h-14 transition-all duration-500",
                        isActive ? "text-white scale-110 animate-pulse" : "text-slate-200",
                      )}
                    />
                  </div>

                  <div className="flex flex-col text-center space-y-1">
                    <h3 className="font-black text-slate-900 text-xl tracking-tighter">{indicator.name}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      {indicator.description}
                    </p>
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
