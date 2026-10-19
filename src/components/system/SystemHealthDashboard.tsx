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

const APPLE_SYNC_RECENT_WINDOW_MS = 15 * 60 * 1000;

export const SystemHealthDashboard = () => {
  const [nodeStates, setNodeStates] = useState<Record<string, boolean>>({});
  const [activeLog, setActiveLog] = useState<string>("PIPELINE STANDBY");
  const [lastAppleSyncAt, setLastAppleSyncAt] = useState<Date | null>(null);
  const [, setClockTick] = useState(0);

  // The Apple Health Sync pulse only flashes for 3s per insert, and staged
  // inserts land a handful of times per hour — easy to miss. Track the latest
  // staged row so the indicator stays lit while the pipeline is recently active.
  useEffect(() => {
    let cancelled = false;

    const fetchLastSync = async () => {
      const { data } = await supabase
        .from("staged_health_data")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setLastAppleSyncAt(data?.created_at ? new Date(data.created_at) : null);
    };

    fetchLastSync();
    const poll = setInterval(fetchLastSync, 60_000);
    const clock = setInterval(() => setClockTick((t) => t + 1), 30_000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(clock);
    };
  }, []);

  useEffect(() => {
    // Ecosystem-wide pulses. Emitted by DB triggers via realtime.send() on a
    // private broadcast channel, so the indicators fire for ANY user's activity
    // (RLS-scoped postgres_changes only ever showed the signed-in user's rows).
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const start = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }
      if (cancelled) return;

      channel = supabase
        .channel("protocol-stream", { config: { private: true, broadcast: { self: true } } })
        .on("broadcast", { event: "pulse" }, (msg) => {
          const raw = msg as any;
          const p = raw?.payload?.payload ?? raw?.payload ?? {};
          const stage = p.stage as string | undefined;
          if (!stage) return;
          if (stage === "process-data-sale") {
            // let the Amber (AI) pulse land first
            setTimeout(() => pulseNode(stage, p.label || "LIABILITY SHIELD MINTED"), 800);
            return;
          }
          pulseNode(stage, p.label || String(stage).toUpperCase());
        })
        .subscribe();
    };

    start();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
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
              const isAppleSync = indicator.id === "apple-health-sync";
              const appleSyncRecent =
                isAppleSync &&
                lastAppleSyncAt !== null &&
                Date.now() - lastAppleSyncAt.getTime() < APPLE_SYNC_RECENT_WINDOW_MS;
              const isLit = isPulse || appleSyncRecent;
              const Icon = indicator.icon;
              return (
                <div key={indicator.id} className="relative z-10 flex flex-col items-center w-full md:w-[18%] gap-6">
                  <div
                    className={cn(
                      "w-32 h-32 rounded-[2.5rem] flex items-center justify-center transition-all duration-500 border-[6px]",
                      isLit
                        ? `${indicator.activeColor} border-white shadow-2xl ${
                            isPulse ? `scale-125 ring-[18px] ${indicator.ringColor}` : `ring-[6px] ${indicator.ringColor}`
                          }`
                        : "bg-white border-slate-50 text-slate-100",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-14 h-14 transition-all duration-500",
                        isLit ? "text-white scale-110 animate-pulse" : "text-slate-100",
                      )}
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-black text-slate-900 text-xl tracking-tighter">{indicator.name}</h3>
                    {isAppleSync && (
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-tight text-slate-400">
                        {lastAppleSyncAt
                          ? `Last sync ${lastAppleSyncAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : "No sync recorded"}
                      </p>
                    )}
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
