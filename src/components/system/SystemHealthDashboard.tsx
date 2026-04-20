import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Cpu, Library, Database, Wallet, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the precise indicators based on scheduled edge functions
const INDICATORS = [
  {
    id: "health_sync",
    name: "Apple Health Sync",
    description: "Ingesting user health metrics",
    icon: Activity,
  },
  {
    id: "synapse_controller",
    name: "Synapse Controller",
    description: "Processing & normalization",
    icon: Cpu,
  },
  {
    id: "university_library",
    name: "University Library",
    description: "Best Friend AI shopping curation",
    icon: Library,
  },
  {
    id: "process_delt",
    name: "Process Delt Transfer / Data Sale",
    description: "Executing secure transactions",
    icon: Database,
  },
  {
    id: "wallet_payment",
    name: "User Wallet Royalty Payment",
    description: "Distributing user royalties",
    icon: Wallet,
  },
];

type NodeState = "idle" | "active" | "success" | "error";

export const SystemHealthDashboard = () => {
  const [nodeStates, setNodeStates] = useState<Record<string, NodeState>>(
    INDICATORS.reduce((acc, ind) => ({ ...acc, [ind.id]: "idle" }), {}),
  );

  // Simulation for demonstration of real-time firing (scheduler sequence)
  useEffect(() => {
    let isMounted = true;

    const simulateFlow = () => {
      if (!isMounted) return;
      // Reset previous states to idle
      setNodeStates(INDICATORS.reduce((acc, ind) => ({ ...acc, [ind.id]: "idle" }), {}));

      const fireNode = (index: number) => {
        if (!isMounted) return;
        if (index >= INDICATORS.length) {
          // Wait a few seconds after a full pipeline cycle, then restart
          setTimeout(simulateFlow, 4000);
          return;
        }

        const nodeId = INDICATORS[index].id;

        // 1. Turn the light ON (firing condition)
        setNodeStates((prev) => ({ ...prev, [nodeId]: "active" }));

        // 2. Mark as success, then proceed to the next edge function
        setTimeout(
          () => {
            if (!isMounted) return;
            setNodeStates((prev) => ({ ...prev, [nodeId]: "success" }));
            fireNode(index + 1);
          },
          1200 + Math.random() * 800,
        ); // Random offset for realistic network jitter
      };

      // Initial delay before starting the sequence
      setTimeout(() => fireNode(0), 1000);
    };

    simulateFlow();
    return () => {
      isMounted = false;
    };
  }, []);

  const getStateColor = (state: NodeState) => {
    switch (state) {
      case "active":
        return "bg-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.8)] ring-4 ring-blue-500/50 scale-110 border-transparent";
      case "success":
        return "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400/50 border-transparent";
      case "error":
        return "bg-destructive shadow-[0_0_20px_rgba(220,38,38,0.6)] ring-2 ring-destructive/50 border-transparent";
      default:
        return "bg-slate-900 border-slate-700 text-slate-500 shadow-none scale-100"; // Idle
    }
  };

  const getIconColor = (state: NodeState) => {
    switch (state) {
      case "active":
        return "text-white animate-pulse";
      case "success":
        return "text-emerald-50";
      case "error":
        return "text-white";
      default:
        return "text-slate-500";
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          System Health
          <div className="relative flex h-3 w-3 mt-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
        </h1>
        <p className="text-muted-foreground text-lg">
          Live visualization map tracking automated edge function executions.
        </p>
      </div>

      <Card className="w-full bg-slate-950 border-slate-800 overflow-hidden shadow-2xl relative">
        <CardHeader className="border-b border-slate-800/80 pb-5 bg-slate-900/30">
          <CardTitle className="text-xl">Active Pipeline Graph</CardTitle>
          <CardDescription>Monitoring distributed scheduler operations across the IDIA ecosystem.</CardDescription>
        </CardHeader>

        <CardContent className="p-8 md:p-16 relative">
          {/* Main Visualizer Container */}
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center min-h-[600px] md:min-h-[300px]">
            {/* Background Connection Line (Desktop) */}
            <div className="hidden md:block absolute top-[40px] left-[5%] right-[5%] h-1 bg-slate-800/60 rounded-full z-0" />

            {INDICATORS.map((indicator, index) => {
              const state = nodeStates[indicator.id];
              const Icon = indicator.icon;
              const isActive = state === "active";

              return (
                <div
                  key={indicator.id}
                  className="relative z-10 flex flex-row md:flex-col items-start md:items-center w-full md:w-[18%] gap-6 md:gap-5 group"
                >
                  {/* Background Connection Line (Mobile) */}
                  {index < INDICATORS.length - 1 && (
                    <div className="md:hidden absolute left-[39px] top-[80px] bottom-[-40px] w-1 bg-slate-800/60 rounded-full z-0" />
                  )}

                  {/* Indicator Light / Node */}
                  <div className="relative flex-shrink-0 flex justify-center items-center h-20 w-20">
                    {/* Pulsing ring effect when active */}
                    {isActive && (
                      <div className="absolute inset-0 rounded-full border-2 border-blue-500 animate-ping opacity-70 pointer-events-none" />
                    )}

                    {/* Circle Node */}
                    <div
                      className={cn(
                        "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center border-2 transition-all duration-500 ease-in-out relative z-10",
                        getStateColor(state),
                      )}
                    >
                      <Icon
                        className={cn("w-7 h-7 md:w-8 md:h-8 transition-colors duration-300", getIconColor(state))}
                      />
                    </div>
                  </div>

                  {/* Text Details & Live Labels */}
                  <div className="flex flex-col md:text-center mt-2 flex-1">
                    <h3 className="font-semibold text-slate-200 text-base md:text-lg leading-tight">
                      {indicator.name}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1.5 md:px-2 leading-relaxed">{indicator.description}</p>

                    {/* Status Badge */}
                    <div className="mt-3 text-xs font-medium md:mx-auto inline-flex items-center gap-1.5 min-h-[24px]">
                      {state === "active" && (
                        <span className="text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20 flex items-center gap-1.5">
                          <Activity className="w-3 h-3 animate-spin" /> Processing...
                        </span>
                      )}
                      {state === "success" && (
                        <span className="text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </span>
                      )}
                      {state === "idle" && (
                        <span className="text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 flex items-center gap-1.5">
                          Awaiting Signal
                        </span>
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
