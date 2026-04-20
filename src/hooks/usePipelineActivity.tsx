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
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string>("Awaiting protocol signal...");

  useEffect(() => {
    // 1. Subscribe to Live Ledger & Egress Events
    const channel = supabase
      .channel("schema-db-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "synapse_credit_ledger" }, (payload) => {
        const type = payload.new.transaction_type;
        const entry = payload.new.entry_type;

        // Map Backend Ledger events to UI Indicators
        if (type === "FEE") triggerNode("synapse-controller");
        if (type === "DATA_SALE") triggerNode("process-data-sale");
        if (entry === "ROYALTY" || entry === "reward") triggerNode("royalty-distribution");

        setLastEvent(`Ledger Update: ${payload.new.description}`);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "egress_logs" }, (payload) => {
        // Egress logs indicate an active data transfer or AI search
        triggerNode("best-friend-ai");
        setLastEvent(`Egress Logged: ${payload.new.egress_type}`);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const triggerNode = (nodeId: string) => {
    setActiveNode(nodeId);
    // Keep the node "Active" for 3 seconds to visualize the pulse, then return to success/idle
    setTimeout(() => setActiveNode(null), 3000);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto bg-white min-h-screen font-sans">
      <div className="flex flex-col gap-2 mb-10">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
          Live Pipeline Monitor
          <span className="flex h-4 w-4 relative">
            <span className="animate-ping absolute h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative rounded-full h-4 w-4 bg-indigo-600"></span>
          </span>
        </h1>
        <div className="flex items-center gap-2 text-slate-500 font-mono text-sm bg-slate-50 px-3 py-1 rounded-md w-fit border border-slate-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {lastEvent}
        </div>
      </div>

      <Card className="w-full bg-white border-slate-200 overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] rounded-[3rem]">
        <CardContent className="p-12 md:p-24 relative bg-white">
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center min-h-[500px] md:min-h-[240px]">
            <div className="hidden md:block absolute top-[60px] left-[10%] right-[10%] h-2 bg-slate-100 rounded-full z-0" />

            {INDICATORS.map((indicator) => {
              const isActive = activeNode === indicator.id;
              const Icon = indicator.icon;

              return (
                <div
                  key={indicator.id}
                  className="relative z-10 flex flex-row md:flex-col items-center w-full md:w-[18%] gap-8"
                >
                  <div
                    className={cn(
                      "w-28 h-28 rounded-[2.5rem] flex items-center justify-center transition-all duration-500 border-[6px]",
                      isActive
                        ? `${indicator.activeColor} scale-110 border-white ring-[16px] ${indicator.ringColor} shadow-2xl`
                        : "bg-white border-slate-50 text-slate-200 shadow-sm",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-12 h-12 transition-all duration-500",
                        isActive ? "text-white scale-110 animate-pulse" : "text-slate-200",
                      )}
                    />
                  </div>

                  <div className="flex flex-col md:text-center space-y-2">
                    <h3 className="font-extrabold text-slate-900 text-xl tracking-tight">{indicator.name}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-tight">
                      {indicator.description}
                    </p>

                    <div className="pt-4 flex justify-center">
                      {isActive ? (
                        <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-5 py-2 rounded-2xl border border-indigo-100 shadow-sm">
                          <span className="text-[10px] font-black uppercase tracking-tighter">Live Traffic</span>
                        </div>
                      ) : (
                        <div className="text-slate-300 bg-slate-50/50 px-5 py-2 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-black uppercase tracking-tighter">Standby</span>
                        </div>
                      )}
                    </div>
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
