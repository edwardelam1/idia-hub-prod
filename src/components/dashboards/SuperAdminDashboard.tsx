import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Building2, Brain, Shield, Users, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import OrganizationManagement from "@/components/management/OrganizationManagement";
import AIManagement from "@/components/ai/AIManagement";
import SynapseVisualizer from "@/components/visualizer/SynapseVisualizer";
import HealthDataDashboard from "@/components/health/HealthDataDashboard";
import { SystemHealthDashboard } from "@/components/system/SystemHealthDashboard";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { toast } from "sonner";

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { pipelineHealth, activeBundlesCount, stagedDataCount } = useDashboardStats();

  const overviewStats = {
    totalOrganizations: 0,
    activeUsers: pipelineHealth?.total_raw_data ?? 0,
    monthlyRevenue: 0,
    systemUptime: pipelineHealth
      ? Math.round((pipelineHealth.processed_raw_data / Math.max(pipelineHealth.total_raw_data, 1)) * 100)
      : 0,
    pendingRequests: pipelineHealth?.unprocessed_raw_data ?? 0,
    aiGeneratedBundles: activeBundlesCount,
  };

  const recentActivity: Array<{ id: number; action: string; details: string; timestamp: string; type: string }> = [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "organization":
        return <Building2 className="h-4 w-4 text-blue-600" />;
      case "ai":
        return <Brain className="h-4 w-4 text-purple-600" />;
      case "security":
        return <Shield className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleEngageDataProcessing = async () => {
    try {
      toast.loading("Engaging IDIA Synapse Engine...", { id: "engage-processing" });
      // Mock – awaiting AWS Lambda
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success("Synapse Engine engaged successfully (mock)", { id: "engage-processing" });
    } catch (error) {
      console.error("Error engaging data processing:", error);
      toast.error("Failed to engage Synapse Engine", { id: "engage-processing" });
    }
  };

  if (activeTab === "system-health") return <SystemHealthDashboard />;
  if (activeTab === "organizations") return <OrganizationManagement />;
  if (activeTab === "ai-management") return <AIManagement />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform oversight and system management</p>
      </div>

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
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health-data">Data</TabsTrigger>
          <TabsTrigger value="system-health">System Health</TabsTrigger>
          <TabsTrigger value="organizations">Organizations</TabsTrigger>
          <TabsTrigger value="ai-management">AI Management</TabsTrigger>
        </TabsList>

        <TabsContent value="health-data" className="space-y-6">
          <HealthDataDashboard />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewStats.totalOrganizations}</div>
                <p className="text-xs text-muted-foreground">Awaiting live data</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Records</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{overviewStats.activeUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total raw data records</p>
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
                  <Button size="sm" onClick={() => setActiveTab("organizations")}>
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
                  <Button size="sm" onClick={() => setActiveTab("ai-management")}>
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
                <div className="text-center py-4 text-gray-500">
                  {recentActivity.length === 0 ? (
                    <p>Activity feed awaiting live platform events</p>
                  ) : (
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
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Status Overview</CardTitle>
              <CardDescription>System services awaiting live monitoring data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <p>System monitoring awaiting live pipeline data</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDashboard;
