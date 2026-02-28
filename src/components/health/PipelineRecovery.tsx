import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RecoveryResult {
  success: boolean;
  message: string;
  pipeline_status: {
    pending_raw_data: number;
    new_bundles_today: number;
    recent_rewards: number;
  };
  steps_completed: {
    fix_health_pipeline: boolean;
    process_health_streams: boolean;
    generate_bundles: boolean;
  };
}

export const PipelineRecovery = () => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState<RecoveryResult | null>(null);
  const { toast } = useToast();

  const triggerRecovery = async () => {
    setIsRecovering(true);
    setRecoveryResult(null);

    try {
      // Mock recovery – awaiting AWS Lambda
      await new Promise(resolve => setTimeout(resolve, 2000));
      const result: RecoveryResult = {
        success: true,
        message: 'Pipeline recovery simulation complete. Awaiting AWS Lambda integration.',
        pipeline_status: { pending_raw_data: 0, new_bundles_today: 0, recent_rewards: 0 },
        steps_completed: { fix_health_pipeline: true, process_health_streams: true, generate_bundles: true }
      };
      setRecoveryResult(result);
      toast({ title: "Pipeline Recovery Complete", description: result.message });
    } catch (error) {
      console.error('Recovery error:', error);
      toast({ title: "Recovery Error", description: "Failed to recover pipeline.", variant: "destructive" });
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Play className="h-5 w-5" />Health Pipeline Recovery</CardTitle>
        <CardDescription>Restore health data processing and payment flows</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4">
          <Button onClick={triggerRecovery} disabled={isRecovering} className="w-full">
            {isRecovering ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Recovering Pipeline...</>) : (<><Play className="mr-2 h-4 w-4" />Start Pipeline Recovery</>)}
          </Button>

          {recoveryResult && (
            <Alert className={recoveryResult.success ? "border-green-500" : "border-red-500"}>
              <div className="flex items-center gap-2">
                {recoveryResult.success ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-red-600" />}
                <AlertDescription className="font-medium">{recoveryResult.message}</AlertDescription>
              </div>
            </Alert>
          )}

          {recoveryResult?.pipeline_status && (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center"><div className="text-2xl font-bold">{recoveryResult.pipeline_status.pending_raw_data}</div><div className="text-sm text-muted-foreground">Pending Data</div></div>
              <div className="text-center"><div className="text-2xl font-bold">{recoveryResult.pipeline_status.new_bundles_today}</div><div className="text-sm text-muted-foreground">New Bundles</div></div>
              <div className="text-center"><div className="text-2xl font-bold">{recoveryResult.pipeline_status.recent_rewards}</div><div className="text-sm text-muted-foreground">Recent Rewards</div></div>
            </div>
          )}

          {recoveryResult?.steps_completed && (
            <div className="space-y-2">
              <h4 className="font-medium">Recovery Steps:</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant={recoveryResult.steps_completed.fix_health_pipeline ? "default" : "secondary"}>Fix Health Pipeline</Badge>
                <Badge variant={recoveryResult.steps_completed.process_health_streams ? "default" : "secondary"}>Process Health Streams</Badge>
                <Badge variant={recoveryResult.steps_completed.generate_bundles ? "default" : "secondary"}>Generate Bundles</Badge>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
