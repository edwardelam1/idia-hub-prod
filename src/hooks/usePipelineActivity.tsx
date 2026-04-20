import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Cpu, Library, Database, Wallet, CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const INDICATORS = [
  {
    id: "apple-health-sync",
    name: "Apple Health Sync",
    description: "DELT Verification & HK Ingestion",
    icon: Activity,
    activeColor: "bg-rose-500",
    ringColor: "ring-rose-200",
  },
  {
    id: "synapse-controller",
    name: "Synapse Controller",
    description: "Gas Metering & Token Minting",
    icon: Cpu,
    activeColor: "bg-indigo-600",
    ringColor: "ring-indigo-200",
  },
  {
    id: "best-friend-ai",
    name: "Best Friend AI",
    description: "Library Omni-Fetch & Analysis",
    icon: Library,
    activeColor: "bg-amber-500",
    ringColor: "ring-amber-200",
  },
  {
    id: "process-data-sale",
    name: "Data Sale / DELT",
    description: "60/30/10 Protocol Settlement",
    icon: Database,
    activeColor: "bg-cyan-500",
    ringColor: "ring-cyan-200",
  },
  {
    id: "royalty-distribution",
    name: "Royalty Payment",
    description: "Settling User Ledger Rewards",
    icon: Wallet,
    activeColor: "bg-emerald-500",
    ringColor: "ring-emerald-200",
  },
];

export const SystemHealthDashboard = () => {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [pipelineState, setPipelineState] = useState<string>("SYSTEM_IDLE");
  const [lastTx, setLastTx] = useState<string | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("protocol-live-stream")
      // STAGE 1: Ingestion
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "raw_health_data" }, () => {
        triggerNode("apple-health-sync", "INGESTION_ACTIVE");
      })
      // STAGE 2 & 4: Billing & Sale
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "synapse_credit_ledger" }, (payload) => {
        const { transaction_type, entry_type, description, reference_id } = payload.new;
        setLastTx(reference_id);

        if (transaction_type === "FEE") triggerNode("synapse-controller", "BILLING_SETTLED");
        if (transaction_type === "DATA_SALE") triggerNode("process-data-sale", "SETTLEMENT_ACTIVE");
        if (entry_type === "ROYALTY") triggerNode("royalty-distribution", "WALLET_CREDITED");
      })
      // STAGE 3: AI Analysis
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "egress_logs" }, () => {
        triggerNode("best-friend-ai", "RESEARCH_IN_PROGRESS");
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const triggerNode = (nodeId: string, statusLabel: string) => {
    setActiveNode(nodeId);
    setPipelineState(statusLabel);
    // Pulse persists while the DB transaction propagates
    setTimeout(() => {
      setActiveNode(null);
      setPipelineState("SYSTEM_READY");
    }, 4000);
  };

  return (
    <div className="p-6 md:p-12 space-y-8 max-w-7xl mx-auto bg-white min-h-screen selection:bg-indigo-100">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full w-fit">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">DELT Protocol v4.2</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-slate-900">Pipeline Monitor</h1>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl flex items-center gap-4 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Current Status</span>
            <span className="text-sm font-black text-slate-700 font-mono">{pipelineState}</span>
          </div>
          <div className="h-8 w-[1px] bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Last Reference</span>
            <span className="text-sm font-black text-slate-700 font-mono">{lastTx?.slice(0, 8) || "N/A"}</span>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] rounded-[4rem] overflow-hidden bg-white">
        <CardContent className="p-16 md:p-32 relative">
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center min-h-[400px]">
            {/* The "Neural Track" */}
            <div className="hidden md:block absolute top-[60px] left-[10%] right-[10%] h-3 bg-slate-50 rounded-full overflow-hidden">
              {activeNode && <div className="h-full bg-indigo-500 animate-pulse w-full opacity-20" />}
            </div>

            {INDICATORS.map((indicator) => {
              const isActive = activeNode === indicator.id;
              const Icon = indicator.icon;

              return (
                <div
                  key={indicator.id}
                  className="relative z-10 flex flex-row md:flex-col items-center w-full md:w-[18%] gap-10 group"
                >
                  <div
                    className={cn(
                      "w-32 h-32 rounded-[3rem] flex items-center justify-center transition-all duration-700 border-[8px]",
                      isActive
                        ? `${indicator.activeColor} scale-125 border-white ring-[24px] ${indicator.ringColor} shadow-2xl`
                        : "bg-white border-slate-50 text-slate-200 shadow-xl",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-14 h-14 transition-all duration-500",
                        isActive ? "text-white scale-110 animate-pulse" : "text-slate-200",
                      )}
                    />
                  </div>

                  <div className="flex flex-col md:text-center space-y-2">
                    <h3 className="font-black text-slate-900 text-2xl tracking-tighter leading-none">
                      {indicator.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                      {indicator.description}
                    </p>

                    <div className="pt-4 flex justify-center">
                      {isActive ? (
                        <div className="bg-slate-900 text-white px-6 py-2 rounded-2xl shadow-lg animate-bounce">
                          <span className="text-[10px] font-black uppercase tracking-widest">Active Pulse</span>
                        </div>
                      ) : (
                        <div className="h-8" />
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
