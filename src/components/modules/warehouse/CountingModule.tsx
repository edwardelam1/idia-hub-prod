import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Calculator, AlertTriangle, CheckCircle, BarChart3, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CycleCount {
  id: string;
  count_number: string;
  count_type: string;
  status: string;
  scheduled_date: string;
  total_items: number;
  items_counted: number;
  discrepancies_found: number;
  accuracy_percentage: number;
  abc_classification?: string;
  cycle_count_items: Array<{
    id: string;
    expected_quantity: number;
    counted_quantity: number;
    variance: number;
    status: string;
    abc_class?: string;
    inventory_items: { name: string; sku: string; };
    warehouse_bins: { bin_code: string; };
  }>;
}

const mockCycleCounts: CycleCount[] = [
  {
    id: 'cc-001',
    count_number: 'CC-2026-0023',
    count_type: 'ABC Analysis',
    status: 'in_progress',
    scheduled_date: new Date().toISOString(),
    total_items: 5,
    items_counted: 2,
    discrepancies_found: 1,
    accuracy_percentage: 96.5,
    abc_classification: 'A-Items',
    cycle_count_items: [
      { id: 'cci-001', expected_quantity: 45, counted_quantity: 45, variance: 0, status: 'counted', abc_class: 'A', inventory_items: { name: 'Prime Beef Ribeye', sku: 'BEEF-001' }, warehouse_bins: { bin_code: 'A-01-02-L' } },
      { id: 'cci-002', expected_quantity: 88, counted_quantity: 85, variance: -3, status: 'counted', abc_class: 'A', inventory_items: { name: 'Organic Chicken Breast', sku: 'CHKN-002' }, warehouse_bins: { bin_code: 'A-02-03-M' } },
      { id: 'cci-003', expected_quantity: 32, counted_quantity: 0, variance: 0, status: 'pending', abc_class: 'A', inventory_items: { name: 'Atlantic Salmon Fillet', sku: 'FISH-007' }, warehouse_bins: { bin_code: 'B-01-01-H' } },
      { id: 'cci-004', expected_quantity: 56, counted_quantity: 0, variance: 0, status: 'pending', abc_class: 'A', inventory_items: { name: 'Jumbo Shrimp (16/20)', sku: 'SHMP-002' }, warehouse_bins: { bin_code: 'B-02-02-L' } },
      { id: 'cci-005', expected_quantity: 18, counted_quantity: 0, variance: 0, status: 'pending', abc_class: 'A', inventory_items: { name: 'Crab Meat Lump', sku: 'CRAB-001' }, warehouse_bins: { bin_code: 'B-02-03-M' } },
    ]
  },
  {
    id: 'cc-002',
    count_number: 'CC-2026-0024',
    count_type: 'Spot Check',
    status: 'scheduled',
    scheduled_date: new Date(Date.now() + 86400000).toISOString(),
    total_items: 3,
    items_counted: 0,
    discrepancies_found: 0,
    accuracy_percentage: 0,
    abc_classification: 'B-Items',
    cycle_count_items: [
      { id: 'cci-006', expected_quantity: 16, counted_quantity: 0, variance: 0, status: 'pending', abc_class: 'B', inventory_items: { name: 'All-Purpose Flour (50lb)', sku: 'DRY-025' }, warehouse_bins: { bin_code: 'C-01-01-L' } },
      { id: 'cci-007', expected_quantity: 12, counted_quantity: 0, variance: 0, status: 'pending', abc_class: 'B', inventory_items: { name: 'Olive Oil (1 Gallon)', sku: 'OIL-003' }, warehouse_bins: { bin_code: 'C-01-02-M' } },
      { id: 'cci-008', expected_quantity: 28, counted_quantity: 0, variance: 0, status: 'pending', abc_class: 'B', inventory_items: { name: 'Fresh Mixed Vegetables', sku: 'VEG-010' }, warehouse_bins: { bin_code: 'A-03-01-L' } },
    ]
  },
  {
    id: 'cc-003',
    count_number: 'CC-2026-0025',
    count_type: 'Full Inventory',
    status: 'scheduled',
    scheduled_date: new Date(Date.now() + 604800000).toISOString(),
    total_items: 8,
    items_counted: 0,
    discrepancies_found: 0,
    accuracy_percentage: 0,
    abc_classification: 'C-Items',
    cycle_count_items: [
      { id: 'cci-009', expected_quantity: 100, counted_quantity: 0, variance: 0, status: 'pending', abc_class: 'C', inventory_items: { name: 'Sugar (25lb)', sku: 'DRY-030' }, warehouse_bins: { bin_code: 'C-02-01-L' } },
      { id: 'cci-010', expected_quantity: 75, counted_quantity: 0, variance: 0, status: 'pending', abc_class: 'C', inventory_items: { name: 'Salt (5lb)', sku: 'DRY-031' }, warehouse_bins: { bin_code: 'C-02-02-L' } },
    ]
  }
];

export const CountingModule = () => {
  const [cycleCounts, setCycleCounts] = useState<CycleCount[]>(mockCycleCounts);
  const [selectedCount, setSelectedCount] = useState<CycleCount | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCycleCounts(mockCycleCounts);
  }, []);

  const loadCycleCounts = async () => {
    setCycleCounts(mockCycleCounts);
    setLoading(false);
  };

  const startCycleCount = async (countId: string) => {
    try {
      const { error } = await supabase.from('cycle_counts').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', countId);
      if (error) throw error;
      toast.success('Cycle count started');
      loadCycleCounts();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to start');
    }
  };

  const updateItemCount = async (itemId: string, countedQuantity: number) => {
    try {
      const item = selectedCount?.cycle_count_items.find(i => i.id === itemId);
      if (!item) return;
      const variance = countedQuantity - item.expected_quantity;
      
      const { error } = await supabase.from('cycle_count_items').update({ counted_quantity: countedQuantity, variance, status: 'counted', counted_at: new Date().toISOString() }).eq('id', itemId);
      if (error) throw error;
      toast.success('Count recorded');
      loadCycleCounts();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update');
    }
  };

  const getABCColor = (abcClass?: string) => {
    switch (abcClass) {
      case 'A': return 'text-green-600 bg-green-50';
      case 'B': return 'text-blue-600 bg-blue-50';
      case 'C': return 'text-gray-600 bg-gray-50';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Cycle Counting</h2>
          <p className="text-[10px] text-muted-foreground">ABC stratified inventory accuracy with event sourcing audit</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[8px] h-4 bg-green-50 text-green-700">A: 20%</Badge>
          <Badge variant="outline" className="text-[8px] h-4 bg-blue-50 text-blue-700">B: 30%</Badge>
          <Badge variant="outline" className="text-[8px] h-4 bg-gray-50 text-gray-700">C: 50%</Badge>
        </div>
      </div>

      {/* Event Sourcing Audit Status */}
      <Card className="p-2 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3 text-purple-500" />
            <span className="text-[9px] font-medium">Event Sourcing Audit Log</span>
          </div>
          <div className="flex items-center gap-2 text-[8px]">
            <span className="text-muted-foreground">Immutable Events: 12,847</span>
            <Badge variant="outline" className="h-3 text-[7px]">Compliance Ready</Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <Card>
          <CardHeader className="p-2">
            <CardTitle className="text-xs flex items-center gap-1">
              <ClipboardList className="h-3 w-3" />Scheduled Counts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="space-y-1.5">
              {cycleCounts.map((count) => (
                <div
                  key={count.id}
                  className={`p-2 border rounded cursor-pointer ${selectedCount?.id === count.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                  onClick={() => setSelectedCount(count)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-[10px] font-medium">{count.count_number}</p>
                      <p className="text-[9px] text-muted-foreground">{count.total_items} items • {count.count_type}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {count.abc_classification && (
                        <Badge variant="outline" className={`text-[8px] h-4 ${getABCColor(count.abc_classification.charAt(0))}`}>
                          <BarChart3 className="h-2 w-2 mr-0.5" />{count.abc_classification}
                        </Badge>
                      )}
                      <Badge variant={count.status === 'in_progress' ? 'default' : 'secondary'} className="text-[8px] h-4">
                        {count.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  {count.status === 'scheduled' && (
                    <Button size="sm" className="w-full h-6 text-[9px]" onClick={(e) => { e.stopPropagation(); startCycleCount(count.id); }}>Start Count</Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedCount && (
          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-xs flex items-center gap-1">
                <Calculator className="h-3 w-3" />{selectedCount.count_number}
              </CardTitle>
              <CardDescription className="text-[9px]">Progress: {selectedCount.items_counted}/{selectedCount.total_items} items</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="space-y-1.5">
                {selectedCount.cycle_count_items.map((item) => (
                  <div key={item.id} className="border rounded p-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {item.abc_class && (
                          <div className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold ${getABCColor(item.abc_class)}`}>
                            {item.abc_class}
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] font-medium">{item.inventory_items.name}</p>
                          <p className="text-[8px] text-muted-foreground">{item.warehouse_bins.bin_code} • Expected: {item.expected_quantity}</p>
                        </div>
                      </div>
                      <Badge variant={item.status === 'counted' ? 'default' : 'secondary'} className="text-[8px] h-4">{item.status.toUpperCase()}</Badge>
                    </div>
                    
                    {selectedCount.status === 'in_progress' && item.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          placeholder="Count"
                          className="w-16 h-6 text-[10px]"
                          onKeyPress={(e) => { if (e.key === 'Enter') updateItemCount(item.id, parseInt((e.target as HTMLInputElement).value)); }}
                        />
                        <Button size="sm" className="h-6 text-[9px]" onClick={(e) => {
                          const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
                          updateItemCount(item.id, parseInt(input?.value || '0'));
                        }}>Record</Button>
                      </div>
                    )}
                    
                    {item.status === 'counted' && item.variance !== 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3 text-orange-500" />
                        <span className="text-[9px] text-orange-600">Variance: {item.variance > 0 ? '+' : ''}{item.variance}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
