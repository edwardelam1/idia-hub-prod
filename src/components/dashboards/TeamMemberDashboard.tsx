
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  FileText, 
  Download, 
  TrendingUp, 
  Clock,
  Database,
  Coins,
  Share2
} from 'lucide-react';

const TeamMemberDashboard = () => {
  const userStats = {
    savedSearches: 12,
    myLists: 8,
    creditsUsed: 450,
    monthlyLimit: 1000,
    downloadsThisMonth: 23
  };

  const mySearches = [
    { name: 'SaaS Companies - Series B', created: '1 hour ago', results: 247, credits: 25 },
    { name: 'Healthcare IT Directors', created: '3 hours ago', results: 189, credits: 45 },
    { name: 'Fintech Startups West Coast', created: '1 day ago', results: 156, credits: 35 },
    { name: 'E-commerce Marketing Leads', created: '2 days ago', results: 423, credits: 50 }
  ];

  const myLists = [
    { name: 'Q4 Prospect Pipeline', contacts: 145, shared: false, updated: '2 hours ago' },
    { name: 'Healthcare Decision Makers', contacts: 89, shared: true, updated: '1 day ago' },
    { name: 'Tech Startup Founders', contacts: 203, shared: false, updated: '3 days ago' }
  ];

  const recentDownloads = [
    { name: 'Premier Data Bundle - Tech Leaders', size: '2,450 contacts', date: '2 hours ago', credits: 150 },
    { name: 'Advanced Healthcare Bundle', size: '1,200 contacts', date: '1 day ago', credits: 85 },
    { name: 'Foundational Fintech Data', size: '890 contacts', date: '3 days ago', credits: 40 }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-600 mt-2">Access your saved searches, lists, and data downloads</p>
      </div>

      {/* Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved Searches</CardTitle>
            <Search className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.savedSearches}</div>
            <p className="text-xs text-gray-500 mt-1">Personal searches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Lists</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.myLists}</div>
            <p className="text-xs text-gray-500 mt-1">Contact lists</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
            <Coins className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.creditsUsed}</div>
            <Progress value={(userStats.creditsUsed / userStats.monthlyLimit) * 100} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">of {userStats.monthlyLimit} monthly limit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Downloads</CardTitle>
            <Download className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.downloadsThisMonth}</div>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* My Saved Searches */}
      <Card>
        <CardHeader>
          <CardTitle>My Saved Searches</CardTitle>
          <CardDescription>Quick access to your frequently used search queries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mySearches.map((search, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <Database className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">{search.name}</p>
                    <p className="text-sm text-gray-500 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      Created {search.created}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{search.results} results</p>
                  <p className="text-xs text-purple-600">{search.credits} credits</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex space-x-2">
            <Button>Create New Search</Button>
            <Button variant="outline">View All Searches</Button>
          </div>
        </CardContent>
      </Card>

      {/* My Lists */}
      <Card>
        <CardHeader>
          <CardTitle>My Contact Lists</CardTitle>
          <CardDescription>Manage your saved contact and company lists</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {myLists.map((list, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">{list.name}</p>
                    <p className="text-sm text-gray-500">Updated {list.updated}</p>
                  </div>
                  {list.shared && (
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      <Share2 className="h-3 w-3 mr-1" />
                      Shared
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">{list.contacts} contacts</p>
                  <Button variant="ghost" size="sm" className="mt-1">
                    View List
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex space-x-2">
            <Button>Create New List</Button>
            <Button variant="outline">Manage Lists</Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Downloads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Downloads</CardTitle>
          <CardDescription>Your latest data bundle downloads and exports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentDownloads.map((download, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Download className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">{download.name}</p>
                    <p className="text-sm text-gray-500">{download.size} • {download.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">-{download.credits} credits</p>
                  <Button variant="ghost" size="sm">
                    Re-download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="text-center">
          <CardContent className="pt-6">
            <Database className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Browse Marketplace</h3>
            <p className="text-sm text-gray-500 mb-4">Discover new data bundles</p>
            <Button>Explore Data</Button>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <Search className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">New Search</h3>
            <p className="text-sm text-gray-500 mb-4">Create a targeted search query</p>
            <Button variant="outline">Start Search</Button>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-6">
            <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Usage Analytics</h3>
            <p className="text-sm text-gray-500 mb-4">Track your data usage</p>
            <Button variant="outline">View Analytics</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamMemberDashboard;
