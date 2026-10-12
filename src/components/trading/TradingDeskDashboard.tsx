import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Key, 
  Boxes, 
  Database, 
  Clock, 
  Shield,
  BarChart3,
  FileCode,
  Plug
} from "lucide-react";
import { APIKeyManagement } from "./APIKeyManagement";
import { APIEndpoints } from "./APIEndpoints";
import APIMonitoring from "./APIMonitoring";
import { APIBilling } from "./APIBilling";
import FeatureFeedAccess from "./FeatureFeedAccess";
import { MCPConfigurator } from "./MCPConfigurator";
import { MCPLiveTelemetry } from "./MCPLiveTelemetry";
import { SovereignVault } from "@/components/knowledge/SovereignVault";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";

export const TradingDeskDashboard = () => {
  const { pipelineHealth, activeBundlesCount, stagedDataCount, isLoading } = useDashboardStats();

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Trading Desk API Access</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Professional-grade API gateway for quantitative analysis and algorithmic trading
        </p>
      </div>


      {/* Key Metrics Overview */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-1 sm:p-3 sm:pb-1">
            <CardTitle className="text-xs font-medium sm:text-sm">Staged Data</CardTitle>
            <Activity className="h-3.5 w-3.5 shrink-0 text-primary" />
          </CardHeader>
          <CardContent className="p-2 pt-0 sm:p-3 sm:pt-0">
            {isLoading ? <Skeleton className="h-6 w-16" /> : (
              <div className="text-lg font-bold text-foreground sm:text-xl">
                {stagedDataCount.toLocaleString()}
              </div>
            )}
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
              {pipelineHealth?.unrewarded_staged_data ?? 0} pending rewards
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-1 sm:p-3 sm:pb-1">
            <CardTitle className="text-xs font-medium sm:text-sm">Active Bundles</CardTitle>
            <Boxes className="h-3.5 w-3.5 shrink-0 text-primary" />
          </CardHeader>
          <CardContent className="p-2 pt-0 sm:p-3 sm:pt-0">
            {isLoading ? <Skeleton className="h-6 w-16" /> : (
              <div className="text-lg font-bold text-foreground sm:text-xl">{activeBundlesCount}</div>
            )}
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
              Marketplace listings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Interface */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="-mx-4 sm:mx-0 overflow-x-auto px-4 sm:px-0 pb-1">
          <TabsList className="inline-flex w-max lg:grid lg:w-full lg:grid-cols-6 h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="whitespace-nowrap text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4 mr-1.5 sm:mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="keys" className="whitespace-nowrap text-xs sm:text-sm">
              <Key className="h-4 w-4 mr-1.5 sm:mr-2" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="endpoints" className="whitespace-nowrap text-xs sm:text-sm">
              <FileCode className="h-4 w-4 mr-1.5 sm:mr-2" />
              Endpoints
            </TabsTrigger>
            <TabsTrigger value="mcp" className="whitespace-nowrap text-xs sm:text-sm">
              <Plug className="h-4 w-4 mr-1.5 sm:mr-2" />
              MCP
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="whitespace-nowrap text-xs sm:text-sm">
              <Activity className="h-4 w-4 mr-1.5 sm:mr-2" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="feeds" className="whitespace-nowrap text-xs sm:text-sm">
              <Database className="h-4 w-4 mr-1.5 sm:mr-2" />
              Feature Feeds
            </TabsTrigger>
          </TabsList>
        </div>


        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Security & Compliance
                </CardTitle>
                <CardDescription>
                  Cryptographic authentication and audit trail
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">OAuth 2.0 Enabled</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">TLS 1.3+ Encryption</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Audit Logging</span>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">DigiRAMP Anchoring</span>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Blockchain</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>
                  Real-time API performance tracking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Records Processed</span>
                  <span className="text-sm font-semibold text-foreground">{(pipelineHealth?.processed_raw_data ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Processing Rate</span>
                  <span className="text-sm font-semibold text-foreground">
                    {pipelineHealth && pipelineHealth.total_raw_data > 0
                      ? `${((pipelineHealth.processed_raw_data / pipelineHealth.total_raw_data) * 100).toFixed(2)}%`
                      : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pipeline Status</span>
                  <span className="text-sm font-semibold text-green-500">
                    {(pipelineHealth?.processing_raw_data ?? 0) === 0 ? 'Idle' : 'Active'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Staged Data</span>
                  <span className="text-sm font-semibold text-foreground">{stagedDataCount.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="keys">
          <APIKeyManagement />
        </TabsContent>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints">
          <APIEndpoints />
        </TabsContent>

        {/* MCP Tab */}
        <TabsContent value="mcp">
          <MCPConfigurator />
          <div className="mt-6">
            <SovereignVault />
          </div>
          <div className="mt-6">
            <MCPLiveTelemetry />
          </div>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <APIMonitoring />
        </TabsContent>

        {/* Feature Feeds Tab */}
        <TabsContent value="feeds">
          <FeatureFeedAccess />
        </TabsContent>
      </Tabs>
    </div>
  );
};
