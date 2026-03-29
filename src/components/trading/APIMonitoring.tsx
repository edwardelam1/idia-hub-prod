import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle, Clock, TrendingUp, TrendingDown, Database } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";

export const APIMonitoring = () => {
  const { pipelineHealth, activeBundlesCount, stagedDataCount, isLoading } = useDashboardStats();

  const totalProcessed = pipelineHealth?.processed_raw_data ?? 0;
  const totalRaw = pipelineHealth?.total_raw_data ?? 0;
  const totalTransactions = pipelineHealth?.total_transactions ?? 0;
  const unprocessed = pipelineHealth?.unprocessed_raw_data ?? 0;
  const processing = pipelineHealth?.processing_raw_data ?? 0;
  const successRate = totalRaw > 0 ? ((totalProcessed / totalRaw) * 100).toFixed(2) : '—';

  return (
    <div className="space-y-4">
      {/* Real-time Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Status</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold text-foreground">
                  {unprocessed === 0 && processing === 0 ? 'Healthy' : 'Active'}
                </span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {processing > 0 ? `${processing} records processing` : 'All systems nominal'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records Processed</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-foreground">{totalProcessed.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              of {totalRaw.toLocaleString()} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Rate</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-foreground">{successRate}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {unprocessed > 0 ? (
                <span className="text-yellow-500">{unprocessed} pending</span>
              ) : (
                <span className="text-green-500">All processed</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold text-foreground">{totalTransactions.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                Live
              </Badge>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Health Breakdown</CardTitle>
          <CardDescription>Real-time data processing pipeline metrics from Supabase</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              <PipelineRow label="Total Raw Data" value={totalRaw} />
              <PipelineRow label="Processed" value={totalProcessed} color="text-green-500" />
              <PipelineRow label="Processing" value={processing} color="text-yellow-500" />
              <PipelineRow label="Unprocessed" value={unprocessed} color="text-orange-500" />
              <PipelineRow label="Total Staged Data" value={stagedDataCount} />
              <PipelineRow label="Unrewarded Staged" value={pipelineHealth?.unrewarded_staged_data ?? 0} color="text-yellow-500" />
              <PipelineRow label="Active Bundles" value={activeBundlesCount} color="text-primary" />
              <PipelineRow label="Total Transactions" value={totalTransactions} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Note */}
      <Card>
        <CardHeader>
          <CardTitle>Audit & Compliance</CardTitle>
          <CardDescription>
            All API access is logged in real-time (SEC-S-1.4 TOMS compliance)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>API call logs are retained for 7 years per regulatory requirements</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>All data access includes DigiRAMP Anchoring provenance IDs</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Real-time anomaly detection monitors for unauthorized access patterns</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Detailed telemetry (latency percentiles, error rates) is available via the API gateway dashboard once production traffic is established</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

function PipelineRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold ${color ?? 'text-foreground'}`}>{value.toLocaleString()}</span>
    </div>
  );
}
