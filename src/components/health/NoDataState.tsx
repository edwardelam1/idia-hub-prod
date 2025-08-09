import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, Plus, Activity, Smartphone } from 'lucide-react';

interface NoDataStateProps {
  onAddData?: () => void;
}

const NoDataState: React.FC<NoDataStateProps> = ({ onAddData }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4 w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Database className="h-8 w-8 text-gray-400" />
          </div>
          <CardTitle>No Health Data Available</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              To see data in the marketplace, you need to provide real health activity data. 
              Simulated data is not allowed in this system.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3 text-sm text-gray-600">
            <p>You can add health data by:</p>
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Manually recording your activities</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Smartphone className="h-4 w-4" />
                <span>Connecting fitness devices (coming soon)</span>
              </div>
            </div>
          </div>

          {onAddData && (
            <Button onClick={onAddData} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Health Data
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NoDataState;