import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { useBillingData, PLAN_PRICING } from "@/hooks/useBillingData";
import SynapseGasGauge from "@/components/billing/SynapseGasGauge";
import FBOReservoirGauge from "@/components/billing/FBOReservoirGauge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ShieldCheck,
  Database,
  BrainCircuit,
  Eye,
  Sparkles,
  BarChart3,
  BookOpen,
  ArrowUpRight,
  FileKey,
} from "lucide-react";
import SynapseVisualizer from "@/components/visualizer/SynapseVisualizer";

const IndividualDashboard = () => {
  console.log("[DASHBOARD_TRACE] Component initialization - START");
  const { user, piiData } = useAuth();
  const { balanceData } = useSynapseCredits();
  const { currentUsage, subscriptionPlan, subscription } = useBillingData();
  const navigate = useNavigate();

  const liveBalance = balanceData?.available_credits ?? 0;
  const tier = subscription?.tier?.toLowerCase() ?? "base";
  const planInfo = PLAN_PRICING[tier] ?? PLAN_PRICING.base;

  // ─── DYNAMIC DATA FETCHING (NO HALLUCINATIONS) ──────────────────────────

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["personal-hub-stats", user?.id],
    queryFn: async () => {
      console.log("[DASHBOARD_TRACE] [FETCH_STATS] Database interrogation - START");
      if (!user?.id) return { activeSources: 0, auditLogs: 0, dataAssets: 0 };

      try {
        const [sourcesRes, auditsRes, assetsRes] = await Promise.all([
          supabase
            .from("data_connections")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_active", true),
          supabase.from("egress_logs").select("*", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("staged_health_data").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        ]);

        console.log("[DASHBOARD_TRACE] [FETCH_STATS] Database interrogation - COMPLETE");
        return {
          activeSources: sourcesRes.count || 0,
          auditLogs: auditsRes.count || 0,
          dataAssets: assetsRes.count || 0,
        };
      } catch (err) {
        console.error("[DASHBOARD_TRACE] [FETCH_STATS] Error:", err);
        return { activeSources: 0, auditLogs: 0, dataAssets: 0 };
      }
    },
    enabled: !!user?.id,
  });

  const personalStats = stats || { activeSources: 0, auditLogs: 0, dataAssets: 0 };

  const recentContributions = [
    { id: 1, action: "Health data synced from Apple Health", timestamp: "Recent", type: "health" },
  ];

  const getContributionIcon = (type: string) => {
    switch (type) {
      case "health":
        return <Activity className="h-4 w-4 text-primary" />;
      case "lifestyle":
        return <Eye className="h-4 w-4 text-primary" />;
      default:
        return <Database className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const usagePercent = currentUsage.limit > 0 ? Math.min((currentUsage.used / currentUsage.limit) * 100, 100) : 0;
  console.log("[DASHBOARD_TRACE] Component render cycle - COMPLETE");

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 space-y-4 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {piiData?.displayName ? `${piiData.displayName}'s Life Hub` : "My Life Hub"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm font-mono uppercase tracking-tighter">
            Platform GUID: {user?.id?.substring(0, 8)}...
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Personal Synapse Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <SynapseVisualizer />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="flex flex-col flex-1 min-h-0">
        <TabsList className="flex-shrink-0 w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Stats</TabsTrigger>
          <TabsTrigger value="ledger">Ledger Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 mt-3 space-y-3 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Card>
              <CardContent className="p-3">
                <SynapseGasGauge />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3">
                <FBOReservoirGauge />
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

            {/* UPDATED: SYNAPSE SCORE -> PROVENANCE AUDITS */}
            <Card className="relative overflow-hidden group border-primary/20 bg-primary/[0.02]">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-primary font-bold">Audit Logs</span>
                  <FileKey className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex flex-col mt-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-foreground">{personalStats.auditLogs}</span>
                    <span className="text-[10px] text-muted-foreground">receipts</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-full mt-2 text-[9px] uppercase font-black bg-primary/10 hover:bg-primary text-primary hover:text-white transition-all p-0 gap-1"
                    onClick={() => navigate("/egress-logs")}
                  >
                    Review Ledger <ArrowUpRight className="h-2 w-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                    Data Assets
                  </span>
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-lg font-bold">{personalStats.dataAssets.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground">points</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold mb-2">Asset Performance</p>
                  <div className="space-y-1.5">
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[11px]">Provenance Integrity</span>
                        <span className="text-[11px] font-medium">100%</span>
                      </div>
                      <Progress value={100} className="h-1" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[11px]">Source Connectivity</span>
                        <span className="text-[11px] font-medium">
                          {personalStats.activeSources > 0 ? "100%" : "0%"}
                        </span>
                      </div>
                      <Progress value={personalStats.activeSources > 0 ? 100 : 0} className="h-1" />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-2">Recent Contributions</p>
                  <div className="space-y-1.5">
                    {recentContributions.map((item) => (
                      <div key={item.id} className="flex items-start space-x-2">
                        {getContributionIcon(item.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium leading-tight">{item.action}</p>
                          <p className="text-[10px] text-muted-foreground">{item.timestamp}</p>
                        </div>
                        <Badge variant="secondary" className="text-[9px] capitalize px-1.5 py-0">
                          {item.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="flex-1 mt-3 space-y-3 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                <CardTitle className="text-xs font-medium">Credits Used</CardTitle>
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xl font-bold font-mono">
                  {currentUsage.used.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  of {currentUsage.limit > 0 ? currentUsage.limit.toLocaleString() : "∞"} CR
                </p>
                {currentUsage.limit > 0 && <Progress value={usagePercent} className="mt-1.5 h-1.5" />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                <CardTitle className="text-xs font-medium">Live Balance</CardTitle>
                <Database className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xl font-bold font-mono text-primary">
                  {liveBalance.toLocaleString(undefined, { minimumFractionDigits: 4 })}
                </div>
                <p className="text-[10px] text-muted-foreground">CR · Real-time</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ledger" className="flex-1 mt-3 overflow-hidden">
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs">Ledger Transaction Log</CardTitle>
              <CardDescription className="text-[11px]">
                Immutable record of all Synapse Credit movements
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">View full history in Egress Audit.</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/egress-logs")}>
                  Open Ledger Audit
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IndividualDashboard;
