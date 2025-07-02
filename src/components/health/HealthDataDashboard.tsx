import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Clock, TrendingUp, Users } from 'lucide-react';
import { useHealthMetrics } from '@/hooks/useHealthMetrics';
import { format } from 'date-fns';

const HealthDataDashboard = () => {
  const { healthMetrics, healthStats, isLoading, error } = useHealthMetrics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Health Data Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Health Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Health Records</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{healthStats.totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Live data from IDIA Synapse
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Records</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{healthStats.todayRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Records received today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Steps</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{healthStats.averageSteps.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From recent submissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Activity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {healthStats.lastActivity ? (
                format(new Date(healthStats.lastActivity), 'HH:mm')
              ) : 'None'}
            </div>
            <p className="text-xs text-muted-foreground">
              {healthStats.lastActivity ? (
                format(new Date(healthStats.lastActivity), 'MMM d, yyyy')
              ) : 'No activity yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Health Data */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Health Data</CardTitle>
          <CardDescription>
            Latest health metrics received from connected devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {healthMetrics.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-gray-600 border-b pb-2">
                <div>Step Count</div>
                <div>Recorded At</div>
                <div>Received At</div>
                <div>Source</div>
              </div>
              {healthMetrics.slice(0, 10).map((metric) => (
                <div key={metric.id} className="grid grid-cols-4 gap-4 text-sm">
                  <div className="font-medium">
                    {metric.step_count?.toLocaleString() || 'N/A'}
                  </div>
                  <div className="text-gray-600">
                    {metric.recorded_at ? format(new Date(metric.recorded_at), 'MMM d, HH:mm') : 'N/A'}
                  </div>
                  <div className="text-gray-600">
                    {metric.created_at ? format(new Date(metric.created_at), 'MMM d, HH:mm') : 'N/A'}
                  </div>
                  <div>
                    <Badge variant="secondary">
                      {metric.user_id ? 'User' : 'Anonymous'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No health data received yet</p>
              <p className="text-sm">Waiting for device connections...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthDataDashboard;