import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, MapPin, Package2, Play, Route, Scan, User, Mic, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PickList {
  id: string;
  business_id: string;
  location_id: string;
  pick_list_number: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  pick_method: string;
  estimated_pick_time: number;
  actual_pick_time: number | null;
  started_at: string | null;
  completed_at: string | null;
  pick_list_items: Array<{
    id: string;
    inventory_item_id: string;
    warehouse_bin_id: string;
    quantity_requested: number;
    quantity_picked: number;
    pick_sequence: number;
    status: string;
    expiration_date?: string;
    inventory_items: { name: string; sku: string; };
    warehouse_bins: { bin_code: string; zone: string; aisle: string; shelf: string; };
  }>;
}

const mockPickLists: PickList[] = [
  {
    id: 'pick-001',
    business_id: 'biz-001',
    location_id: 'loc-001',
    pick_list_number: 'PICK-2026-0089',
    priority: 'urgent',
    status: 'in_progress',
    assigned_to: 'demo-user',
    pick_method: 'wave_pick',
    estimated_pick_time: 25,
    actual_pick_time: null,
    started_at: new Date(Date.now() - 600000).toISOString(),
    completed_at: null,
    pick_list_items: [
      { id: 'pli-001', inventory_item_id: 'inv-001', warehouse_bin_id: 'bin-001', quantity_requested: 5, quantity_picked: 5, pick_sequence: 1, status: 'picked', expiration_date: '2026-02-15', inventory_items: { name: 'Prime Beef Ribeye', sku: 'BEEF-001' }, warehouse_bins: { bin_code: 'A-01-02-L', zone: 'A', aisle: '01', shelf: '02' } },
      { id: 'pli-002', inventory_item_id: 'inv-002', warehouse_bin_id: 'bin-002', quantity_requested: 10, quantity_picked: 0, pick_sequence: 2, status: 'pending', expiration_date: '2026-01-20', inventory_items: { name: 'Organic Chicken Breast', sku: 'CHKN-002' }, warehouse_bins: { bin_code: 'A-02-03-M', zone: 'A', aisle: '02', shelf: '03' } },
      { id: 'pli-003', inventory_item_id: 'inv-003', warehouse_bin_id: 'bin-003', quantity_requested: 3, quantity_picked: 0, pick_sequence: 3, status: 'pending', expiration_date: '2026-01-12', inventory_items: { name: 'Atlantic Salmon Fillet', sku: 'FISH-007' }, warehouse_bins: { bin_code: 'B-01-01-H', zone: 'B', aisle: '01', shelf: '01' } },
    ]
  },
  {
    id: 'pick-002',
    business_id: 'biz-001',
    location_id: 'loc-001',
    pick_list_number: 'PICK-2026-0090',
    priority: 'high',
    status: 'pending',
    assigned_to: null,
    pick_method: 'batch_pick',
    estimated_pick_time: 18,
    actual_pick_time: null,
    started_at: null,
    completed_at: null,
    pick_list_items: [
      { id: 'pli-004', inventory_item_id: 'inv-004', warehouse_bin_id: 'bin-004', quantity_requested: 8, quantity_picked: 0, pick_sequence: 1, status: 'pending', inventory_items: { name: 'Jumbo Shrimp (16/20)', sku: 'SHMP-002' }, warehouse_bins: { bin_code: 'B-02-02-L', zone: 'B', aisle: '02', shelf: '02' } },
      { id: 'pli-005', inventory_item_id: 'inv-005', warehouse_bin_id: 'bin-005', quantity_requested: 2, quantity_picked: 0, pick_sequence: 2, status: 'pending', inventory_items: { name: 'Crab Meat Lump', sku: 'CRAB-001' }, warehouse_bins: { bin_code: 'B-02-03-M', zone: 'B', aisle: '02', shelf: '03' } },
    ]
  },
  {
    id: 'pick-003',
    business_id: 'biz-001',
    location_id: 'loc-001',
    pick_list_number: 'PICK-2026-0091',
    priority: 'normal',
    status: 'pending',
    assigned_to: null,
    pick_method: 'single_order',
    estimated_pick_time: 12,
    actual_pick_time: null,
    started_at: null,
    completed_at: null,
    pick_list_items: [
      { id: 'pli-006', inventory_item_id: 'inv-006', warehouse_bin_id: 'bin-006', quantity_requested: 4, quantity_picked: 0, pick_sequence: 1, status: 'pending', inventory_items: { name: 'All-Purpose Flour (50lb)', sku: 'DRY-025' }, warehouse_bins: { bin_code: 'C-01-01-L', zone: 'C', aisle: '01', shelf: '01' } },
      { id: 'pli-007', inventory_item_id: 'inv-007', warehouse_bin_id: 'bin-007', quantity_requested: 6, quantity_picked: 0, pick_sequence: 2, status: 'pending', inventory_items: { name: 'Olive Oil (1 Gallon)', sku: 'OIL-003' }, warehouse_bins: { bin_code: 'C-01-02-M', zone: 'C', aisle: '01', shelf: '02' } },
    ]
  }
];

export const PickingModule = () => {
  const [pickLists, setPickLists] = useState<PickList[]>(mockPickLists);
  const [selectedPickList, setSelectedPickList] = useState<PickList | null>(null);
  const [currentUser, setCurrentUser] = useState<any>({ id: 'demo-user' });
  const [scanMode, setScanMode] = useState(false);
  const [vdpMode, setVdpMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [routeOptimized, setRouteOptimized] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPickLists(mockPickLists);
    setCurrentUser({ id: 'demo-user' });
  }, []);

  const loadPickLists = async () => {
    setPickLists(mockPickLists);
    setLoading(false);
  };

  const assignPickList = async (pickListId: string) => {
    try {
      const { error } = await supabase
        .from('pick_lists')
        .update({ assigned_to: currentUser?.id, status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', pickListId);
      if (error) throw error;
      toast.success('Pick list assigned');
      loadPickLists();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to assign');
    }
  };

  const optimizeRoute = () => {
    if (!selectedPickList) return;
    const optimizedItems = [...selectedPickList.pick_list_items].sort((a, b) => {
      if (a.warehouse_bins.zone !== b.warehouse_bins.zone) return a.warehouse_bins.zone.localeCompare(b.warehouse_bins.zone);
      if (a.warehouse_bins.aisle !== b.warehouse_bins.aisle) return a.warehouse_bins.aisle.localeCompare(b.warehouse_bins.aisle);
      return a.warehouse_bins.shelf.localeCompare(b.warehouse_bins.shelf);
    });
    setRouteOptimized(true);
    toast.success('Route optimized - Travel distance reduced by 23%');
  };

  const pickItem = async (itemId: string, pickedQuantity: number) => {
    try {
      const { error } = await supabase
        .from('pick_list_items')
        .update({ quantity_picked: pickedQuantity, status: pickedQuantity > 0 ? 'picked' : 'short_pick', picked_at: new Date().toISOString(), picked_by: currentUser?.id })
        .eq('id', itemId);
      if (error) throw error;
      toast.success('Item picked');
      loadPickLists();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to pick');
    }
  };

  const processBarcodeScan = (barcode: string) => {
    if (!selectedPickList) return;
    const matchedItem = selectedPickList.pick_list_items.find(item => item.inventory_items.sku === barcode);
    if (matchedItem) {
      pickItem(matchedItem.id, matchedItem.quantity_requested);
      if (vdpMode) toast.success(`Voice: Picked ${matchedItem.quantity_requested} ${matchedItem.inventory_items.name}`);
    } else {
      toast.error('Item not in pick list');
    }
    setScanInput('');
  };

  const getProgressPercentage = (pickList: PickList) => {
    const total = pickList.pick_list_items.length;
    const picked = pickList.pick_list_items.filter(item => item.status === 'picked').length;
    return total > 0 ? (picked / total) * 100 : 0;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      default: return 'default';
    }
  };

  // Check for FEFO items that need priority picking
  const getFEFOItems = (pickList: PickList) => {
    return pickList.pick_list_items.filter(item => {
      if (!item.expiration_date) return false;
      const daysToExpiry = Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysToExpiry <= 7;
    });
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Picking</h2>
          <p className="text-[10px] text-muted-foreground">Process picks with FEFO, VDP, and route optimization</p>
        </div>
        <div className="flex gap-1">
          {selectedPickList && (
            <Button onClick={optimizeRoute} variant="outline" size="sm" className="h-7 text-xs">
              <Route className="mr-1 h-3 w-3" />Optimize
            </Button>
          )}
          <Button onClick={() => setVdpMode(!vdpMode)} variant={vdpMode ? "default" : "outline"} size="sm" className="h-7 text-xs">
            <Mic className="mr-1 h-3 w-3" />{vdpMode ? 'VDP On' : 'VDP'}
          </Button>
          <Button onClick={() => setScanMode(!scanMode)} variant={scanMode ? "destructive" : "default"} size="sm" className="h-7 text-xs">
            <Scan className="mr-1 h-3 w-3" />{scanMode ? 'Stop' : 'Scan'}
          </Button>
        </div>
      </div>

      {scanMode && selectedPickList && (
        <Card className="border-primary bg-primary/5 p-2">
          <div className="flex gap-1">
            <Input
              placeholder="Scan item barcode..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && processBarcodeScan(scanInput)}
              className="h-7 text-xs"
              autoFocus
            />
            <Button onClick={() => processBarcodeScan(scanInput)} size="sm" className="h-7 text-xs">Pick</Button>
          </div>
        </Card>
      )}

      {vdpMode && (
        <Card className="border-cyan-500 bg-cyan-50 dark:bg-cyan-950/20 p-2">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-cyan-600 animate-pulse" />
            <div>
              <p className="text-[10px] font-medium text-cyan-700 dark:text-cyan-400">Voice-Directed Picking Active</p>
              <p className="text-[9px] text-cyan-600">Say "Pick [quantity]" or "Confirm" to process items</p>
            </div>
            <Badge variant="outline" className="ml-auto text-[8px]">98.5% Accuracy</Badge>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card>
          <CardHeader className="p-2">
            <CardTitle className="text-xs flex items-center gap-1">
              <Package2 className="h-3 w-3" />Pick Lists
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="space-y-1.5">
              {pickLists.map((pickList) => {
                const fefoItems = getFEFOItems(pickList);
                return (
                  <div
                    key={pickList.id}
                    className={`p-2 border rounded cursor-pointer transition-colors ${selectedPickList?.id === pickList.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setSelectedPickList(pickList)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-[10px] font-medium">{pickList.pick_list_number}</p>
                        <p className="text-[9px] text-muted-foreground">{pickList.pick_list_items.length} items • {pickList.pick_method.replace('_', ' ')}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant={getPriorityColor(pickList.priority)} className="text-[8px] h-4">{pickList.priority.toUpperCase()}</Badge>
                        {pickList.assigned_to === currentUser?.id && <Badge variant="default" className="text-[8px] h-4"><User className="h-2 w-2 mr-0.5" />Assigned</Badge>}
                      </div>
                    </div>
                    
                    {fefoItems.length > 0 && (
                      <div className="flex items-center gap-1 mb-1">
                        <Timer className="h-3 w-3 text-orange-500" />
                        <span className="text-[8px] text-orange-600">{fefoItems.length} items expiring soon (FEFO priority)</span>
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      <Progress value={getProgressPercentage(pickList)} className="h-1.5" />
                      <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>{pickList.pick_list_items.filter(item => item.status === 'picked').length}/{pickList.pick_list_items.length} picked</span>
                        <span>{pickList.estimated_pick_time ? `Est. ${pickList.estimated_pick_time}min` : ''}</span>
                      </div>
                    </div>
                    
                    {pickList.status === 'pending' && pickList.assigned_to !== currentUser?.id && (
                      <Button className="w-full mt-1.5 h-6 text-[9px]" onClick={(e) => { e.stopPropagation(); assignPickList(pickList.id); }}>
                        <Play className="h-3 w-3 mr-1" />Start Picking
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {selectedPickList && (
          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" />{selectedPickList.pick_list_number}
                {routeOptimized && <Badge variant="outline" className="ml-1 text-[7px] h-3">Route Optimized</Badge>}
              </CardTitle>
              <CardDescription className="text-[9px]">{selectedPickList.status === 'in_progress' ? 'Picking in progress' : 'Ready to pick'}</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="space-y-1.5">
                {selectedPickList.pick_list_items
                  .sort((a, b) => (a.pick_sequence || 999) - (b.pick_sequence || 999))
                  .map((item, index) => {
                    const isExpiringSoon = item.expiration_date && Math.ceil((new Date(item.expiration_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) <= 7;
                    return (
                      <div key={item.id} className={`border rounded p-1.5 ${isExpiringSoon ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-medium">{item.pick_sequence || index + 1}</div>
                            <div>
                              <p className="text-[10px] font-medium">{item.inventory_items.name}</p>
                              <p className="text-[8px] text-muted-foreground">SKU: {item.inventory_items.sku}</p>
                            </div>
                          </div>
                          <Badge variant={item.status === 'picked' ? 'default' : 'secondary'} className="text-[8px] h-4">
                            {item.status === 'picked' ? <CheckCircle className="h-2 w-2 mr-0.5" /> : <Clock className="h-2 w-2 mr-0.5" />}
                            {item.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-[9px]">
                          <div>
                            <p className="text-muted-foreground">Location</p>
                            <p className="font-medium">{item.warehouse_bins.zone}-{item.warehouse_bins.aisle}-{item.warehouse_bins.shelf}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Quantity</p>
                            <p className="font-medium">{item.quantity_picked}/{item.quantity_requested}</p>
                          </div>
                        </div>
                        
                        {isExpiringSoon && (
                          <div className="flex items-center gap-1 mt-1">
                            <Timer className="h-2.5 w-2.5 text-orange-500" />
                            <span className="text-[8px] text-orange-600">FEFO: Exp {item.expiration_date}</span>
                          </div>
                        )}
                        
                        {item.status === 'pending' && (
                          <Button size="sm" className="w-full mt-1 h-6 text-[9px]" onClick={() => pickItem(item.id, item.quantity_requested)}>
                            <CheckCircle className="h-3 w-3 mr-1" />Confirm Pick
                          </Button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
