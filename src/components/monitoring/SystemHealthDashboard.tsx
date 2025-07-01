
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Zap, 
  Server, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users
} from 'lucide-react';

const SystemHealthDashboard = () => {
  const systemMetrics = {
    apiUptime: 99.9,
    dbPerformance: 85,
    edgeFunctionSuccess: 97.5,
    activeUsers: 2847,
    apiCalls: 125000,
    responseTime: 245
  };

  const services = [
    { name: 'Auth Service', status: 'operational', uptime: 99.9 },
    { name: 'Data API', status: 'operational', uptime: 99.7 },
    { name: 'AI Curator', status: 'degraded', uptime: 98.2 },
    { name: 'Payment Gateway', status: 'operational', uptime: 99.8 },
    { name: 'Storage', status: 'operational', uptime: 99.9 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-100 text-green-800';
      case 'degraded': return 'bg-yellow-100 text-yellow-800';
      case 'down': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'down': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Health Monitoring</h1>
        <p className="text-gray-600 mt-2">Real-time platform performance and service status</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{systemMetrics.apiUptime}%</div>
            <Progress value={systemMetrics.apiUptime} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DB Performance</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{systemMetrics.dbPerformance}%</div>
            <Progress value={systemMetrics.dbPerformance} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Edge Functions</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{systemMetrics.edgeFunctionSuccess}%</div>
            <Progress value={systemMetrics.edgeFunctionSuccess} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemMetrics.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+12% from last hour</p>
          </CardContent>
        </Card>
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>Current operational status of all platform services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <h4 className="font-medium">{service.name}</h4>
                    <p className="text-sm text-gray-500">Uptime: {service.uptime}%</p>
                  </div>
                </div>
                <Badge className={getStatusColor(service.status)} variant="outline">
                  {service.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              API Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total API Calls (24h)</span>
              <span className="font-semibold">{systemMetrics.apiCalls.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Average Response Time</span>
              <span className="font-semibold">{systemMetrics.responseTime}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Success Rate</span>
              <span className="font-semibold text-green-600">99.2%</span>
            </div>
            <div className="flex justify-between">
              <span>Error Rate</span>
              <span className="font-semibold text-red-600">0.8%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="mr-2 h-5 w-5" />
              Infrastructure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>CPU Usage</span>
              <span className="font-semibold">65%</span>
            </div>
            <div className="flex justify-between">
              <span>Memory Usage</span>
              <span className="font-semibold">78%</span>
            </div>
            <div className="flex justify-between">
              <span>Storage Usage</span>
              <span className="font-semibold">42%</span>
            </div>
            <div className="flex justify-between">
              <span>Network I/O</span>
              <span className="font-semibold">1.2 GB/s</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemHealthDashboard;
