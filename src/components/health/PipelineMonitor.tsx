import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, Database, TrendingUp, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchPipelineStats = async () => {
    try {
      // Get pending queue items
      const { data: queueData, error: queueError } = await supabase
        .from('data_processing_queue')
        .select('*')
        .eq('processing_status', 'pending');

      // Get unprocessed raw health data
      const { data: rawData, error: rawError } = await supabase
        .from('raw_health_data')
        .select('*')
        .eq('processed', false);

      // Get health metrics with null step counts
      const { data: nullData, error: nullError } = await supabase
        .from('health_metrics')
        .select('*')
        .is('step_count', null);

      // Get last successful processing time
      const { data: lastProcessedData } = await supabase
        .from('data_processing_queue')
        .select('updated_at')
        .eq('processing_status', 'completed')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (!queueError && !rawError && !nullError) {
        setStats({
          pendingQueueItems: queueData?.length || 0,
          unprocessedRawData: rawData?.length || 0,
          nullStepCountRecords: nullData?.length || 0,
          processingRate: calculateProcessingRate(queueData || []),
          lastProcessed: lastProcessedData?.[0]?.updated_at || null
        });
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching pipeline stats:', error);
    }
  };

  const calculateProcessingRate = (queueData: any[]): number => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentProcessed = queueData.filter(item => 
      item.updated_at && new Date(item.updated_at) > oneHourAgo
    );
    return recentProcessed.length;
  };

  const triggerPipelineFix = async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('fix-health-pipeline', {
        body: { manual_trigger: true, source: 'pipeline_monitor' }
      });

      if (error) {
        console.error('Pipeline fix error:', error);
      } else {
        console.log('Pipeline fix triggered successfully:', data);
        // Refresh stats after a delay
        setTimeout(() => {
          fetchPipelineStats();
        }, 2000);
      }
    } catch (error) {
      console.error('Error triggering pipeline fix:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPipelineStats();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPipelineStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const hasIssues = stats.pendingQueueItems > 0 || stats.unprocessedRawData > 0 || stats.nullStepCountRecords > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Pipeline Health Monitor
          </CardTitle>
          <CardDescription>
            Real-time monitoring of the health data processing pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pendingQueueItems}
              </div>
              <div className="text-sm text-muted-foreground">Pending Queue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.unprocessedRawData}
              </div>
              <div className="text-sm text-muted-foreground">Unprocessed Raw</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.nullStepCountRecords}
              </div>
              <div className="text-sm text-muted-foreground">Null Step Counts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.processingRate}
              </div>
              <div className="text-sm text-muted-foreground">Rate/Hour</div>
            </div>
          </div>

          {hasIssues && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Pipeline issues detected. There are {stats.pendingQueueItems + stats.unprocessedRawData + stats.nullStepCountRecords} items requiring attention.
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
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPipelineStats}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              {hasIssues && (
                <Button
                  onClick={triggerPipelineFix}
                  disabled={isRefreshing}
                  size="sm"
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Fix Pipeline
                </Button>
              )}
            </div>
          </div>

          {stats.lastProcessed && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm">
                <span className="text-muted-foreground">Last successful processing: </span>
                <span className="font-medium">
                  {new Date(stats.lastProcessed).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};