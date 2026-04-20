import React, { useEffect, useState } from "react";
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

type NodeState = "idle" | "active" | "success";

export const SystemHealthDashboard = () => {
  const [nodeStates, setNodeStates] = useState<Record<string, NodeState>>(
    INDICATORS.reduce((acc, ind) => ({ ...acc, [ind.id]: "idle" }), {}),
  );

  useEffect(() => {
    let isMounted = true;
    const simulateFlow = () => {
      if (!isMounted) return;
      setNodeStates(INDICATORS.reduce((acc, ind) => ({ ...acc, [ind.id]: "idle" }), {}));

      const fireNode = (index: number) => {
        if (!isMounted || index >= INDICATORS.length) {
          setTimeout(simulateFlow, 4000);
          return;
        }

        const node = INDICATORS[index];
        setNodeStates((prev) => ({ ...prev, [node.id]: "active" }));

        setTimeout(
          () => {
            if (!isMounted) return;
            setNodeStates((prev) => ({ ...prev, [node.id]: "success" }));
            fireNode(index + 1);
          },
          1500 + Math.random() * 1000,
        );
      };

      setTimeout(() => fireNode(0), 1000);
    };

    simulateFlow();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto bg-white min-h-screen">
      <div className="flex flex-col gap-2 mb-10">
        <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
          IDIA Pipeline Monitor
          <span className="flex h-4 w-4 relative">
            <span className="animate-ping absolute h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative rounded-full h-4 w-4 bg-indigo-600"></span>
          </span>
        </h1>
        <p className="text-slate-500 text-xl font-medium">
          Live visualization of automated DELT-Protocol data streams.
        </p>
      </div>

      <Card className="w-full bg-white border-slate-200 overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.1)] rounded-[3rem]">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-10">
          <CardTitle className="text-2xl font-bold text-slate-800">Edge Function Orchestration</CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Active session tracking for {INDICATORS.length} core pipeline nodes.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-12 md:p-24 relative bg-white">
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center min-h-[500px] md:min-h-[240px]">
            {/* Connector Track */}
            <div className="hidden md:block absolute top-[60px] left-[10%] right-[10%] h-2 bg-slate-100 rounded-full z-0" />

            {INDICATORS.map((indicator) => {
              const state = nodeStates[indicator.id];
              const Icon = indicator.icon;

              return (
                <div
                  key={indicator.id}
                  className="relative z-10 flex flex-row md:flex-col items-center w-full md:w-[18%] gap-8"
                >
                  {/* Process Node */}
                  <div
                    className={cn(
                      "w-28 h-28 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 shadow-2xl border-[6px]",
                      state === "active"
                        ? `${indicator.activeColor} scale-110 border-white ring-[16px] ${indicator.ringColor}`
                        : state === "success"
                          ? "bg-white border-emerald-500 shadow-emerald-50"
                          : "bg-white border-slate-50 text-slate-200",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-12 h-12 transition-all duration-500",
                        state === "active"
                          ? "text-white scale-110 animate-pulse"
                          : state === "success"
                            ? "text-emerald-500"
                            : "text-slate-200",
                      )}
                    />
                  </div>

                  <div className="flex flex-col md:text-center space-y-2">
                    <h3 className="font-extrabold text-slate-900 text-xl tracking-tight">{indicator.name}</h3>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">
                      {indicator.description}
                    </p>

                    <div className="pt-4 flex justify-center">
                      {state === "active" ? (
                        <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-5 py-2 rounded-2xl border border-indigo-100 animate-bounce">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                          <span className="text-xs font-black uppercase tracking-tighter">Running</span>
                        </div>
                      ) : state === "success" ? (
                        <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-5 py-2 rounded-2xl border border-emerald-100">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-tighter">Settled</span>
                        </div>
                      ) : (
                        <div className="text-slate-300 bg-slate-50 px-5 py-2 rounded-2xl border border-slate-100">
                          <span className="text-xs font-black uppercase tracking-tighter text-slate-300">
                            Awaiting Signal
                          </span>
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

export default SystemHealthDashboard;
