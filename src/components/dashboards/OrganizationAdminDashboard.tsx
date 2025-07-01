
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  Coins,
  Activity,
  Settings,
  Shield
} from 'lucide-react';

const OrganizationAdminDashboard = () => {
  const orgStats = {
    totalUsers: 45,
    activeUsers: 38,
    teams: 6,
    synapseCredits: 12450,
    creditUsage: 68,
    monthlySpend: 8750
  };

  const recentActivity = [
    { user: 'Sarah Johnson', action: 'Downloaded Premier Data Bundle', credits: 450, time: '2 hours ago' },
    { user: 'Mike Davis', action: 'Used Premier Filters', credits: 50, time: '4 hours ago' },
    { user: 'Lisa Chen', action: 'API Call - Advanced Data', credits: 75, time: '6 hours ago' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Organization Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your team, billing, and organizational settings</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgStats.totalUsers}</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              {orgStats.activeUsers} active this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Teams</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgStats.teams}</div>
            <p className="text-xs text-gray-500 mt-1">Active teams</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Synapse Credits</CardTitle>
            <Coins className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgStats.synapseCredits.toLocaleString()}</div>
            <Progress value={100 - orgStats.creditUsage} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">{orgStats.creditUsage}% used this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <CreditCard className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${orgStats.monthlySpend.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">Current billing period</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription & Credits Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plan</CardTitle>
            <CardDescription>Current tier and usage limits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <Badge className="bg-purple-100 text-purple-800 mb-2">Professional Tier</Badge>
                <p className="text-2xl font-bold">$4,995/year</p>
                <p className="text-sm text-gray-500">Renews March 15, 2025</p>
              </div>
              <Button variant="outline">Upgrade Plan</Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Users (45/100)</span>
                <span>45%</span>
              </div>
              <Progress value={45} />
              <div className="flex justify-between text-sm">
                <span>API Calls (12.5K/25K)</span>
                <span>50%</span>
              </div>
              <Progress value={50} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Synapse Credits</CardTitle>
            <CardDescription>Manage your data access credits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-2xl font-bold">{orgStats.synapseCredits.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Credits remaining</p>
              </div>
              <Button>Purchase Credits</Button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Monthly Usage</span>
                <span className="text-red-600">High ({orgStats.creditUsage}%)</span>
              </div>
              <Progress value={orgStats.creditUsage} className="progress-warning" />
              <p className="text-xs text-amber-600 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Usage alert: 20% remaining
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Credit Usage</CardTitle>
          <CardDescription>Track your team's Synapse Credit consumption</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="font-medium">{activity.user}</p>
                    <p className="text-sm text-gray-500">{activity.action}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-purple-600">-{activity.credits} credits</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button variant="outline" className="w-full">View Detailed Usage Report</Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Manage Teams</h3>
            <p className="text-sm text-gray-500 mb-4">Create teams and assign users</p>
            <Button variant="outline" size="sm">Manage Teams</Button>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Compliance</h3>
            <p className="text-sm text-gray-500 mb-4">Review compliance settings</p>
            <Button variant="outline" size="sm">View Compliance</Button>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <Settings className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Organization Settings</h3>
            <p className="text-sm text-gray-500 mb-4">Configure organization preferences</p>
            <Button variant="outline" size="sm">Settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OrganizationAdminDashboard;
