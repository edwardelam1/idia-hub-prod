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

        <ScrollArea className="flex-1 mt-4">
          {/* ──── OVERVIEW TAB ──── */}
          <TabsContent value="overview" className="mt-0 space-y-4">
            {/* Gauge + Key Metrics row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="md:row-span-2 flex flex-col items-center justify-center">
                <CardContent className="pt-4">
                  <SynapseGasGauge />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{personalStats.activeSources}</div>
                  <p className="text-xs text-muted-foreground">Connected</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Synapse Score</CardTitle>
                  <BrainCircuit className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{personalStats.synapseScore}</div>
                  <p className="text-xs text-muted-foreground">Contribution rating</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Assets</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{personalStats.dataAssets.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Total points</p>
                </CardContent>
              </Card>
            </div>

            {/* Performance & Contributions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Asset Performance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs">Synapse Contribution</span>
                      <span className="text-xs font-medium">{personalStats.synapseScore}%</span>
                    </div>
                    <Progress value={personalStats.synapseScore} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs">Source Connectivity</span>
                      <span className="text-xs font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs">Data Freshness</span>
                      <span className="text-xs font-medium">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent Contributions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentContributions.map((item) => (
                      <div key={item.id} className="flex items-start space-x-3">
                        {getContributionIcon(item.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{item.action}</p>
                          <p className="text-[11px] text-muted-foreground">{item.timestamp}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {item.type}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <Plug className="h-6 w-6 mx-auto mb-1.5 text-primary" />
                <p className="text-xs font-medium">Connect Source</p>
              </div>
              <div className="text-center p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <Eye className="h-6 w-6 mx-auto mb-1.5 text-primary" />
                <p className="text-xs font-medium">View Insights</p>
              </div>
              <div className="text-center p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <BrainCircuit className="h-6 w-6 mx-auto mb-1.5 text-primary" />
                <p className="text-xs font-medium">Synapse Impact</p>
              </div>
              <div className="text-center p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                <Bot className="h-6 w-6 mx-auto mb-1.5 text-primary" />
                <p className="text-xs font-medium">Best Friend AI</p>
              </div>
            </div>
          </TabsContent>

          {/* ──── USAGE STATS TAB ──── */}
          <TabsContent value="usage" className="mt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono">
                    {currentUsage.used.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    of {currentUsage.limit > 0 ? currentUsage.limit.toLocaleString() : '∞'} CR limit
                  </p>
                  {currentUsage.limit > 0 && <Progress value={usagePercent} className="mt-2 h-2" />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Live Balance</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-mono text-primary">
                    {liveBalance.toLocaleString(undefined, { minimumFractionDigits: 4 })} CR
                  </div>
                  <p className="text-xs text-muted-foreground">Real-time ledger</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">API Calls</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">—</div>
                  <p className="text-xs text-muted-foreground">of {planInfo.limits.apiCalls.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Export</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">—</div>
                  <p className="text-xs text-muted-foreground">of {planInfo.limits.dataExport.toLocaleString()} GB</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Current Plan</CardTitle>
                <CardDescription>{subscriptionPlan.name} — {subscriptionPlan.cost}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subscriptionPlan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ──── LEDGER AUDIT TAB ──── */}
          <TabsContent value="ledger" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Ledger Transaction Log</CardTitle>
                <CardDescription>Immutable record of all Synapse Credit movements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <BookOpen className="h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Full ledger audit trail coming soon.
                  </p>
                  <Badge variant="secondary" className="text-xs">Under Development</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default IndividualDashboard;
