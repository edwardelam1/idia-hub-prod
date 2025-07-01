
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Building2, 
  Brain, 
  Shield, 
  FileText, 
  Users, 
  TrendingUp, 
  DollarSign,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import SystemHealthDashboard from '@/components/monitoring/SystemHealthDashboard';
import OrganizationManagement from '@/components/management/OrganizationManagement';
import AIManagement from '@/components/ai/AIManagement';
import SynapseVisualizer from '@/components/visualizer/SynapseVisualizer';
import GeminiConfigModal from '@/components/ai/GeminiConfigModal';

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const overviewStats = {
    totalOrganizations: 45,
    activeUsers: 1247,
    monthlyRevenue: 89650,
    systemUptime: 99.9,
    pendingRequests: 3,
    aiGeneratedBundles: 127
  };

  const recentActivity = [
    {
      id: 1,
      action: 'New organization created',
      details: 'TechCorp Solutions - Enterprise Tier',
      timestamp: '2 hours ago',
      type: 'organization'
    },
    {
      id: 2,
      action: 'AI bundle approved',
      details: 'Healthcare IT Directors Q1 2024',
      timestamp: '4 hours ago',
      type: 'ai'
    },
    {
      id: 3,
      action: 'Security alert resolved',
      details: 'Suspicious login attempt blocked',
      timestamp: '6 hours ago',
      type: 'security'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'organization': return <Building2 className="h-4 w-4 text-blue-600" />;
      case 'ai': return <Brain className="h-4 w-4 text-purple-600" />;
      case 'security': return <Shield className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (activeTab === 'system-health') {
    return <SystemHealthDashboard />;
  }

  if (activeTab === 'organizations') {
    return <OrganizationManagement />;
  }

  if (activeTab === 'ai-management') {
    return <AIManagement />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform oversight and system management</p>
      </div>

      {/* Synapse Visualizer */}
      <Card>
        <CardHeader>
          <CardTitle>Network Activity Overview</CardTitle>
          <CardDescription>Live visualization of the IDIA Synapse Engine™ data flow</CardDescription>
        </CardHeader>
        <CardContent>
          <SynapseVisualizer />
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="system-health">System Health</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="ai-management">AI Management</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.totalOrganizations}</div>
                <p className="text-xs text-muted-foreground">+3 from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.activeUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${overviewStats.monthlyRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+8% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{overviewStats.systemUptime}%</div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
          </div>

          {/* Best Friend AI Configuration */}
          <GeminiConfigModal />

          {/* Quick Actions & Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Actions</CardTitle>
                <CardDescription>Items requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Account Conversion Requests</p>
                      <p className="text-sm text-gray-600">{overviewStats.pendingRequests} pending approval</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setActiveTab('organizations')}>
                    Review
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">AI Generated Bundles</p>
                      <p className="text-sm text-gray-600">{overviewStats.aiGeneratedBundles} awaiting review</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setActiveTab('ai-management')}>
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      {getActivityIcon(activity.type)}
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

          {/* System Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle>System Status Overview</CardTitle>
              <CardDescription>Quick view of critical systems</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'API Gateway', status: 'operational', uptime: '99.9%' },
                  { name: 'Database', status: 'operational', uptime: '99.8%' },
                  { name: 'AI Service', status: 'operational', uptime: '98.5%' },
                  { name: 'Payment System', status: 'operational', uptime: '99.7%' }
                ].map((service) => (
                  <div key={service.name} className="text-center p-4 border rounded-lg">
                    <div className="flex items-center justify-center mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <h4 className="font-medium">{service.name}</h4>
                    <p className="text-sm text-gray-600">{service.uptime} uptime</p>
                    <Badge variant="outline" className="bg-green-100 text-green-800 mt-1">
                      {service.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Management</CardTitle>
              <CardDescription>Platform security settings and monitoring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">IP Whitelisting</h3>
                  <p className="text-gray-600 mb-4">Configure IP address restrictions for high-privilege accounts</p>
                  <Button>Manage IP Whitelist</Button>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Security Alerts</h3>
                  <div className="space-y-2">
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-red-800">Suspicious Login Detected</p>
                          <p className="text-sm text-red-600">Multiple failed attempts from IP: 192.168.1.100</p>
                        </div>
                        <Badge variant="outline" className="bg-red-100 text-red-800">
                          Blocked
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Detailed, immutable logs of all platform actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    timestamp: '2024-01-15 14:30:22',
                    user: 'super-admin@idia.com',
                    action: 'Organization Created',
                    details: 'Created TechCorp Solutions with Enterprise tier',
                    ip: '192.168.1.50'
                  },
                  {
                    timestamp: '2024-01-15 14:25:15',
                    user: 'admin@techcorp.com',
                    action: 'Bundle Downloaded',
                    details: 'Downloaded Healthcare IT Directors bundle (150 credits)',
                    ip: '10.0.0.25'
                  },
                  {
                    timestamp: '2024-01-15 14:20:08',
                    user: 'ai-curator@system',
                    action: 'Bundle Generated',
                    details: 'Generated Fintech Startup Founders bundle (780 contacts)',
                    ip: 'internal'
                  }
                ].map((log, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{log.action}</span>
                      <span className="text-sm text-gray-500">{log.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{log.details}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>User: {log.user}</span>
                      <span>IP: {log.ip}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDashboard;
