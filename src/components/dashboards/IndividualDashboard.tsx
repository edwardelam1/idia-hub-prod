import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { useBillingData, PLAN_PRICING } from "@/hooks/useBillingData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import SynapseGasGauge from "@/components/billing/SynapseGasGauge";
import FBOReservoirGauge from "@/components/billing/FBOReservoirGauge";
import StablecoinPanel from "@/components/billing/StablecoinPanel";
import {
  Activity,
  ShieldCheck,
  Database,
  BrainCircuit,
  Eye,
  Sparkles,
  BarChart3,
  BookOpen,
  FileKey,
  ArrowUpRight,
  Wallet,
  Zap,
  TrendingUp,
} from "lucide-react";
import SynapseVisualizer from "@/components/visualizer/SynapseVisualizer";

const IndividualDashboard = () => {
  const { user, piiData } = useAuth();
  const { protocolState, isLoading: creditsLoading, refreshState } = useSynapseCredits();
  const { currentUsage, subscription } = useBillingData();
  const navigate = useNavigate();

  // ========================================================================
  // IDENTITY RECONCILIATION: Resolved GUID Bridge
  // ========================================================================
  const activeUserId = user?.user_id || (user as any)?.id;

  useEffect(() => {
    console.info(`[BEGIN: Dashboard.Hydration] Verifying Identity for GUID: ${activeUserId}`);
    if (!activeUserId) {
      console.warn("[STATUS: Dashboard.Hydration] Identity Missing. UI Stalling.");
    }
  }, [activeUserId]);

  // ========================================================================
  // TRIPLE-RAIL FINALITY: Straight-Through Flow Mapping
  // ========================================================================
  const rail1_Operating = protocolState?.hub_operating_cash ?? 0;
  const rail2_Gas = protocolState?.synapse_gas_credits ?? 0;
  const rail3_Stablecoin = protocolState?.stablecoin_balance ?? 0;
  const silo3_LifeYield = protocolState?.fbo_royalty_balance ?? 0;

  useEffect(() => {
    if (protocolState) {
      console.info(
        `[STATUS: Dashboard.DataSync] Rail State Resolved - R1: $${rail1_Operating} | R2: ${rail2_Gas} | R3: ${rail3_Stablecoin} | S3: $${silo3_LifeYield}`,
      );
    }
  }, [protocolState, rail1_Operating, rail2_Gas, rail3_Stablecoin, silo3_LifeYield]);

  // ─── DYNAMIC LEDGER INTERROGATION ─────────────────────
  const { data: stats } = useQuery({
    queryKey: ["hub-personal-stats", activeUserId],
    queryFn: async () => {
      if (!activeUserId) return { activeSources: 0, auditLogs: 0, dataAssets: 0 };
      const [sourcesRes, auditsRes, assetsRes] = await Promise.all([
        supabase
          .from("data_connections")
          .select("*", { count: "exact", head: true })
          .eq("user_id", activeUserId)
          .eq("is_active", true),
        supabase.from("egress_logs").select("*", { count: "exact", head: true }).eq("user_id", activeUserId),
        supabase.from("staged_health_data").select("*", { count: "exact", head: true }).eq("user_id", activeUserId),
      ]);
      return {
        activeSources: sourcesRes.count || 0,
        auditLogs: auditsRes.count || 0,
        dataAssets: assetsRes.count || 0,
      };
    },
    enabled: !!activeUserId,
  });

  const personalStats = stats || { activeSources: 0, auditLogs: 0, dataAssets: 0 };

  return (
    <div className="flex flex-col h-full font-sans max-w-full mx-auto w-full px-4 py-1 space-y-2 overflow-hidden">
      {/* COMPACT HEADER */}
      <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight leading-none">
            {piiData?.displayName ? `${piiData.displayName}'s IDIA Hub` : "My IDIA Hub"}
          </h1>
          <p className="text-[10px] text-muted-foreground mt-1 font-mono">
            GUID: <span className="text-primary">{activeUserId?.substring(0, 16)}...</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[9px] border-primary/20 text-primary py-0 h-5">
            {creditsLoading ? "SYNCING..." : "STATE: SETTLED"}
          </Badge>
          <ShieldCheck className="h-4 w-4 text-primary opacity-30" />
        </div>
      </div>

      {/* CONSTRAINED NEURAL VISUALIZER */}
      <Card className="border-primary/10 bg-black/20 backdrop-blur-sm min-h-[140px] max-h-[160px] overflow-hidden relative">
        <div className="absolute top-2 left-3 z-10">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
            Neural Interaction Matrix
          </span>
        </div>
        <CardContent className="p-0 h-full">
          <SynapseVisualizer />
        </CardContent>
      </Card>

      {/* THE OPERATING GRID: FOUR-RAIL LIQUIDITY FLOW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* RAIL 1: OPERATING (FIAT) */}
        <Card className="bg-black/60 border-white/5 p-2.5 flex flex-col justify-between min-h-[85px] relative overflow-hidden group">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Wallet className="h-3 w-3" /> Rail 1: Operating
          </h3>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold">
              ${rail1_Operating.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase">USD</span>
          </div>
          <Progress value={100} className="h-0.5 mt-2 bg-white/5" />
        </Card>

        {/* RAIL 2: GAS (COMPUTATIONAL) */}
        <Card className="bg-primary/5 border-primary/20 p-2.5 flex flex-col justify-between min-h-[85px] relative overflow-hidden group">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Zap className="h-3 w-3 fill-primary" /> Rail 2: Gas
          </h3>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-primary">{rail2_Gas.toLocaleString()}</span>
            <span className="text-[8px] font-bold text-primary/70 uppercase">Credits</span>
          </div>
          <Progress value={100} className="h-0.5 mt-2 bg-primary/20" />
        </Card>

        {/* RAIL 3: STABLECOIN (LIQUIDITY) */}
        <Card className="bg-amber-500/5 border-amber-500/10 p-2.5 flex flex-col justify-between min-h-[85px] relative overflow-hidden group">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
            <TrendingUp className="h-3 w-3" /> Rail 3: USDC
          </h3>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-amber-500">{rail3_Stablecoin.toLocaleString()}</span>
            <span className="text-[8px] font-bold text-amber-500/70 uppercase">Beta</span>
          </div>
          <Progress value={100} className="h-0.5 mt-2 bg-amber-500/20" />
        </Card>

        {/* SILO 3: LIFE YIELD (FIAT EXIT) */}
        <Card className="bg-emerald-500/5 border-emerald-500/10 p-2.5 flex flex-col justify-between min-h-[85px] relative overflow-hidden group">
          <h3 className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 flex items-center gap-2">
            <Sparkles className="h-3 w-3" /> Silo 3: Yield
          </h3>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-emerald-500">
              ${silo3_LifeYield.toLocaleString(undefined, { minimumFractionDigits: 4 })}
            </span>
            <span className="text-[8px] font-bold text-emerald-500/70 uppercase">USD</span>
          </div>
          <Progress value={100} className="h-0.5 mt-2 bg-emerald-500/20" />
        </Card>
      </div>

      {/* TABS & LEDGER NAVIGATION */}
      <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <TabsList className="w-fit bg-transparent border-b border-white/5 rounded-none h-7 p-0 gap-6">
          <TabsTrigger value="overview" className="tab-trigger-idia">
            Overview
          </TabsTrigger>
          <TabsTrigger value="usage" className="tab-trigger-idia">
            Usage Stats
          </TabsTrigger>
          <TabsTrigger value="ledger" className="tab-trigger-idia">
            Provenance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 mt-2 space-y-2 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card className="border-foreground/5 bg-muted/5 p-2 flex flex-col justify-between h-[60px]">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-bold text-muted-foreground uppercase">Data Sources</span>
                <Database className="h-3 w-3 opacity-20" />
              </div>
              <span className="text-lg font-mono font-bold">{personalStats.activeSources}</span>
            </Card>
            <Card className="border-foreground/5 bg-muted/5 p-2 flex flex-col justify-between h-[60px]">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-bold text-muted-foreground uppercase">Audit Logs</span>
                <FileKey className="h-3 w-3 opacity-20" />
              </div>
              <span className="text-lg font-mono font-bold">{personalStats.auditLogs}</span>
            </Card>
            <div className="col-span-2">
              <StablecoinPanel />
            </div>
          </div>
          <Card className="bg-black/20 p-3 border-dashed border-white/5 flex items-center justify-center h-[50px]">
            <BarChart3 className="h-4 w-4 text-muted-foreground/10 mr-2" />
            <span className="text-[8px] font-mono text-muted-foreground/40 uppercase tracking-[0.2em]">
              Yield Distribution Analysis Pending
            </span>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="flex-1 mt-2">
          <Card className="h-full bg-black/20 border-primary/5 flex flex-col items-center justify-center p-4">
            <BookOpen className="h-6 w-6 text-primary/10 mb-2" />
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[9px] uppercase font-bold tracking-widest"
              onClick={() => navigate("/egress-logs")}
            >
              Access Provenance Ledger <ArrowUpRight className="ml-1 h-3 w-3" />
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
          padding: 0 0 2px 0;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.1em;
          font-weight: 700;
          color: hsl(var(--muted-foreground));
          transition: all 0.2s ease;
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
