import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, AlertTriangle } from 'lucide-react';

interface PipelineStats {
  pendingQueueItems: number;
  unprocessedRawData: number;
  nullStepCountRecords: number;
  processingRate: number;
  lastProcessed: string | null;
}

export const PipelineMonitor = () => {
  const [stats, setStats] = useState<PipelineStats>({
    pendingQueueItems: 0,
    unprocessedRawData: 0,
    nullStepCountRecords: 0,
    processingRate: 0,
    lastProcessed: null
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // Mock pipeline stats – awaiting AWS API
    setStats({
      pendingQueueItems: 0,
      unprocessedRawData: 0,
      nullStepCountRecords: 0,
      processingRate: 0,
      lastProcessed: null
    });
    setLastUpdate(new Date());
  }, []);

  const hasIssues = stats.pendingQueueItems > 0 || stats.unprocessedRawData > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Pipeline Health Monitor
          </CardTitle>
          <CardDescription>Real-time monitoring of the health data processing pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingQueueItems}</div>
              <div className="text-sm text-muted-foreground">Pending Queue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.unprocessedRawData}</div>
              <div className="text-sm text-muted-foreground">Unprocessed Raw</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.nullStepCountRecords}</div>
              <div className="text-sm text-muted-foreground">Non-Step Data</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.processingRate}</div>
              <div className="text-sm text-muted-foreground">Rate/Hour</div>
            </div>
          </div>

          {hasIssues && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Pipeline issues detected. There are {stats.pendingQueueItems + stats.unprocessedRawData} items requiring attention.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={hasIssues ? "destructive" : "default"}>
                {hasIssues ? "Issues Detected" : "Healthy"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
