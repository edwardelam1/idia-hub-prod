import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, ArrowRight, MapPin, Package, Scan, Zap, Grid3X3, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WarehouseBin {
  id: string;
  bin_code: string;
  zone: string;
  aisle: string;
  shelf: string;
  level: string;
  bin_type: string;
  capacity_cubic_feet: number;
  weight_capacity_lbs: number;
  temperature_controlled: boolean;
  is_active: boolean;
  abc_zone?: string;
  affinity_group?: string;
}

interface PutAwayTask {
  id: string;
  business_id: string;
  location_id: string;
  task_number: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  description: string;
  reference_id: string;
  reference_type: string;
  created_at: string;
  purchase_order_line_items?: {
    sku: string;
    item_name: string;
    received_quantity: number;
    inventory_items: { id: string; name: string; category: string; unit_of_measure: string; current_stock: number; abc_class?: string; affinity_items?: string[]; };
  };
}

const mockPutAwayTasks: PutAwayTask[] = [
  {
    id: 'put-001',
    business_id: 'biz-001',
    location_id: 'loc-001',
    task_number: 'PUT-2026-0178',
    priority: 'high',
    status: 'pending',
    assigned_to: null,
    description: 'Put away from PO-2026-0142',
    reference_id: 'li-001',
    reference_type: 'purchase_order_line_item',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    purchase_order_line_items: {
      sku: 'BEEF-001',
      item_name: 'Prime Beef Ribeye',
      received_quantity: 50,
      inventory_items: { id: 'inv-001', name: 'Prime Beef Ribeye', category: 'Meat', unit_of_measure: 'lb', current_stock: 125, abc_class: 'A', affinity_items: ['CHKN-002', 'VEG-010'] }
    }
  },
  {
    id: 'put-002',
    business_id: 'biz-001',
    location_id: 'loc-001',
    task_number: 'PUT-2026-0179',
    priority: 'urgent',
    status: 'in_progress',
    assigned_to: 'demo-user',
    description: 'Put away from PO-2026-0142',
    reference_id: 'li-002',
    reference_type: 'purchase_order_line_item',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    purchase_order_line_items: {
      sku: 'CHKN-002',
      item_name: 'Organic Chicken Breast',
      received_quantity: 100,
      inventory_items: { id: 'inv-002', name: 'Organic Chicken Breast', category: 'Poultry', unit_of_measure: 'lb', current_stock: 200, abc_class: 'A', affinity_items: ['BEEF-001'] }
    }
  },
  {
    id: 'put-003',
    business_id: 'biz-001',
    location_id: 'loc-001',
    task_number: 'PUT-2026-0180',
    priority: 'normal',
    status: 'pending',
    assigned_to: null,
    description: 'Put away from PO-2026-0135',
    reference_id: 'li-006',
    reference_type: 'purchase_order_line_item',
    created_at: new Date(Date.now() - 7200000).toISOString(),
    purchase_order_line_items: {
      sku: 'FISH-007',
      item_name: 'Atlantic Salmon Fillet',
      received_quantity: 25,
      inventory_items: { id: 'inv-003', name: 'Atlantic Salmon Fillet', category: 'Seafood', unit_of_measure: 'lb', current_stock: 80, abc_class: 'A', affinity_items: ['SHMP-002', 'CRAB-001'] }
    }
  }
];

const mockWarehouseBins: WarehouseBin[] = [
  { id: 'bin-001', bin_code: 'A-01-02-L', zone: 'A', aisle: '01', shelf: '02', level: 'L', bin_type: 'standard', capacity_cubic_feet: 50, weight_capacity_lbs: 500, temperature_controlled: true, is_active: true, abc_zone: 'A', affinity_group: 'proteins' },
  { id: 'bin-002', bin_code: 'A-02-03-M', zone: 'A', aisle: '02', shelf: '03', level: 'M', bin_type: 'standard', capacity_cubic_feet: 40, weight_capacity_lbs: 400, temperature_controlled: true, is_active: true, abc_zone: 'A', affinity_group: 'proteins' },
  { id: 'bin-003', bin_code: 'B-01-01-H', zone: 'B', aisle: '01', shelf: '01', level: 'H', bin_type: 'cold_storage', capacity_cubic_feet: 60, weight_capacity_lbs: 600, temperature_controlled: true, is_active: true, abc_zone: 'A', affinity_group: 'seafood' },
  { id: 'bin-004', bin_code: 'B-02-02-L', zone: 'B', aisle: '02', shelf: '02', level: 'L', bin_type: 'cold_storage', capacity_cubic_feet: 45, weight_capacity_lbs: 450, temperature_controlled: true, is_active: true, abc_zone: 'B', affinity_group: 'seafood' },
  { id: 'bin-005', bin_code: 'B-02-03-M', zone: 'B', aisle: '02', shelf: '03', level: 'M', bin_type: 'cold_storage', capacity_cubic_feet: 40, weight_capacity_lbs: 400, temperature_controlled: true, is_active: true, abc_zone: 'B', affinity_group: 'seafood' },
  { id: 'bin-006', bin_code: 'C-01-01-L', zone: 'C', aisle: '01', shelf: '01', level: 'L', bin_type: 'dry_storage', capacity_cubic_feet: 100, weight_capacity_lbs: 1000, temperature_controlled: false, is_active: true, abc_zone: 'C', affinity_group: 'dry_goods' },
  { id: 'bin-007', bin_code: 'C-01-02-M', zone: 'C', aisle: '01', shelf: '02', level: 'M', bin_type: 'dry_storage', capacity_cubic_feet: 80, weight_capacity_lbs: 800, temperature_controlled: false, is_active: true, abc_zone: 'C', affinity_group: 'dry_goods' },
  { id: 'bin-008', bin_code: 'C-02-01-L', zone: 'C', aisle: '02', shelf: '01', level: 'L', bin_type: 'dry_storage', capacity_cubic_feet: 100, weight_capacity_lbs: 1000, temperature_controlled: false, is_active: true, abc_zone: 'C', affinity_group: 'dry_goods' },
];

export const PutAwayModule = () => {
  const [putAwayTasks, setPutAwayTasks] = useState<PutAwayTask[]>(mockPutAwayTasks);
  const [warehouseBins, setWarehouseBins] = useState<WarehouseBin[]>(mockWarehouseBins);
  const [selectedTask, setSelectedTask] = useState<PutAwayTask | null>(null);
  const [suggestedBin, setSuggestedBin] = useState<WarehouseBin | null>(null);
  const [selectedBin, setSelectedBin] = useState<WarehouseBin | null>(null);
  const [currentUser, setCurrentUser] = useState<any>({ id: 'demo-user' });
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPutAwayTasks(mockPutAwayTasks);
    setWarehouseBins(mockWarehouseBins);
    setCurrentUser({ id: 'demo-user' });
  }, []);

  const loadPutAwayTasks = async () => {
    setPutAwayTasks(mockPutAwayTasks);
    setLoading(false);
  };

  const generatePutAwaySuggestion = (task: PutAwayTask) => {
    if (!task.purchase_order_line_items?.inventory_items) return;
    const item = task.purchase_order_line_items.inventory_items;
    
    // ABC + Affinity slotting algorithm
    const abcZone = item.abc_class || 'C';
    const matchingBins = warehouseBins.filter(bin => bin.abc_zone === abcZone && bin.is_active);
    
    // Check for affinity items in adjacent slots
    let affinityBin = matchingBins.find(bin => 
      item.affinity_items?.some(affSku => bin.affinity_group?.includes(affSku.toLowerCase().split('-')[0]))
    );
    
    if (affinityBin) {
      setSuggestedBin(affinityBin);
      toast.success(`Affinity slotting: Adjacent to frequently co-picked items`);
    } else if (matchingBins.length > 0) {
      setSuggestedBin(matchingBins[0]);
      toast.success(`ABC slotting: ${abcZone}-zone for ${item.abc_class === 'A' ? 'high' : item.abc_class === 'B' ? 'medium' : 'low'} velocity items`);
    }
  };

  const assignTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('warehouse_tasks').update({ assigned_to: currentUser?.id, status: 'in_progress', started_at: new Date().toISOString() }).eq('id', taskId);
      if (error) throw error;
      toast.success('Task assigned');
      loadPutAwayTasks();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to assign');
    }
  };

  const completePutAway = async (taskId: string, binId: string, quantity: number) => {
    try {
      const { error: taskError } = await supabase.from('warehouse_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId);
      if (taskError) throw taskError;
      toast.success('Put away completed');
      setSelectedTask(null);
      setSuggestedBin(null);
      setSelectedBin(null);
      loadPutAwayTasks();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to complete');
    }
  };

  const processBarcodeScan = (barcode: string) => {
    const matchedBin = warehouseBins.find(bin => bin.bin_code === barcode);
    if (matchedBin) {
      setSelectedBin(matchedBin);
      toast.success(`Selected bin: ${matchedBin.bin_code}`);
    } else {
      toast.error('Bin not found');
    }
    setScanInput('');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      default: return 'default';
    }
  };

  const getABCColor = (abcClass?: string) => {
    switch (abcClass) {
      case 'A': return 'text-green-600 bg-green-50';
      case 'B': return 'text-blue-600 bg-blue-50';
      case 'C': return 'text-gray-600 bg-gray-50';
      default: return '';
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64">Loading...</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Put Away</h2>
          <p className="text-[10px] text-muted-foreground">ABC stratification + product affinity slotting</p>
        </div>
        <div className="flex gap-1">
          {selectedTask && (
            <Button onClick={() => generatePutAwaySuggestion(selectedTask)} variant="outline" size="sm" className="h-7 text-xs">
              <Zap className="mr-1 h-3 w-3" />AI Slot
            </Button>
          )}
          <Button onClick={() => setScanMode(!scanMode)} variant={scanMode ? "destructive" : "default"} size="sm" className="h-7 text-xs">
            <Scan className="mr-1 h-3 w-3" />{scanMode ? 'Stop' : 'Scan'}
          </Button>
        </div>
      </div>

      {/* Slotting Status */}
      <div className="flex gap-1">
        <Badge variant="outline" className="text-[8px] h-4">
          <Grid3X3 className="h-2 w-2 mr-0.5" />ABC Active
        </Badge>
        <Badge variant="outline" className="text-[8px] h-4">
          <Link2 className="h-2 w-2 mr-0.5" />156 Affinity Pairs
        </Badge>
        <Badge variant="outline" className="text-[8px] h-4">Last Re-slot: 2 days</Badge>
      </div>

      {scanMode && (
        <Card className="border-primary bg-primary/5 p-2">
          <div className="flex gap-1">
            <Input
              placeholder="Scan bin barcode..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && processBarcodeScan(scanInput)}
              className="h-7 text-xs"
              autoFocus
            />
            <Button onClick={() => processBarcodeScan(scanInput)} size="sm" className="h-7 text-xs">Select</Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card>
          <CardHeader className="p-2">
            <CardTitle className="text-xs flex items-center gap-1">
              <Package className="h-3 w-3" />Put Away Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="space-y-1.5">
              {putAwayTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-2 border rounded cursor-pointer transition-colors ${selectedTask?.id === task.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => { setSelectedTask(task); generatePutAwaySuggestion(task); }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-[10px] font-medium">{task.task_number}</p>
                      <p className="text-[9px] text-muted-foreground">{task.purchase_order_line_items?.item_name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {task.purchase_order_line_items?.inventory_items.abc_class && (
                        <Badge variant="outline" className={`text-[8px] h-4 ${getABCColor(task.purchase_order_line_items.inventory_items.abc_class)}`}>
                          {task.purchase_order_line_items.inventory_items.abc_class}
                        </Badge>
                      )}
                      <Badge variant={getPriorityColor(task.priority)} className="text-[8px] h-4">{task.priority.toUpperCase()}</Badge>
                    </div>
                  </div>
                  
                  {task.purchase_order_line_items && (
                    <div className="text-[8px] text-muted-foreground">
                      <p>SKU: {task.purchase_order_line_items.sku} • Qty: {task.purchase_order_line_items.received_quantity}</p>
                      {task.purchase_order_line_items.inventory_items.affinity_items && (
                        <p className="flex items-center gap-0.5"><Link2 className="h-2 w-2" />Co-picks: {task.purchase_order_line_items.inventory_items.affinity_items.join(', ')}</p>
                      )}
                    </div>
                  )}
                  
                  {task.status === 'pending' && task.assigned_to !== currentUser?.id && (
                    <Button className="w-full mt-1.5 h-6 text-[9px]" onClick={(e) => { e.stopPropagation(); assignTask(task.id); }}>Accept Task</Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedTask && (
          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3" />{selectedTask.task_number}
              </CardTitle>
              <CardDescription className="text-[9px]">{selectedTask.purchase_order_line_items?.item_name}</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="space-y-2">
                {selectedTask.purchase_order_line_items && (
                  <div className="border rounded p-1.5">
                    <p className="text-[9px] font-medium mb-1">Item Details</p>
                    <div className="grid grid-cols-2 gap-1 text-[8px]">
                      <div><span className="text-muted-foreground">SKU:</span> {selectedTask.purchase_order_line_items.sku}</div>
                      <div><span className="text-muted-foreground">Qty:</span> {selectedTask.purchase_order_line_items.received_quantity}</div>
                      <div><span className="text-muted-foreground">Category:</span> {selectedTask.purchase_order_line_items.inventory_items.category}</div>
                      <div><span className="text-muted-foreground">ABC:</span> {selectedTask.purchase_order_line_items.inventory_items.abc_class || 'N/A'}</div>
                    </div>
                  </div>
                )}

                {suggestedBin && (
                  <div className="border border-green-300 bg-green-50 dark:bg-green-950/20 rounded p-1.5">
                    <div className="flex items-center gap-1 mb-1">
                      <Zap className="h-3 w-3 text-green-600" />
                      <span className="text-[9px] font-medium text-green-700">AI Suggested Location</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold">{suggestedBin.bin_code}</p>
                        <p className="text-[8px] text-muted-foreground">{suggestedBin.bin_type} • {suggestedBin.abc_zone}-Zone</p>
                        {suggestedBin.affinity_group && <p className="text-[8px] text-green-600">Affinity: {suggestedBin.affinity_group}</p>}
                      </div>
                      <Button size="sm" className="h-6 text-[9px]" onClick={() => setSelectedBin(suggestedBin)}>
                        <ArrowRight className="h-3 w-3" />Use
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-[9px]">Or Select Bin Manually</Label>
                  <Select onValueChange={(value) => setSelectedBin(warehouseBins.find(b => b.id === value) || null)}>
                    <SelectTrigger className="h-7 text-xs mt-0.5">
                      <SelectValue placeholder="Select bin" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouseBins.filter(bin => bin.is_active).map((bin) => (
                        <SelectItem key={bin.id} value={bin.id} className="text-xs">
                          {bin.bin_code} ({bin.abc_zone}-Zone, {bin.bin_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedBin && (
                  <Button className="w-full h-7 text-xs" onClick={() => completePutAway(selectedTask.id, selectedBin.id, selectedTask.purchase_order_line_items?.received_quantity || 0)}>
                    Complete Put Away to {selectedBin.bin_code}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
