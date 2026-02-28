import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { fetchApi } from '@/lib/api';

interface ProcessingStats {
  processed_count: number;
  pending_queue_items: number;
  unprocessed_raw_items: number;
  message: string;
}

export const HealthDataProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<ProcessingStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const triggerHealthPipelineFix = async () => {
    setIsProcessing(true);
    setError(null);
    setProcessingResult(null);

    try {
      // Mock pipeline fix – awaiting AWS Lambda
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingResult({
        processed_count: 0,
        pending_queue_items: 0,
        unprocessed_raw_items: 0,
        message: 'Pipeline check complete. Awaiting AWS Lambda integration.'
      });
    } catch (err) {
      console.error('Pipeline fix error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fix pipeline');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Health Data Pipeline Management
        </CardTitle>
        <CardDescription>Process pending health data and fix pipeline issues</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={triggerHealthPipelineFix} disabled={isProcessing} className="w-full">
          {isProcessing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing Pipeline...</>) : (<><Play className="mr-2 h-4 w-4" />Fix Health Data Pipeline</>)}
        </Button>

        {processingResult && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">{processingResult.message}</p>
                <ul className="text-sm text-muted-foreground">
                  <li>• Processed: {processingResult.processed_count} items</li>
                  <li>• Pending queue: {processingResult.pending_queue_items} items</li>
                  <li>• Unprocessed raw: {processingResult.unprocessed_raw_items} items</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
