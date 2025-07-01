
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  Download,
  Coins,
  Calendar,
  CheckCircle,
  Clock,
  Search,
  Heart
} from 'lucide-react';
import SynapseVisualizer from '@/components/visualizer/SynapseVisualizer';

const TeamMemberDashboard = () => {
  const memberStats = {
    monthlyGoal: 500,
    achieved: 320,
    synapseCredits: 150,
    bundlesDownloaded: 5,
    savedSearches: 8,
    myLists: 3
  };

  const recentActivity = [
    {
      id: 1,
      action: 'Downloaded SaaS Growth Companies bundle',
      timestamp: '2 hours ago',
      credits: 45,
      type: 'download'
    },
    {
      id: 2,
      action: 'Created new prospect list',
      timestamp: '1 day ago',
      credits: 0,
      type: 'list'
    },
    {
      id: 3,
      action: 'Saved search query',
      timestamp: '2 days ago',
      credits: 0,
      type: 'search'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'download': return <Download className="h-4 w-4 text-blue-600" />;
      case 'list': return <Heart className="h-4 w-4 text-red-600" />;
      case 'search': return <Search className="h-4 w-4 text-green-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-600 mt-2">Track your data intelligence activities and performance</p>
      </div>

      {/* Synapse Visualizer */}
      <Card>
        <CardHeader>
          <CardTitle>Network Contribution</CardTitle>
          <CardDescription>Your personal contribution to the IDIA Synapse Engine™ collective intelligence</CardDescription>
        </CardHeader>
        <CardContent>
          <SynapseVisualizer />
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Goal</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((memberStats.achieved / memberStats.monthlyGoal) * 100)}%</div>
            <p className="text-xs text-muted-foreground">${memberStats.achieved} / ${memberStats.monthlyGoal}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Credits</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{memberStats.synapseCredits}</div>
            <p className="text-xs text-muted-foreground">Available balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloaded</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberStats.bundlesDownloaded}</div>
            <p className="text-xs text-muted-foreground">Data bundles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Items</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memberStats.savedSearches + memberStats.myLists}</div>
            <p className="text-xs text-muted-foreground">Searches & Lists</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Performance</CardTitle>
            <CardDescription>Progress towards personal goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Monthly Target</span>
                <span className="text-sm font-medium">{Math.round((memberStats.achieved / memberStats.monthlyGoal) * 100)}%</span>
              </div>
              <Progress value={(memberStats.achieved / memberStats.monthlyGoal) * 100} />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Data Utilization</span>
                <span className="text-sm font-medium">42%</span>
              </div>
              <Progress value={42} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest data intelligence actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">{activity.timestamp}</p>
                      {activity.credits > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {activity.credits} credits
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Commonly used features and tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Search className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <p className="text-sm font-medium">Search Data</p>
            </div>
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Heart className="h-8 w-8 mx-auto mb-2 text-red-600" />
              <p className="text-sm font-medium">My Lists</p>
            </div>
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium">Saved Searches</p>
            </div>
            <div className="text-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-medium">Analytics</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamMemberDashboard;
