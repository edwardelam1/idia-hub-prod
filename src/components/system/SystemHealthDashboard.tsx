import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Cpu, Library, Database, Wallet, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the precise indicators based on your scheduled edge functions
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
    description: "Processing & normalization engine",
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
    description: "Executing secure data transactions",
    icon: Database,
  },
  {
    id: "wallet_payment",
    name: "IDIA Life User Wallet Royalty Payment",
    description: "Distributing user royalties",
    icon: Wallet,
  },
];

export const SystemHealthDashboard = () => {
  // State to track the condition of each indicator light: 'idle', 'active', 'success', 'error'
  const [nodeStates, setNodeStates] = useState<Record<string, "idle" | "active" | "success" | "error">>(
    INDICATORS.reduce((acc, ind) => ({ ...acc, [ind.id]: "idle" }), {}),
  );

  // Simulation for demonstration of real-time firing (since they are on a scheduler)
  // In production, wire this to your Supabase Realtime channel or function log listeners.
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

      // Start firing sequence
      fireNode(0);
    };

    simulateFlow();
    return () => {
      isMounted = false;
    };
  }, []);

  // Determines the dynamic "light" ring colors based on the node condition
  const getStateColor = (state: string) => {
    switch (state) {
      case "active":
        return "bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] border-blue-400 scale-110";
      case "success":
        return "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] border-emerald-400";
      case "error":
        return "bg-destructive shadow-[0_0_15px_rgba(220,38,38,0.6)] border-destructive";
      default:
        return "bg-slate-800 border-slate-700 text-slate-500"; // Dark/Idle
    }
  };

  const getIconColor = (state: string) => {
    switch (state) {
      case "active":
        return "text-white animate-pulse";
      case "success":
        return "text-emerald-100";
      case "error":
        return "text-white";
      default:
        return "text-slate-500";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">System Health Visualizer</h1>
        <p className="text-muted-foreground">
          Real-time map tracking automated edge function executions across the IDIA ecosystem.
        </p>
      </div>

      <Card className="w-full bg-slate-950/40 border-slate-800 overflow-hidden shadow-2xl">
        <CardHeader className="border-b border-slate-800/60 pb-5">
          <CardTitle className="text-xl flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            Live Pipeline Array
          </CardTitle>
          <CardDescription>Monitoring scheduler and trigger-based data flow operations in real time.</CardDescription>
        </CardHeader>

        <CardContent className="p-8 md:p-14">
          {/* Visualizer Map Container */}
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center min-h-[450px] md:min-h-[280px] max-w-7xl mx-auto">
            {/* Desktop Background Connection Line */}
            <div className="hidden md:block absolute top-[32px] left-8 right-8 h-1 bg-slate-800 z-0 rounded-full" />

            {INDICATORS.map((indicator, index) => {
              const state = nodeStates[indicator.id];
              const Icon = indicator.icon;
              const isActive = state === "active";

              return (
                <div
                  key={indicator.id}
                  className="relative z-10 flex flex-row md:flex-col items-center gap-6 md:gap-5 w-full md:w-[18%] group"
                >
                  {/* Mobile Connecting Line */}
                  {index < INDICATORS.length - 1 && (
                    <div className="md:hidden absolute left-[31px] top-[64px] bottom-[-40px] w-1 bg-slate-800 z-0 rounded-full" />
                  )}

                  {/* Indicator Light / Node */}
                  <div className="relative flex-shrink-0 flex justify-center items-center">
                    {/* Expanded pulsing ring effect when active */}
                    {isActive && (
                      <div className="absolute inset-[-8px] rounded-full border-2 border-blue-500 animate-ping opacity-60 pointer-events-none" />
                    )}

                    {/* Circle Node */}
                    <div
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-500 ease-in-out relative z-10",
                        getStateColor(state),
                      )}
                    >
                      <Icon className={cn("w-7 h-7 transition-colors duration-300", getIconColor(state))} />
                    </div>
                  </div>

                  {/* Text Details & Live Labels */}
                  <div className="flex flex-col md:text-center mt-1">
                    <h3 className="font-semibold text-slate-200 text-sm md:text-base leading-tight">
                      {indicator.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 md:px-2 leading-relaxed">{indicator.description}</p>

                    {/* Status Badge */}
                    <div className="mt-3 text-xs font-medium md:mx-auto inline-flex items-center gap-1.5 min-h-[20px]">
                      {state === "active" && (
                        <span className="text-blue-400 flex items-center gap-1.5">
                          <Activity className="w-3 h-3 animate-spin" /> Processing...
                        </span>
                      )}
                      {state === "success" && (
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3" /> Complete
                        </span>
                      )}
                      {state === "idle" && <span className="text-slate-600">Awaiting Signal</span>}
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
