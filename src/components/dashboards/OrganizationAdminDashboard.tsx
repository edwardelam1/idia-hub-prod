
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Building2, 
  CreditCard, 
  TrendingUp, 
  Shield, 
  FileText,
  Coins,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import SynapseVisualizer from '@/components/visualizer/SynapseVisualizer';

const OrganizationAdminDashboard = () => {
  const organizationStats = {
    totalUsers: 24,
    activeTeams: 6,
    monthlySpend: 3250,
    synapseCredits: 8500,
    dataUsage: 78,
    apiCalls: 12400
  };

  const recentActivity = [
    {
      id: 1,
      action: 'Team member added',
      details: 'Sarah Johnson joined Marketing Team',
      timestamp: '2 hours ago',
      type: 'user'
    },
    {
      id: 2,
      action: 'Data bundle downloaded',
      details: 'Tech Leadership Pipeline (150 credits)',
      timestamp: '4 hours ago',
      type: 'data'
    },
    {
      id: 3,
      action: 'API usage spike',
      details: 'Development team exceeded daily limit',
      timestamp: '6 hours ago',
      type: 'api'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Organization Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your organization's data intelligence operations</p>
      </div>

      {/* Synapse Visualizer */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Network Activity</CardTitle>
          <CardDescription>Real-time view of your organization's contribution to the IDIA Synapse Engine™</CardDescription>
        </CardHeader>
        <CardContent>
          <SynapseVisualizer />
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizationStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizationStats.activeTeams}</div>
            <p className="text-xs text-muted-foreground">Across departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Synapse Credits</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{organizationStats.synapseCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Available balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${organizationStats.monthlySpend.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+15% from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Usage and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Usage Overview</CardTitle>
            <CardDescription>Current usage against plan limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Data Usage</span>
                <span className="text-sm font-medium">{organizationStats.dataUsage}%</span>
              </div>
              <Progress value={organizationStats.dataUsage} />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">API Calls</span>
                <span className="text-sm font-medium">{organizationStats.apiCalls.toLocaleString()}/15,000</span>
              </div>
              <Progress value={(organizationStats.apiCalls / 15000) * 100} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest organization activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-gray-600">{activity.details}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrganizationAdminDashboard;
