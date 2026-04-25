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
  // DUAL-RAIL BINDING: The Fluid Concept (Cash + Gas)
  // ========================================================================
  const cashRail = protocolState?.hub_operating_cash ?? 0;
  const gasRail = protocolState?.synapse_gas_credits ?? 0;
  const royaltyRail = protocolState?.fbo_royalty_balance ?? 0;

  useEffect(() => {
    if (protocolState) {
      console.info(
        `[STATUS: Dashboard.DataSync] Rail State Resolved - Cash: $${cashRail} | Gas: ${gasRail} | Yield: $${royaltyRail}`,
      );
    }
  }, [protocolState, cashRail, gasRail, royaltyRail]);

  // ─── DYNAMIC LEDGER INTERROGATION (NO HALLUCINATIONS) ─────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["hub-personal-stats", activeUserId],
    queryFn: async () => {
      console.info("[BEGIN: Dashboard.StatsQuery] Interrogating Ledger Tables.");
      if (!activeUserId) return { activeSources: 0, auditLogs: 0, dataAssets: 0 };

      try {
        const [sourcesRes, auditsRes, assetsRes] = await Promise.all([
          supabase
            .from("data_connections")
            .select("*", { count: "exact", head: true })
            .eq("user_id", activeUserId)
            .eq("is_active", true),
          supabase.from("egress_logs").select("*", { count: "exact", head: true }).eq("user_id", activeUserId),
          supabase.from("staged_health_data").select("*", { count: "exact", head: true }).eq("user_id", activeUserId),
        ]);

        console.info("[END: Dashboard.StatsQuery] Ledger Response Received.");
        return {
          activeSources: sourcesRes.count || 0,
          auditLogs: auditsRes.count || 0,
          dataAssets: assetsRes.count || 0,
        };
      } catch (err) {
        console.error("[FATAL: Dashboard.StatsQuery] Query Execution Failed", err);
        throw err;
      }
    },
    enabled: !!activeUserId,
  });

  const personalStats = stats || { activeSources: 0, auditLogs: 0, dataAssets: 0 };
  const usagePercent = currentUsage.limit > 0 ? Math.min((currentUsage.used / currentUsage.limit) * 100, 100) : 0;

  return (
    <div className="flex flex-col h-full font-sans max-w-7xl mx-auto w-full">
      {/* HEADER SECTION */}
      <div className="flex-shrink-0 space-y-4 pb-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {piiData?.displayName ? `${piiData.displayName}'s IDIA Hub` : "My IDIA Hub"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-mono flex items-center gap-2">
              GUID: <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-primary">{activeUserId}</span>
            </p>
          </div>
          <Badge
            variant="outline"
            className="mb-1 font-mono text-[10px] tracking-tighter border-primary/30 text-primary"
          >
            {creditsLoading ? "SYNCING_PROTOCOL..." : "STATE: SETTLED"}
          </Badge>
        </div>

        {/* NEURAL VISUALIZER */}
        <Card className="border-primary/10 bg-black/20 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
              Synapse Neural Visualizer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SynapseVisualizer />
          </CardContent>
        </Card>
      </div>

      {/* TABS NAVIGATION */}
      <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0">
        <TabsList className="flex-shrink-0 w-full justify-start bg-transparent border-b rounded-none h-auto p-0 gap-8">
          <TabsTrigger value="overview" className="tab-trigger-idia">
            Overview
          </TabsTrigger>
          <TabsTrigger value="usage" className="tab-trigger-idia">
            Usage Stats
          </TabsTrigger>
          <TabsTrigger value="ledger" className="tab-trigger-idia">
            Ledger Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 mt-6 space-y-6 overflow-y-auto pr-2">
          {/* THE FLUID CONCEPT: DUAL-RAIL OPERATING GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RAIL 1: OPERATING CAPITAL */}
            <Card className="bg-black/40 border-primary/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="h-24 w-24 -mr-8 -mt-8" />
              </div>
              <CardContent className="p-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <Wallet className="h-3 w-3" /> Rail 1: Hub Operating Cash
                </h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-mono font-bold tracking-tighter text-white">
                    ${cashRail.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">USD</span>
                </div>
                <div className="mt-6">
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] uppercase font-bold text-muted-foreground">Vault Integrity</span>
                    <span className="text-[9px] font-mono text-primary">100%</span>
                  </div>
                  <Progress value={100} className="h-1 bg-white/5" />
                </div>
                <p className="text-[9px] mt-4 italic text-muted-foreground leading-relaxed">
                  Active Hub Liquidity: Seeded for Data Ingestion Pipeline.
                </p>
              </CardContent>
            </Card>

            {/* RAIL 2: COMPUTATIONAL GAS */}
            <Card className="bg-primary/5 border-primary/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-primary">
                <Zap className="h-24 w-24 -mr-8 -mt-8 fill-primary" />
              </div>
              <CardContent className="p-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                  <BrainCircuit className="h-3 w-3" /> Rail 2: Synapse Gas Credits
                </h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-mono font-bold tracking-tighter text-primary">
                    {gasRail.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-primary/70">CREDITS</span>
                </div>
                <div className="mt-6">
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] uppercase font-bold text-primary/60">Computational Runway</span>
                    <span className="text-[9px] font-mono text-primary">Optimal</span>
                  </div>
                  <Progress value={100} className="h-1 bg-primary/10" />
                </div>
                <Button
                  variant="link"
                  className="p-0 h-auto text-[10px] uppercase font-bold tracking-tight text-primary mt-4 hover:text-white"
                  onClick={() => navigate("/billing")}
                >
                  Top Up Gas Reserves →
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* SECONDARY GAUGES & STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-foreground/5 bg-muted/5">
              <CardContent className="p-4">
                <FBOReservoirGauge />
              </CardContent>
            </Card>
            <Card className="border-foreground/5 bg-muted/5">
              <CardContent className="p-4">
                <StablecoinPanel />
              </CardContent>
            </Card>
            <Card className="border-foreground/5 bg-muted/5 flex flex-col justify-between">
              <CardContent className="p-4 py-3">
                <div className="flex items-center justify-between text-muted-foreground mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Data Sources</span>
                  <Database className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono">{personalStats.activeSources}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">ACTIVE</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-foreground/5 bg-muted/5 flex flex-col justify-between">
              <CardContent className="p-4 py-3">
                <div className="flex items-center justify-between text-muted-foreground mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest">Audit Logs</span>
                  <FileKey className="h-3.5 w-3.5" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono">{personalStats.auditLogs}</span>
                  <span className="text-[10px] font-bold text-muted-foreground">RECEIPTS</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="flex-1 mt-6">
          <Card className="border-dashed border-muted-foreground/20 bg-transparent">
            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-bold mb-2">Historical Data Yield</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Visualizing the distribution of your 30% royalties across the Life rail.
              </p>
              <Badge variant="outline" className="mt-6 font-mono text-[10px]">
                DATA_YIELD_VIZ_PENDING
              </Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="flex-1 mt-6">
          <Card className="h-full bg-black/20 border-primary/5">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Provenance Registry</CardTitle>
              <CardDescription className="text-xs">
                Immutable audit trail of all Synapse State transitions.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex flex-col items-center justify-center">
              <BookOpen className="h-10 w-10 text-primary/20 mb-6" />
              <Button
                variant="outline"
                className="border-primary/20 text-primary hover:bg-primary/10"
                onClick={() => navigate("/egress-logs")}
              >
                Access Full Ledger
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* GLOBAL STYLES FOR THE IDIA AESTHETIC */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .tab-trigger-idia {
          border-radius: 0;
          border-bottom: 2px solid transparent;
          background: transparent !important;
          padding-bottom: 1rem;
          padding-top: 0.5rem;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.15em;
          font-weight: 800;
          color: hsl(var(--muted-foreground));
          transition: all 0.2s ease;
        }
        .tab-trigger-idia[data-state="active"] {
          border-bottom-color: hsl(var(--primary));
          color: hsl(var(--foreground));
        }
        .tab-trigger-idia:hover {
          color: hsl(var(--primary));
        }
      `,
        }}
      />
    </div>
  );
};

export default IndividualDashboard;
