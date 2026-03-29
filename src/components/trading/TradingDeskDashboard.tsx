import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Key, 
  TrendingUp, 
  Database, 
  Clock, 
  Shield,
  Zap,
  BarChart3,
  FileCode,
  Lock,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";
import { APIKeyManagement } from "./APIKeyManagement";
import { APIEndpoints } from "./APIEndpoints";
import { APIMonitoring } from "./APIMonitoring";
import { APIBilling } from "./APIBilling";
import { FeatureFeedAccess } from "./FeatureFeedAccess";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";

export const TradingDeskDashboard = () => {
  const { pipelineHealth, activeBundlesCount, stagedDataCount, isLoading } = useDashboardStats();

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Trading Desk API Access</h1>
        <p className="text-muted-foreground">
          Professional-grade API gateway for quantitative analysis and algorithmic trading
        </p>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records Processed</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-foreground">
                {(pipelineHealth?.processed_raw_data ?? 0).toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {pipelineHealth?.total_raw_data ?? 0} total raw records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staged Data</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-foreground">
                {stagedDataCount.toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {pipelineHealth?.unrewarded_staged_data ?? 0} pending rewards
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bundles</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-foreground">{activeBundlesCount}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Marketplace listings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Key className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-foreground">
                {(pipelineHealth?.total_transactions ?? 0).toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Live</Badge>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Interface */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto gap-1 p-1">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="endpoints">
            <FileCode className="h-4 w-4 mr-2" />
            Endpoints
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            <Activity className="h-4 w-4 mr-2" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="feeds">
            <Database className="h-4 w-4 mr-2" />
            Feature Feeds
          </TabsTrigger>
        </TabsList>

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

          <Card>
            <CardHeader>
              <CardTitle>API Access Tiers</CardTitle>
              <CardDescription>
                Your current tier and available upgrades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">Analyst Tier</h4>
                    <Badge variant="outline">Basic</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Entry-level API access</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• 10,000 calls/month</li>
                    <li>• Standard endpoints</li>
                    <li>• Email support</li>
                  </ul>
                  <Button variant="outline" className="w-full" disabled>View Details</Button>
                </div>

                <div className="border-2 border-primary rounded-lg p-4 space-y-2 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">Professional Tier</h4>
                    <Badge className="bg-primary text-primary-foreground">Current</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Advanced trading features</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• 100,000 calls/month</li>
                    <li>• Feature Feeds access</li>
                    <li>• Priority support</li>
                    <li>• Sub-100ms latency SLA</li>
                  </ul>
                  <Button className="w-full">Manage Plan</Button>
                </div>

                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">Enterprise Tier</h4>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Custom</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Unlimited scale & support</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Unlimited API calls</li>
                    <li>• Custom endpoints</li>
                    <li>• Dedicated support</li>
                    <li>• Custom SLAs</li>
                  </ul>
                  <Button variant="outline" className="w-full">Contact Sales</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="keys">
          <APIKeyManagement />
        </TabsContent>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints">
          <APIEndpoints />
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
