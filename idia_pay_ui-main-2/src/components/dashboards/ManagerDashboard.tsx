import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Store, Users, DollarSign, ShoppingCart, Package, Clock,
  TrendingUp, AlertTriangle, CheckCircle
} from "lucide-react";
import { POSModule } from "../modules/POSModule";
import { LocalInventory } from "../modules/LocalInventory";
import { TimesheetModule } from "../modules/TimesheetModule";
import { LocalReports } from "../modules/LocalReports";
import { useTodayStats } from "@/hooks/use-enterprise-reports";

interface ManagerDashboardProps {
  businessHealthIndex: number;
}

export const ManagerDashboard = ({ businessHealthIndex }: ManagerDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const { stats: liveStats } = useTodayStats();

  return (
    <div className="min-h-[100dvh] flex flex-col p-2">
      <div className="mb-2 flex-shrink-0">
        <h2 className="text-base sm:text-lg font-bold text-foreground">Location Overview</h2>
        <p className="text-xs text-muted-foreground">Management</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="w-full overflow-x-auto scrollbar-hide flex-shrink-0">
          <TabsList className="inline-flex w-max min-w-full">
            <TabsTrigger value="overview" className="text-xs px-2">Overview</TabsTrigger>
            <TabsTrigger value="pos" className="text-xs px-2">POS</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs px-2">Inventory</TabsTrigger>
            <TabsTrigger value="timesheets" className="text-xs px-2">Timesheets</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs px-2">Reports</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="flex-1 overflow-y-auto p-2">
          {/* Location Performance */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Daily Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${liveStats.dailyRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{liveStats.dailyTransactions}</div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Ticket</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${liveStats.avgTicketSize.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Staff on Duty</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{liveStats.staffOnDuty}/{liveStats.totalStaff}</div>
                <p className="text-xs text-muted-foreground">Active / Total</p>
              </CardContent>
            </Card>
          </div>

          {/* Management Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader>
                <CardTitle>Alerts</CardTitle>
                <CardDescription>
                  {liveStats.inventoryAlerts} inventory alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Morning inventory count</p>
                    <p className="text-xs text-muted-foreground">Completed at 8:30 AM</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Staff schedule review</p>
                    <p className="text-xs text-muted-foreground">Due by 2:00 PM</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Weekly sales report</p>
                    <p className="text-xs text-muted-foreground">Due tomorrow</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Inventory Alerts</CardTitle>
                <CardDescription>
                  Items requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm font-medium">Low Stock Alert</p>
                  <p className="text-xs text-muted-foreground">
                    Premium Coffee Beans - 12 units remaining
                  </p>
                </div>
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium">Critical Stock</p>
                  <p className="text-xs text-muted-foreground">
                    Sandwich Wraps - 3 units remaining
                  </p>
                </div>
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm font-medium">Expiring Soon</p>
                  <p className="text-xs text-muted-foreground">
                    Fresh Dairy Products - Expires in 2 days
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common management functions for daily operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex flex-col">
                  <Clock className="w-6 h-6 mb-2" />
                  <span className="text-sm">Approve Timesheets</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Package className="w-6 h-6 mb-2" />
                  <span className="text-sm">Order Inventory</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <Users className="w-6 h-6 mb-2" />
                  <span className="text-sm">Schedule Staff</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col">
                  <TrendingUp className="w-6 h-6 mb-2" />
                  <span className="text-sm">View Analytics</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pos" className="flex-1 min-h-0 overflow-hidden m-0">
          <POSModule />
        </TabsContent>

        <TabsContent value="inventory">
          <LocalInventory />
        </TabsContent>

        <TabsContent value="timesheets">
          <TimesheetModule />
        </TabsContent>

        <TabsContent value="reports">
          <LocalReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};