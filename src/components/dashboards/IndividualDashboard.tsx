import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { useBillingData } from "@/hooks/useBillingData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Database,
  BrainCircuit,
  BarChart3,
  BookOpen,
  FileKey,
  ArrowUpRight,
  Wallet,
  Zap,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import SynapseVisualizer from "@/components/visualizer/SynapseVisualizer";

const IndividualDashboard = () => {
  const { user, piiData } = useAuth();
  const { protocolState, isLoading: creditsLoading } = useSynapseCredits();
  const { currentUsage } = useBillingData();
  const navigate = useNavigate();

  const activeUserId = user?.user_id || (user as any)?.id;

  // SOVEREIGN RAIL MAPPING
  const rail1_Operating = protocolState?.hub_operating_cash ?? 0;
  const rail2_Gas = protocolState?.synapse_gas_credits ?? 0;
  const rail3_Stablecoin = protocolState?.stablecoin_balance ?? 0;
  const silo3_LifeYield = protocolState?.fbo_royalty_balance ?? 0;

  const { data: stats } = useQuery({
    queryKey: ["hub-personal-stats", activeUserId],
    queryFn: async () => {
      if (!activeUserId) return { activeSources: 0, auditLogs: 0 };
      const [sourcesRes, auditsRes] = await Promise.all([
        supabase
          .from("data_connections")
          .select("*", { count: "exact", head: true })
          .eq("user_id", activeUserId)
          .eq("is_active", true),
        supabase.from("egress_logs").select("*", { count: "exact", head: true }).eq("user_id", activeUserId),
      ]);
      return { activeSources: sourcesRes.count || 0, auditLogs: auditsRes.count || 0 };
    },
    enabled: !!activeUserId,
  });

  return (
    <div className="flex flex-col h-full font-sans max-w-full mx-auto w-full px-4 py-2 space-y-3 overflow-hidden">
      {/* HEADER: COMPACT IDENTITY */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            {piiData?.displayName ? `${piiData.displayName}'s IDIA` : "IDIA Hub"}
          </h1>
          <div className="flex items-center gap-2 text-[10px] font-mono bg-muted/30 px-2 py-0.5 rounded border border-white/5">
            <span className="text-muted-foreground uppercase opacity-50">GUID</span>
            <span className="text-primary font-bold">{activeUserId?.substring(0, 18)}...</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-[9px] border-primary/20 text-primary px-2 py-0">
            {creditsLoading ? "SYNCING..." : "SETTLED"}
          </Badge>
          <ShieldCheck className="h-4 w-4 text-primary opacity-50" />
        </div>
      </div>

      {/* NEURAL VISUALIZER: CONSTRAINED HEIGHT FOR VIEWPORT INTEGRITY */}
      <Card className="border-primary/10 bg-black/40 overflow-hidden relative min-h-[160px] max-h-[180px]">
        <div className="absolute top-2 left-3 z-10">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Synapse Neural Visualizer
          </span>
        </div>
        <CardContent className="p-0 h-full">
          <SynapseVisualizer />
        </CardContent>
      </Card>

      {/* THE FOUR-RAIL OPERATING GRID: ONE FLUID VIEW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* RAIL 1: OPERATING (FIAT) */}
        <Card className="bg-black/60 border-white/5 p-3 flex flex-col justify-between min-h-[100px]">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Wallet className="h-3 w-3" /> Operating Cash
          </h3>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-bold">
              ${rail1_Operating.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] font-bold text-muted-foreground">USD</span>
          </div>
          <Progress value={100} className="h-0.5 mt-2 bg-white/5" />
        </Card>

        {/* RAIL 2: GAS (COMPUTATIONAL) */}
        <Card className="bg-primary/5 border-primary/20 p-3 flex flex-col justify-between min-h-[100px]">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Zap className="h-3 w-3 fill-primary" /> Synapse Gas
          </h3>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-bold text-primary">{rail2_Gas.toLocaleString()}</span>
            <span className="text-[9px] font-bold text-primary/70">CREDITS</span>
          </div>
          <Progress value={100} className="h-0.5 mt-2 bg-primary/20" />
        </Card>

        {/* RAIL 3: STABLECOIN (LIQUIDITY) */}
        <Card className="bg-amber-500/5 border-amber-500/10 p-3 flex flex-col justify-between min-h-[100px]">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
            <TrendingUp className="h-3 w-3" /> Liquidity Rail
          </h3>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-bold text-amber-500">{rail3_Stablecoin.toLocaleString()}</span>
            <span className="text-[9px] font-bold text-amber-500/70">BETA</span>
          </div>
          <Progress value={100} className="h-0.5 mt-2 bg-amber-500/20" />
        </Card>

        {/* SILO 3: LIFE YIELD (FIAT) */}
        <Card className="bg-emerald-500/5 border-emerald-500/10 p-3 flex flex-col justify-between min-h-[100px]">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
            <Sparkles className="h-3 w-3" /> Life Yield
          </h3>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-mono font-bold text-emerald-500">
              ${silo3_LifeYield.toLocaleString(undefined, { minimumFractionDigits: 4 })}
            </span>
            <span className="text-[9px] font-bold text-emerald-500/70">USD</span>
          </div>
          <Progress value={100} className="h-0.5 mt-2 bg-emerald-500/20" />
        </Card>
      </div>

      {/* CORE STATS & TABS */}
      <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <TabsList className="w-fit bg-transparent border-b border-white/5 rounded-none h-8 p-0 gap-6">
          <TabsTrigger value="overview" className="tab-trigger-idia">
            Overview
          </TabsTrigger>
          <TabsTrigger value="ledger" className="tab-trigger-idia">
            Audit Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 mt-3 grid grid-cols-2 gap-3 overflow-y-auto">
          <Card className="bg-muted/10 p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase">Data Connections</span>
              <span className="text-xl font-mono font-bold">{stats?.activeSources ?? 0}</span>
            </div>
            <Database className="h-5 w-5 text-muted-foreground/30" />
          </Card>

          <Card className="bg-muted/10 p-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-muted-foreground uppercase">Audit Logs</span>
              <span className="text-xl font-mono font-bold">{stats?.auditLogs ?? 0}</span>
            </div>
            <FileKey className="h-5 w-5 text-muted-foreground/30" />
          </Card>

          <Card className="col-span-2 bg-black/20 p-3 border-dashed border-white/5 flex flex-col items-center justify-center min-h-[80px]">
            <BarChart3 className="h-5 w-5 text-muted-foreground/20 mb-1" />
            <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
              Yield Visualization Pending
            </span>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="flex-1 mt-3 overflow-hidden">
          <Card className="h-full bg-black/40 flex flex-col items-center justify-center p-6 border-white/5">
            <BookOpen className="h-8 w-8 text-primary/20 mb-2" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-tighter mb-3">Immutable Audit Trail</p>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[10px] uppercase font-bold"
              onClick={() => navigate("/egress-logs")}
            >
              Open Ledger <ArrowUpRight className="ml-1 h-3 w-3" />
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .tab-trigger-idia {
          border-radius: 0;
          border-bottom: 2px solid transparent;
          background: transparent !important;
          padding: 0 0 4px 0;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.1em;
          font-weight: 700;
          color: hsl(var(--muted-foreground));
        }
        .tab-trigger-idia[data-state="active"] {
          border-bottom-color: hsl(var(--primary));
          color: hsl(var(--foreground));
        }
      `,
        }}
      />
    </div>
  );
};

export default IndividualDashboard;
