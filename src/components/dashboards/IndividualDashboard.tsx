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
} from "lucide-react";
import SynapseVisualizer from "@/components/visualizer/SynapseVisualizer";

const IndividualDashboard = () => {
  const { user, piiData } = useAuth();
  const { balanceData, isLoading: creditsLoading } = useSynapseCredits();
  const { currentUsage, subscription } = useBillingData();
  const navigate = useNavigate();

  // ========================================================================
  // IDENTITY RECONCILIATION: Bridging user_id vs id
  // ========================================================================
  const activeUserId = user?.user_id || (user as any)?.id;

  useEffect(() => {
    console.info(`[BEGIN: Dashboard.Hydration] Verifying Identity for GUID: ${activeUserId}`);
    if (!activeUserId) {
      console.warn("[STATUS: Dashboard.Hydration] Identity Missing. UI Stalling.");
    }
  }, [activeUserId]);

  // ========================================================================
  // DUAL-SILO MAPPING: Liquidity vs. Computational Gas
  // ========================================================================
  const operatingCash = balanceData?.hub_operating_cash ?? 0;
  const gasCredits = balanceData?.synapse_gas_credits ?? 0;

  useEffect(() => {
    if (balanceData) {
      console.info(`[STATUS: Dashboard.DataSync] Silos Resolved - Cash: $${operatingCash} | Gas: ${gasCredits}`);
    }
  }, [balanceData, operatingCash, gasCredits]);

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

  const getContributionIcon = (type: string) => {
    switch (type) {
      case "health":
        return <Activity className="h-4 w-4 text-primary" />;
      case "lifestyle":
        return <Eye className="h-4 w-4 text-primary" />;
      case "finance":
        return <Sparkles className="h-4 w-4 text-primary" />;
      default:
        return <Database className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col h-full font-sans">
      <div className="flex-shrink-0 space-y-4 pb-4">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {piiData?.displayName ? `${piiData.displayName}'s IDIA Hub` : "My IDIA Hub"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm font-mono flex items-center gap-2">
              GUID:{" "}
              <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{activeUserId?.substring(0, 8)}...</span>
            </p>
          </div>
          <Badge variant="outline" className="mb-1 font-mono text-[10px] tracking-tighter">
            {creditsLoading ? "SYNCING_PROTOCOL..." : "STATE: SETTLED"}
          </Badge>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70">
              Synapse Neural Visualizer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SynapseVisualizer />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0">
        <TabsList className="flex-shrink-0 w-full justify-start bg-transparent border-b rounded-none h-auto p-0">
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

        <TabsContent value="overview" className="flex-1 mt-3 space-y-3 overflow-hidden">
          {/* SILO GRID: THE SOURCE OF TRUTH */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-3">
                <SynapseGasGauge />
              </CardContent>
            </Card>

            <Card className="border-foreground/10">
              <CardContent className="p-3">
                <FBOReservoirGauge />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <StablecoinPanel />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                    Data Sources
                  </span>
                  <Database className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-lg font-bold">{personalStats.activeSources}</span>
                  <span className="text-[10px] text-muted-foreground">active</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                    Audit Logs
                  </span>
                  <FileKey className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="space-y-2 mt-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold">{personalStats.auditLogs}</span>
                    <span className="text-[10px] text-muted-foreground">receipts</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-full text-[9px] uppercase tracking-wider gap-1"
                    onClick={() => navigate("/egress-logs")}
                  >
                    Review Audit <ArrowUpRight className="h-2 w-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5" /> IDIA Hub Operating Liquidity
                </h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-mono font-bold tracking-tighter">
                    ${operatingCash.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">USD</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Vault Integrity</span>
                      <span className="text-[10px] font-mono">100%</span>
                    </div>
                    <Progress value={100} className="h-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                  <BrainCircuit className="h-3.5 w-3.5" /> Computational Gas
                </h3>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-mono font-bold tracking-tighter text-primary">
                    {gasCredits.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-primary/70 uppercase">Credits</span>
                </div>
                <Button
                  variant="link"
                  className="p-0 h-auto text-[10px] uppercase font-bold tracking-tight"
                  onClick={() => navigate("/billing")}
                >
                  Top Up Gas Reserves →
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="flex-1 mt-3 space-y-3">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Historical Data Yield</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="h-40 w-full bg-muted/20 rounded flex items-center justify-center border-dashed border-2">
                <BarChart3 className="h-8 w-8 text-muted-foreground/30" />
                <span className="text-xs font-mono text-muted-foreground ml-2">DATA_YIELD_VIZ_PENDING</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="flex-1 mt-3 overflow-hidden">
          <Card className="h-full">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Provenance Registry</CardTitle>
              <CardDescription className="text-xs">
                Immutable audit trail of all Synapse State transitions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 flex flex-col items-center justify-center h-64">
              <BookOpen className="h-10 w-10 text-muted-foreground/20 mb-4" />
              <Button variant="outline" onClick={() => navigate("/egress-logs")}>
                Access Full Ledger
              </Button>
            </CardContent>
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
          padding-bottom: 0.5rem;
          padding-left: 1rem;
          padding-right: 1rem;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.05em;
          font-weight: 700;
        }
        .tab-trigger-idia[data-state="active"] {
          border-bottom-color: hsl(var(--primary));
          color: hsl(var(--primary));
        }
      `,
        }}
      />
    </div>
  );
};

export default IndividualDashboard;
