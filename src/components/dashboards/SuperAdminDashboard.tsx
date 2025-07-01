
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Users, 
  Database, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Building2,
  Clock
} from 'lucide-react';

const SuperAdminDashboard = () => {
  const systemMetrics = {
    apiUptime: 99.9,
    dbPerformance: 95,
    edgeFunctionRate: 98.2,
  };

  const pendingRequests = [
    { org: 'TechCorp Inc.', type: 'Business', requested: '2 hours ago' },
    { org: 'Green Solutions', type: 'Non-profit', requested: '5 hours ago' },
    { org: 'DataFlow Systems', type: 'Business', requested: '1 day ago' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
        <p className="text-gray-600 mt-2">Monitor platform health and manage client organizations</p>
      </div>

      {/* System Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Uptime</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{systemMetrics.apiUptime}%</div>
            <Progress value={systemMetrics.apiUptime} className="mt-2" />
            <p className="text-xs text-gray-500 mt-2">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Performance</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{systemMetrics.dbPerformance}%</div>
            <Progress value={systemMetrics.dbPerformance} className="mt-2" />
            <p className="text-xs text-gray-500 mt-2">Query response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Edge Functions</CardTitle>
            <Zap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{systemMetrics.edgeFunctionRate}%</div>
            <Progress value={systemMetrics.edgeFunctionRate} className="mt-2" />
            <p className="text-xs text-gray-500 mt-2">Execution success rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Client Organization Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12 this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,421</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +156 this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Consumed (24h)</CardTitle>
            <Zap className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45.2K</div>
            <p className="text-xs text-gray-500 mt-1">Synapse Credits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (MTD)</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$127.5K</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +23% vs last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Account Conversion Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Pending Account Conversion Requests
          </CardTitle>
          <CardDescription>
            Account upgrade requests from IDIA Life users requiring approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pendingRequests.map((request, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="font-medium">{request.org}</p>
                    <p className="text-sm text-gray-500">Requested {request.requested}</p>
                  </div>
                  <Badge variant={request.type === 'Business' ? 'default' : 'secondary'}>
                    {request.type}
                  </Badge>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">Reject</Button>
                  <Button size="sm">Approve</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Data Curator Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="mr-2 h-5 w-5 text-purple-600" />
            AI Data Curator Agent Status
          </CardTitle>
          <CardDescription>
            Monitor and manage the AI agent responsible for data bundle curation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium">Agent Status</p>
                <p className="text-sm text-green-600">Online & Processing</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Database className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Bundles Generated (24h)</p>
                <p className="text-sm text-blue-600">342 bundles</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium">Processing Queue</p>
                <p className="text-sm text-purple-600">12 pending</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex space-x-2">
            <Button variant="outline" size="sm">Configure Parameters</Button>
            <Button variant="outline" size="sm">Audit Bundles</Button>
            <Button variant="outline" size="sm">View Logs</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
