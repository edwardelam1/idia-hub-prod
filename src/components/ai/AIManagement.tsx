
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Settings, 
  TrendingUp, 
  Database, 
  Zap,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';

const AIManagement = () => {
  const [curatorSettings, setCuratorSettings] = useState({
    enabled: true,
    aggressiveness: [75],
    minBundleSize: [100],
    maxBundleSize: [5000],
    refreshInterval: [60],
    autoApprove: false
  });

  const curatorStats = {
    bundlesGenerated: 1247,
    bundlesApproved: 1089,
    bundlesRejected: 158,
    avgMatchScore: 87.3,
    uptime: 99.2
  };

  const pendingBundles = [
    {
      id: 1,
      name: 'Healthcare IT Directors Q1 2024',
      description: 'CIOs and IT Directors at hospitals with 500+ beds',
      contacts: 1250,
      tier: 'Advanced',
      matchScore: 92,
      generated: '2024-01-15T10:30:00Z',
      status: 'pending'
    },
    {
      id: 2,
      name: 'Fintech Startup Founders',
      description: 'Founders and CEOs at Series A fintech companies',
      contacts: 780,
      tier: 'Premier',
      matchScore: 89,
      generated: '2024-01-15T09:15:00Z',
      status: 'pending'
    },
    {
      id: 3,
      name: 'Manufacturing Supply Chain Leads',
      description: 'Supply chain directors at manufacturing companies',
      contacts: 950,
      tier: 'Advanced',
      matchScore: 85,
      generated: '2024-01-15T08:45:00Z',
      status: 'pending'
    }
  ];

  const handleSettingChange = (key: string, value: any) => {
    setCuratorSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApproveBundle = (bundleId: number) => {
    console.log('Approving bundle:', bundleId);
  };

  const handleRejectBundle = (bundleId: number) => {
    console.log('Rejecting bundle:', bundleId);
  };

  const handleSaveSettings = () => {
    console.log('Saving AI settings:', curatorSettings);
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'Premier': return 'bg-purple-100 text-purple-800';
      case 'Advanced': return 'bg-blue-100 text-blue-800';
      case 'Foundational': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI & Marketplace Management</h1>
        <p className="text-gray-600 mt-2">Configure and monitor the AI Data Curator Agent</p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="settings">AI Settings</TabsTrigger>
          <TabsTrigger value="bundles">Bundle Review</TabsTrigger>
          <TabsTrigger value="tiers">Tier Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* AI Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="mr-2 h-5 w-5" />
                AI Data Curator Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${curatorSettings.enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className={`font-medium ${curatorSettings.enabled ? 'text-green-700' : 'text-red-700'}`}>
                    {curatorSettings.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSettingChange('enabled', !curatorSettings.enabled)}
                >
                  {curatorSettings.enabled ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {curatorSettings.enabled ? 'Pause' : 'Start'}
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{curatorStats.bundlesGenerated}</div>
                  <p className="text-sm text-gray-600">Bundles Generated</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{curatorStats.bundlesApproved}</div>
                  <p className="text-sm text-gray-600">Approved</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{curatorStats.bundlesRejected}</div>
                  <p className="text-sm text-gray-600">Rejected</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{curatorStats.avgMatchScore}%</div>
                  <p className="text-sm text-gray-600">Avg Match Score</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{curatorStats.uptime}%</div>
                  <p className="text-sm text-gray-600">Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Curator Configuration</CardTitle>
              <CardDescription>Adjust the AI agent's behavior and parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ai-enabled">Enable AI Data Curator</Label>
                  <p className="text-sm text-gray-500">Allow the AI to automatically generate data bundles</p>
                </div>
                <Switch
                  id="ai-enabled"
                  checked={curatorSettings.enabled}
                  onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Curation Aggressiveness: {curatorSettings.aggressiveness[0]}%</Label>
                <Slider
                  value={curatorSettings.aggressiveness}
                  onValueChange={(value) => handleSettingChange('aggressiveness', value)}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">Higher values create more targeted, specific bundles</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Bundle Size: {curatorSettings.minBundleSize[0]} contacts</Label>
                  <Slider
                    value={curatorSettings.minBundleSize}
                    onValueChange={(value) => handleSettingChange('minBundleSize', value)}
                    min={50}
                    max={1000}
                    step={50}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Bundle Size: {curatorSettings.maxBundleSize[0]} contacts</Label>
                  <Slider
                    value={curatorSettings.maxBundleSize}
                    onValueChange={(value) => handleSettingChange('maxBundleSize', value)}
                    min={1000}
                    max={10000}
                    step={500}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Refresh Interval: {curatorSettings.refreshInterval[0]} minutes</Label>
                <Slider
                  value={curatorSettings.refreshInterval}
                  onValueChange={(value) => handleSettingChange('refreshInterval', value)}
                  min={15}
                  max={240}
                  step={15}
                  className="w-full"
                />
                <p className="text-sm text-gray-500">How often the AI checks for new data to curate</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-approve">Auto-approve high-scoring bundles</Label>
                  <p className="text-sm text-gray-500">Automatically approve bundles with match scores above 90%</p>
                </div>
                <Switch
                  id="auto-approve"
                  checked={curatorSettings.autoApprove}
                  onCheckedChange={(checked) => handleSettingChange('autoApprove', checked)}
                />
              </div>

              <Button onClick={handleSaveSettings} className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bundles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Bundle Review</CardTitle>
              <CardDescription>Review and approve bundles generated by the AI</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingBundles.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No bundles pending review</p>
              ) : (
                <div className="space-y-4">
                  {pendingBundles.map((bundle) => (
                    <div key={bundle.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{bundle.name}</h4>
                          <p className="text-gray-600 mt-1">{bundle.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getTierColor(bundle.tier)} variant="outline">
                            {bundle.tier}
                          </Badge>
                          <div className="text-right">
                            <div className="text-sm font-medium text-purple-600">{bundle.matchScore}%</div>
                            <div className="text-xs text-gray-500">match</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-500">Contacts:</span>
                          <span className="ml-2 font-medium">{bundle.contacts.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Generated:</span>
                          <span className="ml-2 font-medium">
                            {new Date(bundle.generated).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <Badge variant="outline" className="ml-2">
                            {bundle.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRejectBundle(bundle.id)}
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApproveBundle(bundle.id)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tiers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Tiers Configuration</CardTitle>
              <CardDescription>Define pricing, features, and filter access for each tier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['Starter', 'Professional', 'Enterprise'].map((tier) => (
                  <Card key={tier} className="border-2">
                    <CardHeader>
                      <CardTitle className="text-lg">{tier}</CardTitle>
                      <div className="text-2xl font-bold">
                        ${tier === 'Starter' ? '299' : tier === 'Professional' ? '999' : '39,995'}
                        <span className="text-sm font-normal">/year</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label>Filter Access</Label>
                        <div className="space-y-1">
                          <Badge variant="outline" className="bg-green-100 text-green-800">
                            Foundational
                          </Badge>
                          {tier !== 'Starter' && (
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 ml-1">
                              Advanced
                            </Badge>
                          )}
                          {tier === 'Enterprise' && (
                            <Badge variant="outline" className="bg-purple-100 text-purple-800 ml-1">
                              Premier
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label>Base Credits</Label>
                        <p className="text-sm text-gray-600">
                          {tier === 'Starter' ? '500' : tier === 'Professional' ? '2,000' : '10,000'} credits/year
                        </p>
                      </div>
                      <div>
                        <Label>API Access</Label>
                        <p className="text-sm text-gray-600">
                          {tier === 'Enterprise' ? 'Full API Access' : 'Limited API Access'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIManagement;
