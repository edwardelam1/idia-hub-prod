import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, Camera, CheckCircle, Package, Scan, Truck, Barcode, Timer,
  Plus, ShieldAlert, Eye, EyeOff, RotateCcw, Ban, XCircle, Scale
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";
import { autoJournalEntry } from "@/lib/gl-engine";
import { toast } from "sonner";

interface POLineItem {
  id: string;
  inventory_item_id: string | null;
  sku: string;
  gtin: string;
  item_name: string;
  ordered_quantity: number;
  received_quantity: number;
  unit_cost: number;
  invoice_unit_cost: number;
  received_uom: string;
  lot_number: string;
  expiration_date: string | null;
  ppv_amount: number;
  status: string;
  // joined from inventory_items
  item_uom?: string;
  requires_batch_tracking?: boolean;
  minimum_shelf_life_days?: number;
  tolerance_variance_pct?: number;
}

interface PurchaseOrder {
  id: string;
  business_id: string;
  location_id: string | null;
  supplier_id: string | null;
  po_number: string;
  status: string;
  expected_delivery_date: string | null;
  total_amount: number;
  invoice_amount: number;
  invoice_status: string;
  notes: string;
  supplier_name?: string;
  line_items: POLineItem[];
}

type ReceivingLineState = {
  entered_qty: number | '';
  recount_attempt: number;
  lot_number: string;
  expiration_date: string;
  invoice_unit_cost: number | '';
  damaged_qty: number;
  status: 'pending' | 'counted' | 'recount' | 'manager_override' | 'received' | 'rejected';
};

export const ReceivingModule = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [blindMode, setBlindMode] = useState(true);
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [lineStates, setLineStates] = useState<Record<string, ReceivingLineState>>({});
  const [loading, setLoading] = useState(true);
  const [isCreatePOOpen, setIsCreatePOOpen] = useState(false);
  const [uomGateOpen, setUomGateOpen] = useState(false);
  const [uomGateData, setUomGateData] = useState<{ lineId: string; baseUom: string; receivedUom: string; conversionFactor: number }>({ lineId: '', baseUom: '', receivedUom: '', conversionFactor: 1 });
  const [managerOverrideOpen, setManagerOverrideOpen] = useState(false);
  const [overrideLineId, setOverrideLineId] = useState('');
  const [shelfLifeRejectOpen, setShelfLifeRejectOpen] = useState(false);
  const [shelfLifeRejectItem, setShelfLifeRejectItem] = useState('');

  const loadPurchaseOrders = useCallback(async () => {
    setLoading(true);
    try {
      const businessId = await getBusinessId();
      const { data: poData, error } = await supabase
        .from('purchase_orders' as any)
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error || !poData) { setPurchaseOrders([]); setLoading(false); return; }

      // Load suppliers for names
      const { data: suppliers } = await supabase.from('suppliers').select('id, name');
      const supplierMap = new Map((suppliers || []).map((s: any) => [s.id, s.name]));

      const pos: PurchaseOrder[] = [];
      for (const po of poData as any[]) {
        const { data: lines } = await supabase
          .from('purchase_order_line_items' as any)
          .select('*')
          .eq('purchase_order_id', po.id);

        // Enrich lines with inventory_item data
        const enrichedLines: POLineItem[] = [];
        for (const line of (lines || []) as any[]) {
          let itemUom = '', reqBatch = false, minShelf = 0, tolVar = 5;
          if (line.inventory_item_id) {
            const { data: invItem } = await supabase
              .from('inventory_items')
              .select('unit_of_measure, requires_batch_tracking, minimum_shelf_life_days, tolerance_variance_pct')
              .eq('id', line.inventory_item_id)
              .single();
            if (invItem) {
              itemUom = invItem.unit_of_measure;
              reqBatch = (invItem as any).requires_batch_tracking || false;
              minShelf = (invItem as any).minimum_shelf_life_days || 0;
              tolVar = (invItem as any).tolerance_variance_pct || 5;
            }
          }
          enrichedLines.push({
            ...line,
            item_uom: itemUom,
            requires_batch_tracking: reqBatch,
            minimum_shelf_life_days: minShelf,
            tolerance_variance_pct: tolVar,
          });
        }

        pos.push({
          ...po,
          supplier_name: supplierMap.get(po.supplier_id) || 'Unknown Supplier',
          line_items: enrichedLines,
        });
      }
      setPurchaseOrders(pos);
    } catch (err) {
      console.error('Error loading POs:', err);
      setPurchaseOrders([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadPurchaseOrders(); }, [loadPurchaseOrders]);

  // Initialize line states when PO selected
  useEffect(() => {
    if (!selectedPO) return;
    const states: Record<string, ReceivingLineState> = {};
    for (const line of selectedPO.line_items) {
      states[line.id] = {
        entered_qty: '',
        recount_attempt: 0,
        lot_number: line.lot_number || '',
        expiration_date: line.expiration_date || '',
        invoice_unit_cost: line.invoice_unit_cost || '',
        damaged_qty: 0,
        status: line.status === 'received' ? 'received' : 'pending',
      };
    }
    setLineStates(states);
  }, [selectedPO]);

  const updateLineState = (lineId: string, patch: Partial<ReceivingLineState>) => {
    setLineStates(prev => ({ ...prev, [lineId]: { ...prev[lineId], ...patch } }));
  };

  // ==================== BLIND COUNT LOGIC ====================
  const handleBlindCount = (lineId: string, line: POLineItem) => {
    const state = lineStates[lineId];
    if (!state || state.entered_qty === '') return;
    const qty = Number(state.entered_qty);

    if (qty === line.ordered_quantity) {
      // exact match — close line
      updateLineState(lineId, { status: 'counted' });
      toast.success(`${line.item_name}: count matches PO`);
    } else {
      if (state.recount_attempt === 0) {
        // first failure — recount without showing delta
        updateLineState(lineId, { recount_attempt: 1, status: 'recount', entered_qty: '' });
        toast.warning(`${line.item_name}: recount required — please count again`);
      } else {
        // second failure — escalate to manager
        updateLineState(lineId, { status: 'manager_override' });
        setOverrideLineId(lineId);
        setManagerOverrideOpen(true);
      }
    }
  };

  // ==================== TOLERANCE GATING ====================
  const checkToleranceAndReceive = async (lineId: string, line: POLineItem) => {
    const state = lineStates[lineId];
    const qty = Number(state.entered_qty);
    if (qty <= 0) return;

    // Shelf-life viability gate
    if (line.requires_batch_tracking) {
      if (!state.lot_number || !state.expiration_date) {
        toast.error(`${line.item_name}: Lot number and expiration date are required`);
        return;
      }
      const daysRemaining = Math.floor((new Date(state.expiration_date).getTime() - Date.now()) / 86400000);
      if (daysRemaining < (line.minimum_shelf_life_days || 0)) {
        setShelfLifeRejectItem(line.item_name);
        setShelfLifeRejectOpen(true);
        return;
      }
    }

    const tolerance = (line.tolerance_variance_pct || 5) / 100;
    const maxQty = line.ordered_quantity * (1 + tolerance);
    const diff = qty - line.ordered_quantity;

    if (qty < line.ordered_quantity) {
      // Short-ship — soft gate
      await logDiscrepancy(lineId, 'shortage', `Short-shipped by ${Math.abs(diff)} units`, diff, 0);
      toast.warning(`${line.item_name}: short-ship of ${Math.abs(diff)} units flagged as backordered`);
    } else if (qty > maxQty) {
      // Over-ship exceeding tolerance — hard gate
      setOverrideLineId(lineId);
      setManagerOverrideOpen(true);
      await logDiscrepancy(lineId, 'overage', `Over-shipped by ${diff} units (exceeds ${line.tolerance_variance_pct}% tolerance)`, diff, 0);
      return; // block until manager approves
    }

    // PPV check
    const invoiceCost = Number(state.invoice_unit_cost) || 0;
    if (invoiceCost > 0 && invoiceCost !== line.unit_cost) {
      const ppv = (invoiceCost - line.unit_cost) * qty;
      await logDiscrepancy(lineId, 'ppv_exception', `PPV: invoice $${invoiceCost} vs PO $${line.unit_cost}`, 0, ppv);
      toast.info(`${line.item_name}: Purchase Price Variance of $${ppv.toFixed(2)} logged`);
    }

    await finalizeReceiveLine(lineId, line, qty, state);
  };

  const finalizeReceiveLine = async (lineId: string, line: POLineItem, qty: number, state: ReceivingLineState) => {
    try {
      const businessId = await getBusinessId();
      const availableQty = qty - state.damaged_qty;

      // Update PO line item
      await supabase
        .from('purchase_order_line_items' as any)
        .update({
          received_quantity: qty,
          lot_number: state.lot_number,
          expiration_date: state.expiration_date || null,
          invoice_unit_cost: Number(state.invoice_unit_cost) || 0,
          ppv_amount: (Number(state.invoice_unit_cost) || line.unit_cost) !== line.unit_cost
            ? ((Number(state.invoice_unit_cost) || line.unit_cost) - line.unit_cost) * qty : 0,
          status: 'received',
        } as any)
        .eq('id', lineId);

      // Update inventory: Available qty
      if (line.inventory_item_id && availableQty > 0) {
        // Get current stock for weighted average cost
        const { data: currentItem } = await supabase
          .from('inventory_items')
          .select('current_stock, current_cost')
          .eq('id', line.inventory_item_id)
          .single();

        const oldStock = (currentItem as any)?.current_stock || 0;
        const oldCost = (currentItem as any)?.current_cost || 0;
        const newStock = oldStock + availableQty;
        const weightedCost = newStock > 0
          ? ((oldStock * oldCost) + (availableQty * line.unit_cost)) / newStock
          : line.unit_cost;

        await supabase
          .from('inventory_items')
          .update({
            current_stock: newStock,
            current_cost: Math.round(weightedCost * 100) / 100,
            inventory_state: 'Available',
          } as any)
          .eq('id', line.inventory_item_id);

        // Inventory history
        await supabase.from('inventory_history').insert({
          business_id: businessId,
          inventory_item_id: line.inventory_item_id,
          item_name: line.item_name,
          quantity: availableQty,
          unit: line.received_uom || line.item_uom || 'units',
          action: 'received',
          note: `Received via PO ${selectedPO?.po_number}`,
        } as any);
      }

      // Damaged qty → Quarantined
      if (line.inventory_item_id && state.damaged_qty > 0) {
        await logDiscrepancy(lineId, 'damage', `${state.damaged_qty} units flagged as damaged → Quarantined`, state.damaged_qty, 0);
        await supabase.from('inventory_history').insert({
          business_id: businessId,
          inventory_item_id: line.inventory_item_id,
          item_name: line.item_name,
          quantity: state.damaged_qty,
          unit: line.item_uom || 'units',
          action: 'quarantined',
          note: `Damaged goods quarantined from PO ${selectedPO?.po_number}`,
        } as any);
      }

      // GL Accrual: Debit Inventory Asset / Credit Accrued Liabilities
      const totalCost = availableQty * line.unit_cost;
      if (totalCost > 0) {
        await autoJournalEntry(
          businessId,
          'PO_Receipt_Accrual',
          totalCost,
          `Goods receipt: ${line.item_name} (${availableQty} units) via ${selectedPO?.po_number}`,
          line.inventory_item_id || undefined,
          selectedPO?.id,
          'purchase_order'
        );
      }

      updateLineState(lineId, { status: 'received' });
      toast.success(`${line.item_name}: ${availableQty} units received successfully`);
    } catch (err) {
      console.error('Error finalizing receive:', err);
      toast.error('Failed to finalize receipt');
    }
  };

  const logDiscrepancy = async (lineId: string, type: string, description: string, qtyVar: number, costVar: number) => {
    try {
      await supabase.from('receiving_discrepancies' as any).insert({
        purchase_order_id: selectedPO?.id,
        purchase_order_line_item_id: lineId,
        discrepancy_type: type,
        description,
        quantity_variance: qtyVar,
        cost_variance: costVar,
        resolution_status: 'open',
      } as any);
    } catch (err) {
      console.error('Discrepancy log error:', err);
    }
  };

  const handleManagerOverride = async () => {
    if (!overrideLineId || !selectedPO) return;
    const line = selectedPO.line_items.find(l => l.id === overrideLineId);
    const state = lineStates[overrideLineId];
    if (!line || !state) return;

    await logDiscrepancy(overrideLineId, 'overage', `Manager override approved for qty ${state.entered_qty}`, Number(state.entered_qty) - line.ordered_quantity, 0);
    updateLineState(overrideLineId, { status: 'counted' });
    setManagerOverrideOpen(false);

    // If this was from blind count, mark as counted; if from tolerance, finalize
    const qty = Number(state.entered_qty);
    if (qty > 0) {
      await finalizeReceiveLine(overrideLineId, line, qty, state);
    }
  };

  // Barcode scanner
  const processBarcodeScan = (barcode: string) => {
    if (!selectedPO) return;
    let parsedGtin = barcode;
    const gtinMatch = barcode.match(/01(\d{14})/);
    if (gtinMatch) parsedGtin = gtinMatch[1];

    const matched = selectedPO.line_items.find(
      item => item.sku === barcode || item.gtin === barcode || item.gtin === parsedGtin
    );
    if (matched) {
      const prev = lineStates[matched.id]?.entered_qty || 0;
      updateLineState(matched.id, { entered_qty: Number(prev) + 1 });
      toast.success(`Scanned: ${matched.item_name}`);
    } else {
      toast.error('Item not found in this PO');
    }
    setScanInput('');
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      draft: { variant: 'outline', label: 'DRAFT' },
      submitted: { variant: 'secondary', label: 'SUBMITTED' },
      in_transit: { variant: 'default', label: 'IN TRANSIT' },
      partially_received: { variant: 'secondary', label: 'PARTIAL' },
      received: { variant: 'default', label: 'RECEIVED' },
      closed: { variant: 'outline', label: 'CLOSED' },
    };
    const cfg = map[status] || { variant: 'outline' as const, label: status.toUpperCase() };
    return <Badge variant={cfg.variant} className="text-[8px] h-4">{cfg.label}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading purchase orders...</div>;
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Enterprise Receiving</h2>
          <p className="text-[10px] text-muted-foreground">Gated intake with blind counts, tolerance, PPV, shelf-life & GL accrual</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Switch checked={blindMode} onCheckedChange={setBlindMode} />
            <Label className="text-[10px] flex items-center gap-1">
              {blindMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {blindMode ? 'Blind' : 'Directed'}
            </Label>
          </div>
          <Button onClick={() => setScanMode(!scanMode)} variant={scanMode ? "destructive" : "default"} size="sm" className="h-7 text-xs">
            <Scan className="mr-1 h-3 w-3" />{scanMode ? 'Stop' : 'Scan'}
          </Button>
          <Button onClick={() => setIsCreatePOOpen(true)} size="sm" className="h-7 text-xs">
            <Plus className="mr-1 h-3 w-3" />New PO
          </Button>
        </div>
      </div>

      {/* Scanner */}
      {scanMode && (
        <Card className="border-primary bg-primary/5 p-2">
          <div className="flex items-center gap-1 mb-1">
            <Barcode className="h-3 w-3" />
            <span className="text-[10px] font-medium">GS1 Barcode Scanner (AI 01, 10, 17, 21)</span>
          </div>
          <div className="flex gap-1">
            <Input placeholder="Scan GTIN, SKU, or GS1-128..." value={scanInput} onChange={(e) => setScanInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && processBarcodeScan(scanInput)} className="h-7 text-xs" autoFocus />
            <Button onClick={() => processBarcodeScan(scanInput)} size="sm" className="h-7 text-xs">Go</Button>
          </div>
        </Card>
      )}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* PO List */}
        <Card>
          <CardHeader className="p-2">
            <CardTitle className="text-xs flex items-center gap-1">
              <Truck className="h-3 w-3" />Purchase Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 pt-0">
            {purchaseOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No purchase orders found. Create one to start receiving.
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-1.5">
                  {purchaseOrders.map((po) => (
                    <div
                      key={po.id}
                      className={`p-2 border rounded cursor-pointer transition-colors ${selectedPO?.id === po.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                      onClick={() => setSelectedPO(po)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-medium">{po.po_number || 'No PO#'}</p>
                          <p className="text-[9px] text-muted-foreground">{po.supplier_name}</p>
                          <p className="text-[8px] text-muted-foreground">{po.line_items.length} line items</p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(po.status)}
                          {po.expected_delivery_date && (
                            <p className="text-[8px] text-muted-foreground mt-0.5">
                              {new Date(po.expected_delivery_date).toLocaleDateString()}
                            </p>
                          )}
                          <Badge variant={po.invoice_status === 'matched' ? 'default' : 'outline'} className="text-[7px] h-3 mt-0.5">
                            {po.invoice_status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Receiving Detail */}
        {selectedPO && (
          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-xs flex items-center gap-1">
                <Package className="h-3 w-3" />{selectedPO.po_number}
                <span className="ml-1 text-[8px] font-normal text-muted-foreground">
                  ({blindMode ? 'Blind Receiving' : 'Directed Receiving'})
                </span>
              </CardTitle>
              <CardDescription className="text-[9px]">{selectedPO.supplier_name}</CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {selectedPO.line_items.map((line) => {
                    const state = lineStates[line.id];
                    if (!state) return null;
                    const isReceived = state.status === 'received';

                    return (
                      <div key={line.id} className={`border rounded p-2 ${isReceived ? 'bg-muted/30 opacity-70' : ''}`}>
                        {/* Line header */}
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <p className="text-[10px] font-medium">{line.item_name}</p>
                            <div className="flex items-center gap-2 text-[8px] text-muted-foreground">
                              {line.sku && <span>SKU: {line.sku}</span>}
                              {line.gtin && <span>GTIN: {line.gtin}</span>}
                              <span>${line.unit_cost}/unit</span>
                            </div>
                          </div>
                          <div className="text-right">
                            {blindMode ? (
                              <Badge variant="outline" className="text-[8px] h-4">
                                <EyeOff className="w-2.5 h-2.5 mr-0.5" />BLIND
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[8px] h-4">
                                Ordered: {line.ordered_quantity}
                              </Badge>
                            )}
                            {isReceived && (
                              <Badge variant="default" className="text-[8px] h-4 ml-1">
                                <CheckCircle className="w-2.5 h-2.5 mr-0.5" />RECEIVED
                              </Badge>
                            )}
                            {state.status === 'recount' && (
                              <Badge variant="destructive" className="text-[8px] h-4 ml-1">
                                <RotateCcw className="w-2.5 h-2.5 mr-0.5" />RECOUNT
                              </Badge>
                            )}
                          </div>
                        </div>

                        {!isReceived && (
                          <>
                            {/* Batch tracking fields */}
                            {line.requires_batch_tracking && (
                              <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                                <div>
                                  <Label className="text-[8px]">Lot Number *</Label>
                                  <Input
                                    value={state.lot_number}
                                    onChange={(e) => updateLineState(line.id, { lot_number: e.target.value })}
                                    className="h-6 text-[10px]"
                                    placeholder="LOT-XXXX"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[8px]">Expiration Date *</Label>
                                  <Input
                                    type="date"
                                    value={state.expiration_date}
                                    onChange={(e) => updateLineState(line.id, { expiration_date: e.target.value })}
                                    className="h-6 text-[10px]"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Qty + invoice cost + damaged */}
                            <div className="grid grid-cols-4 gap-1.5 mb-1.5">
                              <div>
                                <Label className="text-[8px]">Physical Count</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={state.entered_qty}
                                  onChange={(e) => updateLineState(line.id, { entered_qty: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                                  className="h-6 text-[10px]"
                                  placeholder="Count"
                                />
                              </div>
                              <div>
                                <Label className="text-[8px]">Invoice $/unit</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={state.invoice_unit_cost}
                                  onChange={(e) => updateLineState(line.id, { invoice_unit_cost: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                                  className="h-6 text-[10px]"
                                  placeholder="$0.00"
                                />
                              </div>
                              <div>
                                <Label className="text-[8px]">Damaged</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={state.damaged_qty}
                                  onChange={(e) => updateLineState(line.id, { damaged_qty: parseInt(e.target.value) || 0 })}
                                  className="h-6 text-[10px]"
                                  placeholder="0"
                                />
                              </div>
                              <div className="flex items-end gap-1">
                                {blindMode && state.status !== 'counted' ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleBlindCount(line.id, line)}
                                    disabled={state.entered_qty === ''}
                                    className="h-6 text-[9px] px-2 w-full"
                                  >
                                    <Scale className="h-3 w-3 mr-0.5" />Verify
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => checkToleranceAndReceive(line.id, line)}
                                    disabled={state.entered_qty === '' || Number(state.entered_qty) <= 0}
                                    className="h-6 text-[9px] px-2 w-full"
                                  >
                                    <CheckCircle className="h-3 w-3 mr-0.5" />Receive
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Discrepancy quick buttons */}
                            <div className="flex gap-1">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-5 text-[8px] px-1.5">
                                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />Report Issue
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-sm">
                                  <DiscrepancyDialog lineItem={line} onSubmit={(type, desc) => logDiscrepancy(line.id, type, desc, 0, 0)} />
                                </DialogContent>
                              </Dialog>
                              {state.damaged_qty > 0 && (
                                <Badge variant="destructive" className="text-[7px] h-5">
                                  <Ban className="w-2 h-2 mr-0.5" />{state.damaged_qty} → Quarantine
                                </Badge>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Manager Override Dialog */}
      <Dialog open={managerOverrideOpen} onOpenChange={setManagerOverrideOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-1">
              <ShieldAlert className="h-4 w-4 text-destructive" />Manager Variance Override
            </DialogTitle>
            <DialogDescription className="text-xs">
              The received quantity exceeds the tolerance threshold. Manager authorization is required to accept this variance.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-1">
            <Button variant="outline" size="sm" onClick={() => setManagerOverrideOpen(false)}>Reject</Button>
            <Button size="sm" onClick={handleManagerOverride}>Authorize Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shelf-Life Rejection Dialog */}
      <Dialog open={shelfLifeRejectOpen} onOpenChange={setShelfLifeRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-1 text-destructive">
              <XCircle className="h-4 w-4" />Shelf-Life Viability Failure
            </DialogTitle>
            <DialogDescription className="text-xs">
              <strong>{shelfLifeRejectItem}</strong> has insufficient remaining shelf life below the minimum threshold.
              <br /><br />
              <strong>Action:</strong> Refuse this delivery from the vendor due to imminent spoilage risk.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" size="sm" onClick={() => setShelfLifeRejectOpen(false)}>Acknowledged — Refuse Delivery</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create PO Dialog */}
      <Dialog open={isCreatePOOpen} onOpenChange={setIsCreatePOOpen}>
        <DialogContent className="max-w-lg">
          <CreatePOForm onClose={() => { setIsCreatePOOpen(false); loadPurchaseOrders(); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ==================== Discrepancy Report Dialog ====================
const DiscrepancyDialog = ({ lineItem, onSubmit }: { lineItem: POLineItem; onSubmit: (type: string, desc: string) => void }) => {
  const [type, setType] = useState('damage');
  const [desc, setDesc] = useState('');
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-sm">Report Discrepancy</DialogTitle>
        <DialogDescription className="text-xs">{lineItem.item_name}</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="shortage">Shortage</SelectItem>
              <SelectItem value="overage">Overage</SelectItem>
              <SelectItem value="damage">Damage</SelectItem>
              <SelectItem value="wrong_item">Wrong Item</SelectItem>
              <SelectItem value="quality_issue">Quality Issue</SelectItem>
              <SelectItem value="shelf_life_reject">Shelf Life Reject</SelectItem>
              <SelectItem value="uom_mismatch">UOM Mismatch</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe issue..." className="text-xs h-16" />
        </div>
        <Button onClick={() => { onSubmit(type, desc); toast.success('Discrepancy reported'); }} className="w-full h-7 text-xs">Submit</Button>
      </div>
    </>
  );
};

// ==================== Create PO Form ====================
const CreatePOForm = ({ onClose }: { onClose: () => void }) => {
  const [poNumber, setPoNumber] = useState(`PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [inventoryItems, setInventoryItems] = useState<{ id: string; name: string; sku: string; unit_of_measure: string; current_cost: number }[]>([]);
  const [lineItems, setLineItems] = useState<{ inventory_item_id: string; item_name: string; sku: string; ordered_quantity: number; unit_cost: number }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const businessId = await getBusinessId();
      const { data: s } = await supabase.from('suppliers').select('id, name').eq('business_id', businessId).eq('is_active', true);
      setSuppliers(s || []);
      const { data: inv } = await supabase.from('inventory_items').select('id, name, unit_of_measure, current_cost').eq('business_id', businessId).eq('is_active', true);
      setInventoryItems((inv || []).map((i: any) => ({ ...i, sku: (i as any).sku || '' })));
    };
    load();
  }, []);

  const addLine = () => setLineItems(prev => [...prev, { inventory_item_id: '', item_name: '', sku: '', ordered_quantity: 1, unit_cost: 0 }]);

  const updateLine = (idx: number, patch: any) => {
    setLineItems(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  };

  const selectItem = (idx: number, itemId: string) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      updateLine(idx, { inventory_item_id: item.id, item_name: item.name, sku: item.sku, unit_cost: item.current_cost || 0 });
    }
  };

  const handleSave = async () => {
    if (!supplierId || lineItems.length === 0) {
      toast.error('Select a supplier and add at least one line item');
      return;
    }
    setSaving(true);
    try {
      const businessId = await getBusinessId();
      const total = lineItems.reduce((s, l) => s + l.ordered_quantity * l.unit_cost, 0);

      const { data: po, error } = await supabase
        .from('purchase_orders' as any)
        .insert({
          business_id: businessId,
          supplier_id: supplierId,
          po_number: poNumber,
          status: 'submitted',
          expected_delivery_date: expectedDate || null,
          total_amount: total,
          notes,
        } as any)
        .select()
        .single();

      if (error || !po) throw error;

      for (const line of lineItems) {
        await supabase.from('purchase_order_line_items' as any).insert({
          purchase_order_id: (po as any).id,
          inventory_item_id: line.inventory_item_id || null,
          item_name: line.item_name,
          sku: line.sku,
          ordered_quantity: line.ordered_quantity,
          unit_cost: line.unit_cost,
        } as any);
      }

      toast.success('Purchase Order created');
      onClose();
    } catch (err) {
      console.error('Error creating PO:', err);
      toast.error('Failed to create Purchase Order');
    }
    setSaving(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-sm">Create Purchase Order</DialogTitle>
        <DialogDescription className="text-xs">Create a new PO linked to a supplier and inventory items</DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">PO Number</Label>
            <Input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className="h-7 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Supplier *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Expected Delivery</Label>
            <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="h-7 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="h-7 text-xs" placeholder="Optional notes" />
          </div>
        </div>

        <Separator />
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Line Items</Label>
          <Button size="sm" variant="outline" onClick={addLine} className="h-6 text-[9px]">
            <Plus className="h-3 w-3 mr-0.5" />Add Line
          </Button>
        </div>

        {lineItems.map((line, idx) => (
          <div key={idx} className="grid grid-cols-4 gap-2 items-end">
            <div className="col-span-2 space-y-1">
              <Label className="text-[8px]">Item</Label>
              <Select value={line.inventory_item_id} onValueChange={(v) => selectItem(idx, v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {inventoryItems.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[8px]">Qty</Label>
              <Input type="number" min="1" value={line.ordered_quantity} onChange={(e) => updateLine(idx, { ordered_quantity: parseInt(e.target.value) || 1 })} className="h-7 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[8px]">$/Unit</Label>
              <Input type="number" step="0.01" value={line.unit_cost} onChange={(e) => updateLine(idx, { unit_cost: parseFloat(e.target.value) || 0 })} className="h-7 text-xs" />
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create PO'}</Button>
        </div>
      </div>
    </>
  );
};
