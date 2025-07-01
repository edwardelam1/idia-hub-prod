
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Target, 
  TrendingUp, 
  Download,
  Coins,
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react';
import SynapseVisualizer from '@/components/visualizer/SynapseVisualizer';

const TeamLeadDashboard = () => {
  const teamStats = {
    teamMembers: 8,
    monthlyQuota: 2500,
    quotaAchieved: 1850,
    synapseCredits: 1200,
    bundlesDownloaded: 15,
    activeProjects: 4
  };

  const teamActivity = [
    {
      id: 1,
      member: 'Alice Chen',
      action: 'Downloaded Healthcare Decision Makers bundle',
      timestamp: '1 hour ago',
      credits: 85
    },
    {
      id: 2,
      member: 'Bob Wilson',
      action: 'Created new prospect list',
      timestamp: '3 hours ago',
      credits: 0
    },
    {
      id: 3,
      member: 'Carol Davis',
      action: 'Shared search query with team',
      timestamp: '5 hours ago',
      credits: 0
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Team Lead Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor your team's performance and data intelligence activities</p>
      </div>

      {/* Synapse Visualizer */}
      <Card>
        <CardHeader>
          <CardTitle>Team Network Contribution</CardTitle>
          <CardDescription>Your team's real-time contribution to the IDIA Synapse Engine™</CardDescription>
        </CardHeader>
        <CardContent>
          <SynapseVisualizer />
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Quota</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round((teamStats.quotaAchieved / teamStats.monthlyQuota) * 100)}%</div>
            <p className="text-xs text-muted-foreground">${teamStats.quotaAchieved.toLocaleString()} / ${teamStats.monthlyQuota.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Credits</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{teamStats.synapseCredits.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Available to team</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bundles Downloaded</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.bundlesDownloaded}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>Progress towards monthly goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Revenue Target</span>
                <span className="text-sm font-medium">{Math.round((teamStats.quotaAchieved / teamStats.monthlyQuota) * 100)}%</span>
              </div>
              <Progress value={(teamStats.quotaAchieved / teamStats.monthlyQuota) * 100} />
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Data Utilization</span>
                <span className="text-sm font-medium">65%</span>
              </div>
              <Progress value={65} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Activity</CardTitle>
            <CardDescription>Recent team member actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.member}</p>
                    <p className="text-xs text-gray-600">{activity.action}</p>
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
    </div>
  );
};

export default TeamLeadDashboard;
