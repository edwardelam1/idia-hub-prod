import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Package, Truck, Clock, CheckCircle, AlertTriangle, 
  BarChart3, MapPin, Scan, List, ShoppingCart, Database, Layers, 
  GitBranch, Hash, Fingerprint, Barcode, Radio, Activity, 
  Grid3X3, Link2, Calendar, Wifi, Timer, BookOpen, 
  ChevronDown, Mic, Box, Route
} from "lucide-react";
import { ReceivingModule } from "../modules/warehouse/ReceivingModule";
import { PickingModule } from "../modules/warehouse/PickingModule";
import { PutAwayModule } from "../modules/warehouse/PutAwayModule";
import { ShippingModule } from "../modules/warehouse/ShippingModule";
import { CountingModule } from "../modules/warehouse/CountingModule";
import { CommunicationsModule } from "../modules/warehouse/CommunicationsModule";
import { TruckingModule } from "../modules/warehouse/TruckingModule";

interface WarehouseDashboardProps {
  businessHealthIndex: number;
}

export const WarehouseDashboard = ({ businessHealthIndex }: WarehouseDashboardProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  const warehouseStats = {
    associateName: "Mike Thompson",
    warehouse: "Central Distribution Center",
    todayReceived: 234,
    todayPicked: 187,
    todayShipped: 156,
    pendingTasks: 12,
    activeOrders: 23,
    completionRate: 94
  };

  // WMS System Status Indicators
  const wmsStatus = {
    hybridDb: { sql: 'Online', nosql: 'Online', sync: '99.9%' },
    sharding: { nodes: 4, distribution: 'Balanced', hotspots: 0 },
    concurrency: { occVersion: 'v2.4', mvccEnabled: true, conflicts: 0 },
    gs1: { gtinActive: true, glnActive: true, ssccActive: true },
    cdc: { streaming: true, latency: '12ms', events: 1247 },
    iot: { sensors: 48, fusionActive: true, noise: 'Low' },
    fefo: { enabled: true, expiringSoon: 3 },
    slotting: { abcActive: true, affinityActive: true, lastReSlot: '2 days' },
    pathing: { optimized: true, savings: '23%' },
    binPacking: { algorithm: 'Best-Fit', efficiency: '94%' },
    vdp: { enabled: true, accuracy: '98.5%' }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-auto">
      {/* Compact Header */}
      <div className="flex-shrink-0 px-2 py-1 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Welcome, {warehouseStats.associateName}</h2>
            <p className="text-[10px] text-muted-foreground">{warehouseStats.warehouse} • Warehouse Associate</p>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              <Database className="h-2.5 w-2.5 mr-0.5" />SQL+NoSQL
            </Badge>
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              <Wifi className="h-2.5 w-2.5 mr-0.5" />IoT
            </Badge>
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              <Mic className="h-2.5 w-2.5 mr-0.5" />VDP
            </Badge>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-auto">
        <div className="flex-shrink-0 px-2 py-1 border-b">
          <TabsList className="flex w-full overflow-x-auto lg:w-auto lg:inline-flex gap-0.5 h-7">
            <TabsTrigger value="overview" className="text-[10px] h-6 px-2">Overview</TabsTrigger>
            <TabsTrigger value="receiving" className="text-[10px] h-6 px-2">Receiving</TabsTrigger>
            <TabsTrigger value="picking" className="text-[10px] h-6 px-2">Picking</TabsTrigger>
            <TabsTrigger value="putaway" className="text-[10px] h-6 px-2">Put-away</TabsTrigger>
            <TabsTrigger value="shipping" className="text-[10px] h-6 px-2">Shipping</TabsTrigger>
            <TabsTrigger value="counting" className="text-[10px] h-6 px-2">Counting</TabsTrigger>
            <TabsTrigger value="trucking" className="text-[10px] h-6 px-2">Trucking</TabsTrigger>
            <TabsTrigger value="comms" className="text-[10px] h-6 px-2">Comms</TabsTrigger>
            <TabsTrigger value="systems" className="text-[10px] h-6 px-2">WMS Systems</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="flex-1 overflow-auto m-0">
          <div className="h-full p-2 overflow-y-auto space-y-2">
            {/* Warehouse Performance */}
            <div className="grid grid-cols-4 gap-1">
              <Card className="p-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-medium">Received</p>
                    <div className="text-sm font-bold">{warehouseStats.todayReceived}</div>
                  </div>
                  <Truck className="h-3 w-3 text-muted-foreground" />
                </div>
              </Card>
              <Card className="p-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-medium">Picked</p>
                    <div className="text-sm font-bold">{warehouseStats.todayPicked}</div>
                  </div>
                  <Package className="h-3 w-3 text-muted-foreground" />
                </div>
              </Card>
              <Card className="p-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-medium">Shipped</p>
                    <div className="text-sm font-bold">{warehouseStats.todayShipped}</div>
                  </div>
                  <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                </div>
              </Card>
              <Card className="p-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-medium">Rate</p>
                    <div className="text-sm font-bold">{warehouseStats.completionRate}%</div>
                  </div>
                  <BarChart3 className="h-3 w-3 text-muted-foreground" />
                </div>
              </Card>
            </div>

            {/* WMS Quick Status */}
            <div className="grid grid-cols-6 gap-1">
              <Card className="p-1">
                <div className="text-center">
                  <Timer className="h-3 w-3 mx-auto text-green-500" />
                  <p className="text-[8px] font-medium mt-0.5">FEFO</p>
                  <p className="text-[8px] text-green-600">Active</p>
                </div>
              </Card>
              <Card className="p-1">
                <div className="text-center">
                  <Grid3X3 className="h-3 w-3 mx-auto text-blue-500" />
                  <p className="text-[8px] font-medium mt-0.5">ABC</p>
                  <p className="text-[8px] text-blue-600">Optimized</p>
                </div>
              </Card>
              <Card className="p-1">
                <div className="text-center">
                  <Route className="h-3 w-3 mx-auto text-purple-500" />
                  <p className="text-[8px] font-medium mt-0.5">Pathing</p>
                  <p className="text-[8px] text-purple-600">-{wmsStatus.pathing.savings}</p>
                </div>
              </Card>
              <Card className="p-1">
                <div className="text-center">
                  <Box className="h-3 w-3 mx-auto text-orange-500" />
                  <p className="text-[8px] font-medium mt-0.5">Bin-Pack</p>
                  <p className="text-[8px] text-orange-600">{wmsStatus.binPacking.efficiency}</p>
                </div>
              </Card>
              <Card className="p-1">
                <div className="text-center">
                  <Mic className="h-3 w-3 mx-auto text-cyan-500" />
                  <p className="text-[8px] font-medium mt-0.5">VDP</p>
                  <p className="text-[8px] text-cyan-600">{wmsStatus.vdp.accuracy}</p>
                </div>
              </Card>
              <Card className="p-1">
                <div className="text-center">
                  <Activity className="h-3 w-3 mx-auto text-emerald-500" />
                  <p className="text-[8px] font-medium mt-0.5">CDC</p>
                  <p className="text-[8px] text-emerald-600">{wmsStatus.cdc.latency}</p>
                </div>
              </Card>
            </div>

            {/* Active Tasks & Alerts */}
            <div className="grid md:grid-cols-2 gap-2">
              <Card>
                <CardHeader className="p-1.5 pb-1">
                  <CardTitle className="text-xs">Active Tasks</CardTitle>
                </CardHeader>
                <CardContent className="p-1.5 pt-0 space-y-1">
                  <div className="flex items-center space-x-1.5 p-1 bg-muted/50 rounded">
                    <Clock className="w-3 h-3 text-warning flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">Receive PO #12345</p>
                      <p className="text-[9px] text-muted-foreground">Due 2:00 PM</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5">View</Button>
                  </div>
                  <div className="flex items-center space-x-1.5 p-1 bg-muted/50 rounded">
                    <Package className="w-3 h-3 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">Pick Order #ORD-789</p>
                      <p className="text-[9px] text-muted-foreground">15 items</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5">Pick</Button>
                  </div>
                  <div className="flex items-center space-x-1.5 p-1 bg-muted/50 rounded">
                    <CheckCircle className="w-3 h-3 text-success flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">Put-away #PUT-456</p>
                      <p className="text-[9px] text-muted-foreground">Zone A-1</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5">Go</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-1.5 pb-1">
                  <CardTitle className="text-xs">Priority Alerts</CardTitle>
                </CardHeader>
                <CardContent className="p-1.5 pt-0 space-y-1">
                  <div className="p-1 bg-warning/10 border border-warning/20 rounded">
                    <p className="text-[10px] font-medium flex items-center gap-1">
                      <Timer className="h-3 w-3" />FEFO Alert
                    </p>
                    <p className="text-[9px] text-muted-foreground">3 items expiring in 48hrs</p>
                  </div>
                  <div className="p-1 bg-destructive/10 border border-destructive/20 rounded">
                    <p className="text-[10px] font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />Cycle Count Overdue
                    </p>
                    <p className="text-[9px] text-muted-foreground">Zone B-2 count by 2 hrs</p>
                  </div>
                  <div className="p-1 bg-primary/10 border border-primary/20 rounded">
                    <p className="text-[10px] font-medium flex items-center gap-1">
                      <Truck className="h-3 w-3" />New Inventory
                    </p>
                    <p className="text-[9px] text-muted-foreground">Truck #T-789 at dock</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="p-1.5 pb-1">
                <CardTitle className="text-xs">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-1.5 pt-0">
                <div className="grid grid-cols-4 md:grid-cols-8 gap-1">
                  <Button 
                    variant="outline" 
                    className="h-10 flex flex-col text-[9px] p-1"
                    onClick={() => { setActiveTab('receiving'); toast.info('Scan mode ready - navigate to Receiving'); }}
                  >
                    <Scan className="w-3 h-3 mb-0.5" />
                    <span>Scan</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-10 flex flex-col text-[9px] p-1"
                    onClick={() => toast.info('Voice Directed Picking activated - 98.5% accuracy')}
                  >
                    <Mic className="w-3 h-3 mb-0.5" />
                    <span>Voice</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-10 flex flex-col text-[9px] p-1"
                    onClick={() => setActiveTab('picking')}
                  >
                    <List className="w-3 h-3 mb-0.5" />
                    <span>Picks</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-10 flex flex-col text-[9px] p-1"
                    onClick={() => toast.info('Item locator ready - Scan or enter SKU')}
                  >
                    <MapPin className="w-3 h-3 mb-0.5" />
                    <span>Locate</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-10 flex flex-col text-[9px] p-1"
                    onClick={() => { setActiveTab('receiving'); toast.info('GS1 barcode scanner ready'); }}
                  >
                    <Barcode className="w-3 h-3 mb-0.5" />
                    <span>GS1</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-10 flex flex-col text-[9px] p-1"
                    onClick={() => toast.success('Path optimization running - 23% travel reduction applied')}
                  >
                    <Route className="w-3 h-3 mb-0.5" />
                    <span>Optimize</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-10 flex flex-col text-[9px] p-1"
                    onClick={() => toast.info('Dynamic re-slotting initiated based on ABC analysis')}
                  >
                    <Grid3X3 className="w-3 h-3 mb-0.5" />
                    <span>Re-Slot</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-10 flex flex-col text-[9px] p-1"
                    onClick={() => { setActiveTab('comms'); toast.warning('Report issue - select category'); }}
                  >
                    <Clock className="w-3 h-3 mb-0.5" />
                    <span>Issue</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* WMS Systems Tab - UI Only */}
        <TabsContent value="systems" className="flex-1 overflow-auto m-0">
          <div className="h-full p-2 overflow-y-auto space-y-2">
            {/* Data Architecture */}
            <Collapsible open={expandedSections.includes('data')} onOpenChange={() => toggleSection('data')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="p-1.5 cursor-pointer hover:bg-muted/50">
                    <CardTitle className="text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1"><Database className="h-3 w-3" />Data Architecture</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.includes('data') ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-1.5 pt-0 grid grid-cols-3 gap-1.5">
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Database className="h-3 w-3 text-blue-500" />
                        <span className="text-[9px] font-medium">Hybrid Persistence</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>SQL (ACID)</span><Badge variant="outline" className="h-3 text-[7px]">Online</Badge></div>
                        <div className="flex justify-between"><span>NoSQL (Metadata)</span><Badge variant="outline" className="h-3 text-[7px]">Online</Badge></div>
                        <div className="flex justify-between"><span>IoT Telemetry</span><Badge variant="outline" className="h-3 text-[7px]">Streaming</Badge></div>
                      </div>
                    </div>
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Layers className="h-3 w-3 text-green-500" />
                        <span className="text-[9px] font-medium">Packaging Hierarchy</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Each</span><Badge variant="outline" className="h-3 text-[7px]">Linked</Badge></div>
                        <div className="flex justify-between"><span>Case</span><Badge variant="outline" className="h-3 text-[7px]">Linked</Badge></div>
                        <div className="flex justify-between"><span>Pallet</span><Badge variant="outline" className="h-3 text-[7px]">Linked</Badge></div>
                      </div>
                    </div>
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <GitBranch className="h-3 w-3 text-purple-500" />
                        <span className="text-[9px] font-medium">Sharding Strategy</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Nodes</span><span className="font-medium">4</span></div>
                        <div className="flex justify-between"><span>Distribution</span><span className="font-medium">Balanced</span></div>
                        <div className="flex justify-between"><span>Hotspots</span><span className="text-green-600">0</span></div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Scalability */}
            <Collapsible open={expandedSections.includes('scale')} onOpenChange={() => toggleSection('scale')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="p-1.5 cursor-pointer hover:bg-muted/50">
                    <CardTitle className="text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1"><Hash className="h-3 w-3" />Scalability & Partitioning</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.includes('scale') ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-1.5 pt-0 grid grid-cols-2 gap-1.5">
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="h-3 w-3 text-orange-500" />
                        <span className="text-[9px] font-medium">Range Partitioning</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Historical Data</span><Badge variant="outline" className="h-3 text-[7px]">Partitioned</Badge></div>
                        <div className="flex justify-between"><span>Archive Ready</span><Badge variant="outline" className="h-3 text-[7px]">Yes</Badge></div>
                        <div className="flex justify-between"><span>Date Ranges</span><span className="font-medium">Monthly</span></div>
                      </div>
                    </div>
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Hash className="h-3 w-3 text-cyan-500" />
                        <span className="text-[9px] font-medium">Hash Distribution</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Key Column</span><span className="font-medium">SKU</span></div>
                        <div className="flex justify-between"><span>Distribution</span><span className="font-medium">Uniform</span></div>
                        <div className="flex justify-between"><span>Hotspots</span><span className="text-green-600">None</span></div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Concurrency Control */}
            <Collapsible open={expandedSections.includes('concurrency')} onOpenChange={() => toggleSection('concurrency')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="p-1.5 cursor-pointer hover:bg-muted/50">
                    <CardTitle className="text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1"><Activity className="h-3 w-3" />Concurrency Control</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.includes('concurrency') ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-1.5 pt-0 grid grid-cols-2 gap-1.5">
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-[9px] font-medium">OCC (Optimistic)</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Version Index</span><Badge variant="outline" className="h-3 text-[7px]">Active</Badge></div>
                        <div className="flex justify-between"><span>Lost Updates</span><span className="text-green-600">0</span></div>
                        <div className="flex justify-between"><span>Conflicts Today</span><span className="font-medium">0</span></div>
                      </div>
                    </div>
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Layers className="h-3 w-3 text-blue-500" />
                        <span className="text-[9px] font-medium">MVCC</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Snapshots</span><Badge variant="outline" className="h-3 text-[7px]">Enabled</Badge></div>
                        <div className="flex justify-between"><span>Read Blocking</span><span className="text-green-600">None</span></div>
                        <div className="flex justify-between"><span>Analytics Mode</span><Badge variant="outline" className="h-3 text-[7px]">Active</Badge></div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* GS1 Identification */}
            <Collapsible open={expandedSections.includes('gs1')} onOpenChange={() => toggleSection('gs1')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="p-1.5 cursor-pointer hover:bg-muted/50">
                    <CardTitle className="text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1"><Barcode className="h-3 w-3" />GS1 Identification</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.includes('gs1') ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-1.5 pt-0 grid grid-cols-4 gap-1.5">
                    <div className="border rounded p-1.5 text-center">
                      <Fingerprint className="h-4 w-4 mx-auto text-green-500 mb-1" />
                      <p className="text-[8px] font-medium">GTIN</p>
                      <Badge variant="outline" className="h-3 text-[7px]">Active</Badge>
                    </div>
                    <div className="border rounded p-1.5 text-center">
                      <MapPin className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                      <p className="text-[8px] font-medium">GLN</p>
                      <Badge variant="outline" className="h-3 text-[7px]">Active</Badge>
                    </div>
                    <div className="border rounded p-1.5 text-center">
                      <Package className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                      <p className="text-[8px] font-medium">SSCC</p>
                      <Badge variant="outline" className="h-3 text-[7px]">Active</Badge>
                    </div>
                    <div className="border rounded p-1.5 text-center">
                      <Box className="h-4 w-4 mx-auto text-orange-500 mb-1" />
                      <p className="text-[8px] font-medium">GIAI</p>
                      <Badge variant="outline" className="h-3 text-[7px]">Active</Badge>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Event-Driven Architecture */}
            <Collapsible open={expandedSections.includes('events')} onOpenChange={() => toggleSection('events')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="p-1.5 cursor-pointer hover:bg-muted/50">
                    <CardTitle className="text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1"><Radio className="h-3 w-3" />Event-Driven Architecture</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.includes('events') ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-1.5 pt-0 grid grid-cols-3 gap-1.5">
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Link2 className="h-3 w-3 text-cyan-500" />
                        <span className="text-[9px] font-medium">ECST</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>State Transfer</span><Badge variant="outline" className="h-3 text-[7px]">Full</Badge></div>
                        <div className="flex justify-between"><span>Dependencies</span><span className="text-green-600">Reduced</span></div>
                      </div>
                    </div>
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Activity className="h-3 w-3 text-green-500" />
                        <span className="text-[9px] font-medium">CDC Sync</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Latency</span><span className="font-medium">12ms</span></div>
                        <div className="flex justify-between"><span>Events/hr</span><span className="font-medium">1,247</span></div>
                      </div>
                    </div>
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <BookOpen className="h-3 w-3 text-purple-500" />
                        <span className="text-[9px] font-medium">Event Sourcing</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Audit Log</span><Badge variant="outline" className="h-3 text-[7px]">Immutable</Badge></div>
                        <div className="flex justify-between"><span>Compliance</span><Badge variant="outline" className="h-3 text-[7px]">Ready</Badge></div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Slotting & Optimization */}
            <Collapsible open={expandedSections.includes('slotting')} onOpenChange={() => toggleSection('slotting')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="p-1.5 cursor-pointer hover:bg-muted/50">
                    <CardTitle className="text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1"><Grid3X3 className="h-3 w-3" />Slotting & Optimization</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.includes('slotting') ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-1.5 pt-0 grid grid-cols-3 gap-1.5">
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <BarChart3 className="h-3 w-3 text-blue-500" />
                        <span className="text-[9px] font-medium">ABC Analysis</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>A-Items (20%)</span><span className="text-green-600">Zone A</span></div>
                        <div className="flex justify-between"><span>B-Items (30%)</span><span className="text-blue-600">Zone B</span></div>
                        <div className="flex justify-between"><span>C-Items (50%)</span><span className="text-gray-600">Zone C</span></div>
                      </div>
                    </div>
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Link2 className="h-3 w-3 text-purple-500" />
                        <span className="text-[9px] font-medium">Product Affinity</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Co-located Pairs</span><span className="font-medium">156</span></div>
                        <div className="flex justify-between"><span>Travel Reduction</span><span className="text-green-600">18%</span></div>
                      </div>
                    </div>
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Calendar className="h-3 w-3 text-orange-500" />
                        <span className="text-[9px] font-medium">Dynamic Re-Slot</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Last Run</span><span className="font-medium">2 days</span></div>
                        <div className="flex justify-between"><span>Interval</span><span className="font-medium">Quarterly</span></div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* IoT & Operations */}
            <Collapsible open={expandedSections.includes('iot')} onOpenChange={() => toggleSection('iot')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="p-1.5 cursor-pointer hover:bg-muted/50">
                    <CardTitle className="text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1"><Wifi className="h-3 w-3" />IoT & Operations</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.includes('iot') ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-1.5 pt-0 grid grid-cols-4 gap-1.5">
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Wifi className="h-3 w-3 text-cyan-500" />
                        <span className="text-[9px] font-medium">Sensor Fusion</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Active Sensors</span><span className="font-medium">48</span></div>
                        <div className="flex justify-between"><span>Noise Filter</span><span className="text-green-600">Low</span></div>
                      </div>
                    </div>
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Timer className="h-3 w-3 text-orange-500" />
                        <span className="text-[9px] font-medium">FEFO Rotation</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Mode</span><Badge variant="outline" className="h-3 text-[7px]">Active</Badge></div>
                        <div className="flex justify-between"><span>Expiring</span><span className="text-orange-600">3</span></div>
                      </div>
                    </div>
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Mic className="h-3 w-3 text-purple-500" />
                        <span className="text-[9px] font-medium">Voice Directed</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>VDP Status</span><Badge variant="outline" className="h-3 text-[7px]">On</Badge></div>
                        <div className="flex justify-between"><span>Accuracy</span><span className="text-green-600">98.5%</span></div>
                      </div>
                    </div>
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Box className="h-3 w-3 text-green-500" />
                        <span className="text-[9px] font-medium">Bin-Packing</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Algorithm</span><span className="font-medium">Best-Fit</span></div>
                        <div className="flex justify-between"><span>Efficiency</span><span className="text-green-600">94%</span></div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* UI/UX Features */}
            <Collapsible open={expandedSections.includes('ui')} onOpenChange={() => toggleSection('ui')}>
              <Card>
                <CollapsibleTrigger asChild>
                  <CardHeader className="p-1.5 cursor-pointer hover:bg-muted/50">
                    <CardTitle className="text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />UI/UX Features</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${expandedSections.includes('ui') ? 'rotate-180' : ''}`} />
                    </CardTitle>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-1.5 pt-0 grid grid-cols-2 gap-1.5">
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <ChevronDown className="h-3 w-3 text-blue-500" />
                        <span className="text-[9px] font-medium">Progressive Disclosure</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Collapsible Sections</span><Badge variant="outline" className="h-3 text-[7px]">Active</Badge></div>
                        <div className="flex justify-between"><span>Scroll Reduction</span><span className="text-green-600">75%</span></div>
                        <div className="flex justify-between"><span>Task-Relevant Info</span><Badge variant="outline" className="h-3 text-[7px]">Focused</Badge></div>
                      </div>
                    </div>
                    <div className="border rounded p-1.5">
                      <div className="flex items-center gap-1 mb-1">
                        <Route className="h-3 w-3 text-green-500" />
                        <span className="text-[9px] font-medium">Pathing Optimization</span>
                      </div>
                      <div className="text-[8px] space-y-0.5">
                        <div className="flex justify-between"><span>Engine</span><Badge variant="outline" className="h-3 text-[7px]">Active</Badge></div>
                        <div className="flex justify-between"><span>Walk Distance</span><span className="text-green-600">-23%</span></div>
                        <div className="flex justify-between"><span>Pick Speed</span><span className="text-green-600">+35%</span></div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </div>
        </TabsContent>

        <TabsContent value="receiving" className="flex-1 overflow-auto m-0">
          <div className="h-full p-2">
            <ReceivingModule />
          </div>
        </TabsContent>

        <TabsContent value="picking" className="flex-1 overflow-auto m-0">
          <div className="h-full p-2">
            <PickingModule />
          </div>
        </TabsContent>

        <TabsContent value="putaway" className="flex-1 overflow-auto m-0">
          <div className="h-full p-2">
            <PutAwayModule />
          </div>
        </TabsContent>

        <TabsContent value="shipping" className="flex-1 overflow-auto m-0">
          <div className="h-full p-2">
            <ShippingModule />
          </div>
        </TabsContent>

        <TabsContent value="counting" className="flex-1 overflow-auto m-0">
          <div className="h-full p-2">
            <CountingModule />
          </div>
        </TabsContent>

        <TabsContent value="trucking" className="flex-1 overflow-auto m-0">
          <div className="h-full p-2">
            <TruckingModule />
          </div>
        </TabsContent>

        <TabsContent value="comms" className="flex-1 overflow-auto m-0">
          <div className="h-full p-2">
            <CommunicationsModule />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
