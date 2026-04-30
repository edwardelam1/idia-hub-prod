import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Truck, MapPin, Clock, Package, Fuel, Thermometer, 
  CheckCircle, AlertTriangle, Navigation, Calendar,
  Phone, User, Route, Timer, Weight, Box, 
  ArrowRight, RefreshCw, Radio, Gauge
} from "lucide-react";
import { toast } from "sonner";

interface TruckUnit {
  id: string;
  truckNumber: string;
  driver: {
    name: string;
    phone: string;
    hoursRemaining: number;
  };
  status: 'in_transit' | 'at_dock' | 'loading' | 'unloading' | 'idle' | 'maintenance';
  currentLocation: string;
  destination: string;
  eta: string;
  fuelLevel: number;
  temperature?: number;
  cargo: {
    weight: number;
    capacity: number;
    pallets: number;
    palletCapacity: number;
  };
  relatedShipments: string[];
  dockAssignment?: string;
  lastUpdate: string;
}

interface DockDoor {
  id: string;
  doorNumber: string;
  status: 'available' | 'occupied' | 'scheduled' | 'maintenance';
  assignedTruck?: string;
  scheduledTime?: string;
  operation: 'inbound' | 'outbound' | 'none';
}

const mockTrucks: TruckUnit[] = [
  {
    id: 'truck-001',
    truckNumber: 'T-789',
    driver: { name: 'Mike Rodriguez', phone: '+1 (555) 123-4567', hoursRemaining: 6.5 },
    status: 'in_transit',
    currentLocation: 'Highway 101, Mile 45',
    destination: 'Central Distribution Center',
    eta: new Date(Date.now() + 2700000).toISOString(),
    fuelLevel: 72,
    temperature: 34,
    cargo: { weight: 18500, capacity: 24000, pallets: 22, palletCapacity: 26 },
    relatedShipments: ['PO-2026-0142'],
    lastUpdate: new Date(Date.now() - 300000).toISOString()
  },
  {
    id: 'truck-002',
    truckNumber: 'T-456',
    driver: { name: 'Sarah Chen', phone: '+1 (555) 234-5678', hoursRemaining: 4.0 },
    status: 'at_dock',
    currentLocation: 'Dock 3',
    destination: 'Downtown Bistro',
    eta: new Date(Date.now() + 7200000).toISOString(),
    fuelLevel: 85,
    temperature: 36,
    cargo: { weight: 12400, capacity: 24000, pallets: 18, palletCapacity: 26 },
    relatedShipments: ['SHIP-2026-0456'],
    dockAssignment: 'Dock 3',
    lastUpdate: new Date(Date.now() - 60000).toISOString()
  },
  {
    id: 'truck-003',
    truckNumber: 'T-123',
    driver: { name: 'James Wilson', phone: '+1 (555) 345-6789', hoursRemaining: 8.0 },
    status: 'loading',
    currentLocation: 'Dock 7',
    destination: 'Harbor View Restaurant',
    eta: new Date(Date.now() + 10800000).toISOString(),
    fuelLevel: 95,
    temperature: 35,
    cargo: { weight: 8200, capacity: 24000, pallets: 12, palletCapacity: 26 },
    relatedShipments: ['SHIP-2026-0457'],
    dockAssignment: 'Dock 7',
    lastUpdate: new Date(Date.now() - 120000).toISOString()
  },
  {
    id: 'truck-004',
    truckNumber: 'T-890',
    driver: { name: 'Emily Davis', phone: '+1 (555) 456-7890', hoursRemaining: 2.5 },
    status: 'idle',
    currentLocation: 'Yard Parking',
    destination: '-',
    eta: '-',
    fuelLevel: 45,
    cargo: { weight: 0, capacity: 24000, pallets: 0, palletCapacity: 26 },
    relatedShipments: [],
    lastUpdate: new Date(Date.now() - 1800000).toISOString()
  }
];

const mockDocks: DockDoor[] = [
  { id: 'dock-1', doorNumber: 'Dock 1', status: 'available', operation: 'none' },
  { id: 'dock-2', doorNumber: 'Dock 2', status: 'scheduled', scheduledTime: '2:30 PM', operation: 'inbound' },
  { id: 'dock-3', doorNumber: 'Dock 3', status: 'occupied', assignedTruck: 'T-456', operation: 'outbound' },
  { id: 'dock-4', doorNumber: 'Dock 4', status: 'available', operation: 'none' },
  { id: 'dock-5', doorNumber: 'Dock 5', status: 'maintenance', operation: 'none' },
  { id: 'dock-6', doorNumber: 'Dock 6', status: 'available', operation: 'none' },
  { id: 'dock-7', doorNumber: 'Dock 7', status: 'occupied', assignedTruck: 'T-123', operation: 'outbound' },
  { id: 'dock-8', doorNumber: 'Dock 8', status: 'scheduled', scheduledTime: '3:00 PM', operation: 'inbound' },
];

export const TruckingModule = () => {
  const [trucks, setTrucks] = useState<TruckUnit[]>(mockTrucks);
  const [docks, setDocks] = useState<DockDoor[]>(mockDocks);
  const [selectedTruck, setSelectedTruck] = useState<TruckUnit | null>(null);
  const [activeTab, setActiveTab] = useState('fleet');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_transit': return 'default';
      case 'at_dock': return 'secondary';
      case 'loading': case 'unloading': return 'default';
      case 'idle': return 'outline';
      case 'maintenance': return 'destructive';
      default: return 'outline';
    }
  };

  const getDockStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'occupied': return 'bg-blue-500';
      case 'scheduled': return 'bg-yellow-500';
      case 'maintenance': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatEta = (eta: string) => {
    if (eta === '-') return '-';
    const date = new Date(eta);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
  };

  const assignDock = (truckId: string, dockId: string) => {
    setDocks(prev => prev.map(d => 
      d.id === dockId ? { ...d, status: 'occupied' as const, assignedTruck: trucks.find(t => t.id === truckId)?.truckNumber } : d
    ));
    setTrucks(prev => prev.map(t => 
      t.id === truckId ? { ...t, status: 'at_dock' as const, dockAssignment: docks.find(d => d.id === dockId)?.doorNumber } : t
    ));
    toast.success('Dock assigned successfully');
  };

  const inTransitCount = trucks.filter(t => t.status === 'in_transit').length;
  const atDockCount = trucks.filter(t => ['at_dock', 'loading', 'unloading'].includes(t.status)).length;
  const availableDocks = docks.filter(d => d.status === 'available').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Trucking & Fleet</h2>
          <p className="text-[10px] text-muted-foreground">Track trucks, manage docks & coordinate logistics</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[9px] h-4">
            <Truck className="h-2.5 w-2.5 mr-0.5" />{inTransitCount} In Transit
          </Badge>
          <Badge variant="outline" className="text-[9px] h-4">
            <MapPin className="h-2.5 w-2.5 mr-0.5" />{atDockCount} At Dock
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-1">
        <Card className="p-1.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-medium">Fleet</p>
              <div className="text-sm font-bold">{trucks.length}</div>
            </div>
            <Truck className="h-3 w-3 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-1.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-medium">In Transit</p>
              <div className="text-sm font-bold">{inTransitCount}</div>
            </div>
            <Navigation className="h-3 w-3 text-blue-500" />
          </div>
        </Card>
        <Card className="p-1.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-medium">Available Docks</p>
              <div className="text-sm font-bold">{availableDocks}</div>
            </div>
            <Box className="h-3 w-3 text-green-500" />
          </div>
        </Card>
        <Card className="p-1.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-medium">Next Arrival</p>
              <div className="text-sm font-bold">{formatEta(trucks.find(t => t.status === 'in_transit')?.eta || '-')}</div>
            </div>
            <Clock className="h-3 w-3 text-orange-500" />
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-7 text-[10px]">
          <TabsTrigger value="fleet" className="text-[10px] h-6 px-2">
            <Truck className="h-3 w-3 mr-1" />Fleet
          </TabsTrigger>
          <TabsTrigger value="docks" className="text-[10px] h-6 px-2">
            <Box className="h-3 w-3 mr-1" />Dock Doors
          </TabsTrigger>
          <TabsTrigger value="schedule" className="text-[10px] h-6 px-2">
            <Calendar className="h-3 w-3 mr-1" />Schedule
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="mt-2 space-y-1.5">
          {trucks.map((truck) => (
            <Card key={truck.id} className={selectedTruck?.id === truck.id ? 'border-primary' : ''}>
              <CardContent className="p-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                      <Truck className={`h-4 w-4 ${truck.status === 'in_transit' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] font-bold">{truck.truckNumber}</p>
                        <Badge variant={getStatusColor(truck.status)} className="text-[7px] h-3 px-1">
                          {truck.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                        <User className="h-2.5 w-2.5" />
                        <span>{truck.driver.name}</span>
                        <span className="text-[8px]">• {truck.driver.hoursRemaining}h remaining</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px]">
                        <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{truck.currentLocation}</span>
                        {truck.destination !== '-' && (
                          <>
                            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                            <span>{truck.destination}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Cargo & Status Indicators */}
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Fuel className="h-2.5 w-2.5 text-muted-foreground" />
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${truck.fuelLevel > 50 ? 'bg-green-500' : truck.fuelLevel > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${truck.fuelLevel}%` }}
                            />
                          </div>
                          <span className="text-[8px]">{truck.fuelLevel}%</span>
                        </div>
                        {truck.temperature && (
                          <div className="flex items-center gap-0.5 text-[8px]">
                            <Thermometer className="h-2.5 w-2.5 text-blue-500" />
                            <span>{truck.temperature}°F</span>
                          </div>
                        )}
                        <div className="flex items-center gap-0.5 text-[8px]">
                          <Weight className="h-2.5 w-2.5 text-muted-foreground" />
                          <span>{(truck.cargo.weight / 1000).toFixed(1)}k/{(truck.cargo.capacity / 1000).toFixed(0)}k lbs</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-[8px]">
                          <Package className="h-2.5 w-2.5 text-muted-foreground" />
                          <span>{truck.cargo.pallets}/{truck.cargo.palletCapacity} pallets</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {truck.status === 'in_transit' && (
                      <div className="text-[9px]">
                        <p className="text-muted-foreground">ETA</p>
                        <p className="font-medium text-blue-600">{formatEta(truck.eta)}</p>
                      </div>
                    )}
                    {truck.dockAssignment && (
                      <Badge variant="outline" className="text-[8px] h-4">
                        {truck.dockAssignment}
                      </Badge>
                    )}
                    <div className="flex gap-0.5 mt-1">
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                        <Phone className="h-2.5 w-2.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                        <Radio className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="docks" className="mt-2">
          <div className="grid grid-cols-4 gap-1.5">
            {docks.map((dock) => (
              <Card 
                key={dock.id} 
                className={`p-2 cursor-pointer hover:border-primary transition-colors ${
                  dock.status === 'maintenance' ? 'opacity-50' : ''
                }`}
              >
                <div className="text-center">
                  <div className={`h-10 w-full rounded flex items-center justify-center mb-1 ${getDockStatusColor(dock.status)}`}>
                    <Box className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-[10px] font-bold">{dock.doorNumber}</p>
                  <Badge variant="outline" className="text-[7px] h-3 mt-0.5 capitalize">
                    {dock.status}
                  </Badge>
                  {dock.assignedTruck && (
                    <p className="text-[8px] text-muted-foreground mt-0.5">
                      <Truck className="h-2 w-2 inline mr-0.5" />{dock.assignedTruck}
                    </p>
                  )}
                  {dock.scheduledTime && (
                    <p className="text-[8px] text-muted-foreground mt-0.5">
                      <Clock className="h-2 w-2 inline mr-0.5" />{dock.scheduledTime}
                    </p>
                  )}
                  {dock.operation !== 'none' && (
                    <Badge 
                      variant={dock.operation === 'inbound' ? 'default' : 'secondary'} 
                      className="text-[7px] h-3 mt-0.5"
                    >
                      {dock.operation === 'inbound' ? '↓ IN' : '↑ OUT'}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
          
          <Card className="mt-2">
            <CardHeader className="p-2">
              <CardTitle className="text-xs">Dock Legend</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="flex gap-3 text-[9px]">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded bg-green-500" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded bg-blue-500" />
                  <span>Occupied</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded bg-yellow-500" />
                  <span>Scheduled</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded bg-red-500" />
                  <span>Maintenance</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-2 space-y-1.5">
          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-xs">Today's Dock Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0 space-y-1">
              <div className="flex items-center justify-between p-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded">
                <div className="flex items-center gap-2">
                  <div className="text-[9px] font-bold text-blue-600 w-12">2:30 PM</div>
                  <Badge variant="default" className="text-[7px] h-3">INBOUND</Badge>
                  <span className="text-[9px]">Sysco Delivery - PO-2026-0142</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[7px] h-3">Dock 2</Badge>
                  <Badge variant="outline" className="text-[7px] h-3">T-789</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded">
                <div className="flex items-center gap-2">
                  <div className="text-[9px] font-bold text-green-600 w-12">3:00 PM</div>
                  <Badge variant="secondary" className="text-[7px] h-3">OUTBOUND</Badge>
                  <span className="text-[9px]">Downtown Bistro - SHIP-0456</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[7px] h-3">Dock 3</Badge>
                  <Badge variant="outline" className="text-[7px] h-3">T-456</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded">
                <div className="flex items-center gap-2">
                  <div className="text-[9px] font-bold text-blue-600 w-12">3:00 PM</div>
                  <Badge variant="default" className="text-[7px] h-3">INBOUND</Badge>
                  <span className="text-[9px]">US Foods - PO-2026-0138</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[7px] h-3">Dock 8</Badge>
                  <Badge variant="outline" className="text-[7px] h-3">TBD</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded">
                <div className="flex items-center gap-2">
                  <div className="text-[9px] font-bold text-green-600 w-12">4:30 PM</div>
                  <Badge variant="secondary" className="text-[7px] h-3">OUTBOUND</Badge>
                  <span className="text-[9px]">Harbor View - SHIP-0457</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[7px] h-3">Dock 7</Badge>
                  <Badge variant="outline" className="text-[7px] h-3">T-123</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="flex-1 h-7 text-[9px]">
              <Calendar className="h-3 w-3 mr-1" />View Full Schedule
            </Button>
            <Button size="sm" className="flex-1 h-7 text-[9px]">
              <Route className="h-3 w-3 mr-1" />Optimize Routes
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
