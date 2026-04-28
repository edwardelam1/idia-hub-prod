import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOverviewStats } from "@/hooks/use-enterprise-reports";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, Store, Users, DollarSign, ShoppingCart, 
  Package, FileText, BarChart3, Settings, Globe, Shield,
  CreditCard, Truck, Utensils, Calculator, Box, UserCheck,
  QrCode, ShieldAlert, Link, Smartphone, Landmark, Database
} from "lucide-react";
import { TeamManagement } from "../modules/TeamManagement";
import { MenuManagement } from "../modules/MenuManagement";
import { InventoryManagement } from "../modules/InventoryManagement";
import { ReportsModule } from "../modules/ReportsModule";
import { TaxCenter } from "../modules/TaxCenter";
import { POSModule } from "../modules/POSModule";
import { RecipeManagement } from "../modules/RecipeManagement";
import { XRManagement } from "../modules/XRManagement";
import { AffiliateManagement } from "../modules/AffiliateManagement";
import { GlobalMenuUpdateModal } from "../modals/GlobalMenuUpdateModal";
import { InventoryTransferModal } from "../modals/InventoryTransferModal";
import { ProcessPayrollModal } from "../modals/ProcessPayrollModal";
import { DataCoopSettingsModal } from "../modals/DataCoopSettingsModal";
import { BusinessProfileModal } from "../modals/settings/BusinessProfileModal";
import { LocationSettingsModal } from "../modals/settings/LocationSettingsModal";
import { PaymentConfigModal } from "../modals/settings/PaymentConfigModal";
import { ApiKeysModal } from "../modals/settings/ApiKeysModal";
import { IntegrationsModal } from "../modals/settings/IntegrationsModal";
import { SystemPreferencesModal } from "../modals/settings/SystemPreferencesModal";
import { HubConfigModal } from "../modals/HubConfigModal";
import { ProvisioningModal } from "../modals/ProvisioningModal";
import { MinorSafeguardsModal } from "../modals/MinorSafeguardsModal";
import { EmbeddableCheckoutModal } from "../modals/EmbeddableCheckoutModal";
import { BankSettingsModal } from "../modals/settings/BankSettingsModal";

interface OwnerDashboardProps {
  businessHealthIndex: number;
}

export const OwnerDashboard = ({ businessHealthIndex }: OwnerDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [globalMenuModalOpen, setGlobalMenuModalOpen] = useState(false);
  const [inventoryTransferModalOpen, setInventoryTransferModalOpen] = useState(false);
  const [payrollModalOpen, setPayrollModalOpen] = useState(false);
  const [dataCoopModalOpen, setDataCoopModalOpen] = useState(false);
  
  // Settings modals
  const [businessProfileModalOpen, setBusinessProfileModalOpen] = useState(false);
  const [locationSettingsModalOpen, setLocationSettingsModalOpen] = useState(false);
  const [paymentConfigModalOpen, setPaymentConfigModalOpen] = useState(false);
  const [apiKeysModalOpen, setApiKeysModalOpen] = useState(false);
  const [integrationsModalOpen, setIntegrationsModalOpen] = useState(false);
  const [systemPreferencesModalOpen, setSystemPreferencesModalOpen] = useState(false);
  
  // New MVP modals
  const [hubConfigModalOpen, setHubConfigModalOpen] = useState(false);
  const [provisioningModalOpen, setProvisioningModalOpen] = useState(false);
  const [minorSafeguardsModalOpen, setMinorSafeguardsModalOpen] = useState(false);
  const [embeddableCheckoutModalOpen, setEmbeddableCheckoutModalOpen] = useState(false);
  const [bankSettingsModalOpen, setBankSettingsModalOpen] = useState(false);

  const { stats } = useOverviewStats();

  useEffect(() => {
    const handler = () => setActiveTab("settings");
    window.addEventListener('navigate-to-settings', handler);
    return () => window.removeEventListener('navigate-to-settings', handler);
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-auto">
      {/* Compact Header - Fixed Height */}
      <div className="flex-shrink-0 px-4 py-2 border-b">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex w-full overflow-x-auto lg:w-auto lg:inline-flex gap-1 h-8">
            <TabsTrigger value="overview" className="text-xs flex-shrink-0">Overview</TabsTrigger>
            <TabsTrigger value="pos" className="text-xs flex-shrink-0">POS</TabsTrigger>
            <TabsTrigger value="team" className="text-xs flex-shrink-0">Team</TabsTrigger>
            <TabsTrigger value="menu" className="text-xs flex-shrink-0">Menu</TabsTrigger>
            <TabsTrigger value="recipes" className="text-xs flex-shrink-0">Recipes</TabsTrigger>
            <TabsTrigger value="inventory" className="text-xs flex-shrink-0">Inventory</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs flex-shrink-0">Reports</TabsTrigger>
            <TabsTrigger value="xr" className="text-xs flex-shrink-0">XR</TabsTrigger>
            <TabsTrigger value="affiliates" className="text-xs flex-shrink-0">Affiliates</TabsTrigger>
            <TabsTrigger value="tax" className="text-xs flex-shrink-0">Tax</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs flex-shrink-0">Settings</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="overview" className="h-full overflow-auto m-0">
            <div className="h-full p-3 flex flex-col lg:flex-row">
              {/* Left Column - Main Content (65%) */}
              <div className="flex-1 lg:pr-3 flex flex-col space-y-3 overflow-hidden">
                {/* BHI Header */}
                <Card className="bg-gradient-hero text-white flex-shrink-0">
                  <CardHeader className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Business Health Index™</CardTitle>
                        <CardDescription className="text-white/80 text-xs">
                          Comprehensive performance metric
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {(businessHealthIndex * 100).toFixed(1)}%
                        </div>
                        <p className="text-xs text-white/80">Excellent</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* 2x2 Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">Revenue</p>
                        <p className="text-lg font-bold">${stats.totalRevenue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">+12.5%</p>
                      </div>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">Locations</p>
                        <p className="text-lg font-bold">{stats.totalLocations}</p>
                        <p className="text-xs text-muted-foreground">All active</p>
                      </div>
                      <Store className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">Team</p>
                        <p className="text-lg font-bold">{stats.totalEmployees}</p>
                        <p className="text-xs text-muted-foreground">+3 new</p>
                      </div>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">Avg Ticket</p>
                        <p className="text-lg font-bold">${stats.avgTicketSize}</p>
                        <p className="text-xs text-muted-foreground">+8.2%</p>
                      </div>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Card>
                </div>

                {/* Activity Feed - Expanded */}
                <Card className="flex-1 min-h-0 overflow-hidden">
                  <CardHeader className="p-3 flex-shrink-0">
                    <CardTitle className="text-sm">Recent Activity & Alerts</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-3 h-full overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto space-y-2">
                      <div className="p-2 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-xs font-medium">Pending Invoice Review</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.pendingInvoices} invoices require approval
                        </p>
                      </div>
                      <div className="p-2 bg-warning/10 border border-warning/20 rounded-lg">
                        <p className="text-xs font-medium">Pending Invoice Review</p>
                        <p className="text-xs text-muted-foreground">
                          {stats.pendingInvoices} invoices require approval
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-success rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">New employee onboarded at Downtown Location</p>
                          <p className="text-xs text-muted-foreground">2 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-warning rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">Inventory alert: Low stock on Premium Coffee</p>
                          <p className="text-xs text-muted-foreground">4 hours ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">Sales report generated for last week</p>
                          <p className="text-xs text-muted-foreground">1 day ago</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-success rounded-full flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">Menu update successfully deployed to all locations</p>
                          <p className="text-xs text-muted-foreground">2 days ago</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Quick Actions (35%) */}
              <div className="lg:w-80 lg:flex-shrink-0 mt-3 lg:mt-0">
                <Card className="h-full">
                  <CardHeader className="p-3">
                    <CardTitle className="text-sm">Quick Actions</CardTitle>
                    <CardDescription className="text-xs">
                      Corporate management tools & settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 px-3 pb-3 h-full overflow-hidden flex flex-col">
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        className="h-14 flex flex-col text-center"
                        onClick={() => setHubConfigModalOpen(true)}
                      >
                        <Smartphone className="w-4 h-4 mb-1" />
                        <span className="text-[10px]">Hub Config</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-14 flex flex-col text-center"
                        onClick={() => setProvisioningModalOpen(true)}
                      >
                        <QrCode className="w-4 h-4 mb-1" />
                        <span className="text-[10px]">Provisioning</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-14 flex flex-col text-center"
                        onClick={() => setMinorSafeguardsModalOpen(true)}
                      >
                        <ShieldAlert className="w-4 h-4 mb-1" />
                        <span className="text-[10px]">Minor Safeguards</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-14 flex flex-col text-center"
                        onClick={() => setEmbeddableCheckoutModalOpen(true)}
                      >
                        <Link className="w-4 h-4 mb-1" />
                        <span className="text-[10px]">Web Checkout</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-14 flex flex-col text-center"
                        onClick={() => setGlobalMenuModalOpen(true)}
                      >
                        <Globe className="w-4 h-4 mb-1" />
                        <span className="text-[10px]">Global Menu</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-14 flex flex-col text-center"
                        onClick={() => setInventoryTransferModalOpen(true)}
                      >
                        <Truck className="w-4 h-4 mb-1" />
                        <span className="text-[10px]">Transfers</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-14 flex flex-col text-center"
                        onClick={() => setPayrollModalOpen(true)}
                      >
                        <CreditCard className="w-4 h-4 mb-1" />
                        <span className="text-[10px]">Payroll</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-14 flex flex-col text-center"
                        onClick={() => setDataCoopModalOpen(true)}
                      >
                        <Shield className="w-4 h-4 mb-1" />
                        <span className="text-[10px]">Data Co-op</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pos" className="flex-1 min-h-0 overflow-hidden m-0 p-0">
            <POSModule />
          </TabsContent>

          <TabsContent value="team" className="h-full m-0">
            <TeamManagement />
          </TabsContent>

          <TabsContent value="menu" className="h-full m-0">
            <MenuManagement />
          </TabsContent>

          <TabsContent value="inventory" className="h-full m-0">
            <InventoryManagement />
          </TabsContent>

          <TabsContent value="reports" className="h-full m-0">
            <ReportsModule />
          </TabsContent>

          <TabsContent value="xr" className="h-full m-0">
            <XRManagement />
          </TabsContent>

          <TabsContent value="affiliates" className="h-full m-0">
            <AffiliateManagement />
          </TabsContent>

          <TabsContent value="tax" className="h-full m-0">
            <TaxCenter />
          </TabsContent>

          <TabsContent value="recipes" className="h-full m-0">
            <RecipeManagement />
          </TabsContent>

          <TabsContent value="settings" className="h-full m-0">
            <div className="h-full p-3 overflow-y-auto">
              <Card className="h-full">
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">System Settings</CardTitle>
                  <CardDescription className="text-xs">
                    Configure global system preferences and integrations
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Business Configuration</h3>
                      <div className="space-y-1">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => setBusinessProfileModalOpen(true)}
                        >
                          <Store className="w-3 h-3 mr-2" />
                          Manage Business Profile
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => setLocationSettingsModalOpen(true)}
                        >
                          <Globe className="w-3 h-3 mr-2" />
                          Location Settings
                        </Button>
                         <Button 
                          variant="outline" 
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => setPaymentConfigModalOpen(true)}
                        >
                          <CreditCard className="w-3 h-3 mr-2" />
                          Payment Configuration
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => setBankSettingsModalOpen(true)}
                        >
                          <Landmark className="w-3 h-3 mr-2" />
                          Bank Information
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => setDataCoopModalOpen(true)}
                        >
                          <Database className="w-3 h-3 mr-2" />
                          Data Co-op Settings
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">Integration & API</h3>
                      <div className="space-y-1">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => setApiKeysModalOpen(true)}
                        >
                          <Shield className="w-3 h-3 mr-2" />
                          API Keys & Security
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => setIntegrationsModalOpen(true)}
                        >
                          <Package className="w-3 h-3 mr-2" />
                          Third-party Integrations
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full justify-start h-8 text-xs"
                          onClick={() => setSystemPreferencesModalOpen(true)}
                        >
                          <Settings className="w-3 h-3 mr-2" />
                          System Preferences
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <GlobalMenuUpdateModal 
        isOpen={globalMenuModalOpen} 
        onClose={() => setGlobalMenuModalOpen(false)} 
      />
      <InventoryTransferModal 
        isOpen={inventoryTransferModalOpen} 
        onClose={() => setInventoryTransferModalOpen(false)} 
      />
      <ProcessPayrollModal 
        isOpen={payrollModalOpen} 
        onClose={() => setPayrollModalOpen(false)} 
      />
      <DataCoopSettingsModal 
        isOpen={dataCoopModalOpen} 
        onClose={() => setDataCoopModalOpen(false)} 
      />
      
      {/* Settings Modals */}
      <BusinessProfileModal 
        isOpen={businessProfileModalOpen} 
        onClose={() => setBusinessProfileModalOpen(false)} 
      />
      <LocationSettingsModal 
        isOpen={locationSettingsModalOpen} 
        onClose={() => setLocationSettingsModalOpen(false)} 
      />
      <PaymentConfigModal 
        isOpen={paymentConfigModalOpen} 
        onClose={() => setPaymentConfigModalOpen(false)} 
      />
      <ApiKeysModal 
        isOpen={apiKeysModalOpen} 
        onClose={() => setApiKeysModalOpen(false)} 
      />
      <IntegrationsModal 
        isOpen={integrationsModalOpen} 
        onClose={() => setIntegrationsModalOpen(false)} 
      />
      <SystemPreferencesModal 
        isOpen={systemPreferencesModalOpen} 
        onClose={() => setSystemPreferencesModalOpen(false)} 
      />
      
      {/* New MVP Modals */}
      <HubConfigModal 
        isOpen={hubConfigModalOpen} 
        onClose={() => setHubConfigModalOpen(false)} 
      />
      <ProvisioningModal 
        isOpen={provisioningModalOpen} 
        onClose={() => setProvisioningModalOpen(false)} 
      />
      <MinorSafeguardsModal 
        isOpen={minorSafeguardsModalOpen} 
        onClose={() => setMinorSafeguardsModalOpen(false)} 
      />
      <EmbeddableCheckoutModal 
        isOpen={embeddableCheckoutModalOpen} 
        onClose={() => setEmbeddableCheckoutModalOpen(false)} 
      />
      <BankSettingsModal
        isOpen={bankSettingsModalOpen}
        onClose={() => setBankSettingsModalOpen(false)}
      />
    </div>
  );
};
