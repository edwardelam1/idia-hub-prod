import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usePipelineActivity } from '@/hooks/usePipelineActivity';
import { Activity, Database, Package, Users, Zap } from 'lucide-react';
import { format } from 'date-fns';

export const PipelineActivityMonitor = () => {
  const { activities, isActive, activityCount } = usePipelineActivity();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'health_data_received':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'data_processed':
        return <Database className="h-4 w-4 text-green-500" />;
      case 'bundle_created':
        return <Package className="h-4 w-4 text-purple-500" />;
      case 'user_connected':
        return <Users className="h-4 w-4 text-orange-500" />;
      default:
        return <Zap className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityTitle = (type: string) => {
    switch (type) {
      case 'health_data_received':
        return 'Health Data Received';
      case 'data_processed':
        return 'Data Processed';
      case 'bundle_created':
        return 'Bundle Created';
      case 'user_connected':
        return 'User Connected';
      default:
        return 'Pipeline Activity';
    }
  };

  const getActivityDescription = (activity: any) => {
    switch (activity.type) {
      case 'health_data_received':
        return `${activity.details.stepCount} steps from ${activity.details.userId}`;
      case 'bundle_created':
        return `${activity.details.title} (${activity.details.contactsCount} contacts)`;
      case 'data_processed':
        return 'Data anonymized and staged';
      default:
        return 'Pipeline activity detected';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Pipeline Activity Monitor
              {isActive && (
                <Badge variant="default" className="bg-green-500">
                  Active
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Real-time monitoring of data pipeline synchronization
            </CardDescription>
          </div>
          <Badge variant="outline">
            {activityCount} total events
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No pipeline activity detected yet</p>
            <p className="text-sm">Waiting for IDIA Life data...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div className="mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">
                      {getActivityTitle(activity.type)}
                    </h4>
                    <span className="text-xs text-gray-500">
                      {format(new Date(activity.timestamp), 'MMM d, HH:mm:ss')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {getActivityDescription(activity)}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {activity.type.replace('_', ' ')}
                    </Badge>
                    {activity.details.userId && (
                      <Badge variant="outline" className="text-xs">
                        User: {activity.details.userId.slice(0, 8)}...
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};