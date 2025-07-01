
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  TrendingUp, 
  Search, 
  FileText, 
  Activity,
  Database,
  Clock
} from 'lucide-react';

const TeamLeadDashboard = () => {
  const teamStats = {
    teamSize: 8,
    activeMembers: 6,
    savedSearches: 23,
    sharedLists: 15,
    weeklyActivity: 78
  };

  const teamMembers = [
    { name: 'Mike Davis', role: 'Senior Analyst', status: 'active', searches: 12, credits: 340 },
    { name: 'Lisa Chen', role: 'Data Specialist', status: 'active', searches: 8, credits: 220 },
    { name: 'Alex Rodriguez', role: 'Research Lead', status: 'active', searches: 15, credits: 480 },
    { name: 'Emma Wilson', role: 'Analyst', status: 'inactive', searches: 3, credits: 85 }
  ];

  const recentSearches = [
    { name: 'Tech Startups - West Coast', created: '2 hours ago', shared: true, results: 1250 },
    { name: 'Healthcare Decision Makers', created: '1 day ago', shared: false, results: 890 },
    { name: 'E-commerce Mid-Market', created: '2 days ago', shared: true, results: 2100 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Team Lead Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your team's data research and collaboration</p>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.teamSize}</div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <Activity className="h-3 w-3 mr-1" />
              {teamStats.activeMembers} active this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Searches</CardTitle>
            <Search className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.savedSearches}</div>
            <p className="text-xs text-gray-500 mt-1">Team searches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shared Lists</CardTitle>
            <FileText className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.sharedLists}</div>
            <p className="text-xs text-gray-500 mt-1">Collaborative lists</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Activity</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.weeklyActivity}%</div>
            <Progress value={teamStats.weeklyActivity} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">vs last week</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>Monitor your team's activity and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map((member, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.role}</p>
                  </div>
                  <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                    {member.status}
                  </Badge>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-medium">{member.searches} searches</p>
                  <p className="text-xs text-purple-600">{member.credits} credits used</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button variant="outline" className="w-full">Manage Team Members</Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Team Searches */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Team Searches</CardTitle>
          <CardDescription>Latest searches created by your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSearches.map((search, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Database className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{search.name}</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Created {search.created}
                    </p>
                  </div>
                  {search.shared && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Shared
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">{search.results.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">results</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex space-x-2">
            <Button variant="outline">View All Searches</Button>
            <Button>Create New Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Search className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Create Team Search</h3>
            <p className="text-sm text-gray-500 mb-4">Start a new collaborative search</p>
            <Button>Create Search</Button>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Team Analytics</h3>
            <p className="text-sm text-gray-500 mb-4">View detailed team performance</p>
            <Button variant="outline">View Analytics</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamLeadDashboard;
