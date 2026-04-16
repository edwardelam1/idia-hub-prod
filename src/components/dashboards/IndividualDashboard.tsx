import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { useBillingData, PLAN_PRICING } from "@/hooks/useBillingData";
import SynapseGasGauge from "@/components/billing/SynapseGasGauge";
import {
  Activity,
  ShieldCheck,
  Database,
  BrainCircuit,
  Plug,
  Eye,
  Sparkles,
  Bot,
  BarChart3,
  BookOpen,
} from "lucide-react";
import SynapseVisualizer from "@/components/visualizer/SynapseVisualizer";

const IndividualDashboard = () => {
  const { piiData } = useAuth();
  const { balanceData } = useSynapseCredits();
  const { currentUsage, subscriptionPlan, subscription } = useBillingData();
  const liveBalance = balanceData?.available_credits ?? 0;

  const tier = subscription?.tier?.toLowerCase() ?? 'base';
  const planInfo = PLAN_PRICING[tier] ?? PLAN_PRICING.base;

  const personalStats = {
    activeSources: 12,
    synapseScore: 87,
    dataAssets: 1240,
  };

  const recentContributions = [
    { id: 1, action: "Health data synced from Apple Health", timestamp: "2 hours ago", type: "health" },
    { id: 2, action: "Location preferences updated", timestamp: "1 day ago", type: "lifestyle" },
    { id: 3, action: "Financial wellness snapshot contributed", timestamp: "3 days ago", type: "finance" },
  ];

  const getContributionIcon = (type: string) => {
    switch (type) {
      case "health": return <Activity className="h-4 w-4 text-primary" />;
      case "lifestyle": return <Eye className="h-4 w-4 text-primary" />;
      case "finance": return <Sparkles className="h-4 w-4 text-primary" />;
      default: return <Database className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const usagePercent = currentUsage.limit > 0 ? Math.min((currentUsage.used / currentUsage.limit) * 100, 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header + Visualizer */}
      <div className="flex-shrink-0 space-y-4 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {piiData?.displayName ? `${piiData.displayName}'s Life Hub` : "My Life Hub"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Personal data assets & Synapse impact
          </p>
        </div>

        {/* Synapse Visualizer — always visible */}
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

        {/* ──── OVERVIEW TAB ──── */}
        <TabsContent value="overview" className="flex-1 mt-3 space-y-3 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Card>
              <CardContent className="p-3">
                <SynapseGasGauge />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Data Sources</span>
                  <Database className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-lg font-bold">{personalStats.activeSources}</span>
                  <span className="text-[10px] text-muted-foreground">connected</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Synapse Score</span>
                  <BrainCircuit className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-lg font-bold text-primary">{personalStats.synapseScore}</span>
                  <span className="text-[10px] text-muted-foreground">rating</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Data Assets</span>
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
                        <span className="text-[11px]">Synapse Contribution</span>
                        <span className="text-[11px] font-medium">{personalStats.synapseScore}%</span>
                      </div>
                      <Progress value={personalStats.synapseScore} className="h-1" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[11px]">Source Connectivity</span>
                        <span className="text-[11px] font-medium">92%</span>
                      </div>
                      <Progress value={92} className="h-1" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[11px]">Data Freshness</span>
                        <span className="text-[11px] font-medium">78%</span>
                      </div>
                      <Progress value={78} className="h-1" />
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

        {/* ──── USAGE STATS TAB ──── */}
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
                  of {currentUsage.limit > 0 ? currentUsage.limit.toLocaleString() : '∞'} CR
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                <CardTitle className="text-xs font-medium">API Calls</CardTitle>
                <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xl font-bold">—</div>
                <p className="text-[10px] text-muted-foreground">of {planInfo.limits.apiCalls.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1">
                <CardTitle className="text-xs font-medium">Data Export</CardTitle>
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xl font-bold">—</div>
                <p className="text-[10px] text-muted-foreground">of {planInfo.limits.dataExport.toLocaleString()} GB</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs">Current Plan</CardTitle>
              <CardDescription className="text-[11px]">{subscriptionPlan.name} — {subscriptionPlan.cost}</CardDescription>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex flex-wrap gap-1.5">
                {subscriptionPlan.features.map((f, i) => (
                  <Badge key={i} variant="secondary" className="text-[10px] font-normal gap-1 px-1.5 py-0.5">
                    <ShieldCheck className="h-3 w-3 text-primary flex-shrink-0" />
                    {f}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──── LEDGER AUDIT TAB ──── */}
        <TabsContent value="ledger" className="flex-1 mt-3 overflow-hidden">
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-xs">Ledger Transaction Log</CardTitle>
              <CardDescription className="text-[11px]">Immutable record of all Synapse Credit movements</CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  Full ledger audit trail coming soon.
                </p>
                <Badge variant="secondary" className="text-[10px]">Under Development</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IndividualDashboard;
