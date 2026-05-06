import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package, Coffee, Milk, Croissant, Coffee as CoffeeSupplies,
  TrendingUp, TrendingDown, BarChart3, ShoppingCart, Save
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  totalValue,
  totalVolume,
  stockPercentage,
  reorderQuantity,
  formatCurrency,
  formatNumber,
} from "@/lib/calculator";
import { type UOMUnit } from "@/lib/uom-engine";

const CATEGORIES = [
  "Coffee", "Dairy", "Pastry", "Supplies", "Food", "Beverage",
  "Meat", "Seafood", "Produce", "Dry Goods", "Packaging"
];

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  gtin?: string;
  description?: string;
  category: string;
  current_stock: number;
  par_level: number;
  reorder_point: number;
  unit_of_measure: string;
  cost_per_unit: number;
  supplier: string;
  supplier_id?: string | null;
  last_ordered: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked';
  trend: 'up' | 'down' | 'stable';
  individual_unit_size?: number;
  individual_unit_uom?: string;
  total_unit_count?: number;
  requires_serialization?: boolean;
  requires_batch_tracking?: boolean;
  minimum_shelf_life_days?: number;
  tolerance_variance_pct?: number;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface InventoryItemModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updated: Partial<InventoryItem> & { id: string }) => void;
  uomUnits?: UOMUnit[];
  suppliers?: SupplierOption[];
}

export const InventoryItemModal = ({ item, isOpen, onClose, onSave, uomUnits = [], suppliers = [] }: InventoryItemModalProps) => {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [gtin, setGtin] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Supplies");
  const [currentStock, setCurrentStock] = useState(0);
  const [parLevel, setParLevel] = useState(0);
  const [reorderPoint, setReorderPoint] = useState(0);
  const [unitOfMeasure, setUnitOfMeasure] = useState("units");
  const [costPerUnit, setCostPerUnit] = useState(0);
  const [supplierId, setSupplierId] = useState("");
  const [individualUnitSize, setIndividualUnitSize] = useState(0);
  const [individualUnitUom, setIndividualUnitUom] = useState("");
  const [totalUnitCount, setTotalUnitCount] = useState(0);
  const [requiresSerialization, setRequiresSerialization] = useState(false);
  const [requiresBatchTracking, setRequiresBatchTracking] = useState(false);
  const [minimumShelfLifeDays, setMinimumShelfLifeDays] = useState(0);
  const [toleranceVariancePct, setToleranceVariancePct] = useState(5);

  useEffect(() => {
    if (item) {
      setName(item.name || "");
      setSku(item.sku || "");
      setGtin(item.gtin || "");
      setDescription(item.description || "");
      setCategory(item.category || "Supplies");
      setCurrentStock(item.current_stock ?? 0);
      setParLevel(item.par_level ?? 0);
      setReorderPoint(item.reorder_point ?? 0);
      setUnitOfMeasure(item.unit_of_measure || "units");
      setCostPerUnit(item.cost_per_unit ?? 0);
      setSupplierId(item.supplier_id || "");
      setIndividualUnitSize(item.individual_unit_size ?? 0);
      setIndividualUnitUom(item.individual_unit_uom || "");
      setTotalUnitCount(item.total_unit_count ?? 0);
      setRequiresSerialization(item.requires_serialization ?? false);
      setRequiresBatchTracking(item.requires_batch_tracking ?? false);
      setMinimumShelfLifeDays(item.minimum_shelf_life_days ?? 0);
      setToleranceVariancePct(item.tolerance_variance_pct ?? 5);
    }
  }, [item]);

  if (!item) return null;

  // Calculator-backed derived values
  const calcTotalValue = totalValue(currentStock, costPerUnit);
  const calcStockPct = stockPercentage(currentStock, reorderPoint);
  const hasUnitSize = individualUnitSize > 0 && !!individualUnitUom;
  const calcTotalVolume = hasUnitSize ? totalVolume(currentStock, individualUnitSize) : 0;
  const calcReorderQty = reorderQuantity(currentStock, reorderPoint);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'default';
      case 'low_stock': return 'warning';
      case 'out_of_stock': return 'destructive';
      case 'overstocked': return 'secondary';
      default: return 'default';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-destructive" />;
      default: return <BarChart3 className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'coffee': return <Coffee className="w-6 h-6" />;
      case 'dairy': return <Milk className="w-6 h-6" />;
      case 'pastry': return <Croissant className="w-6 h-6" />;
      case 'supplies': return <CoffeeSupplies className="w-6 h-6" />;
      default: return <Package className="w-6 h-6" />;
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        id: item.id,
        name,
        sku,
        gtin,
        description,
        category,
        current_stock: currentStock,
        par_level: parLevel,
        reorder_point: reorderPoint,
        unit_of_measure: unitOfMeasure,
        cost_per_unit: costPerUnit,
        supplier_id: supplierId || null,
        individual_unit_size: individualUnitSize,
        individual_unit_uom: individualUnitUom,
        total_unit_count: totalUnitCount,
        requires_serialization: requiresSerialization,
        requires_batch_tracking: requiresBatchTracking,
        minimum_shelf_life_days: minimumShelfLifeDays,
        tolerance_variance_pct: toleranceVariancePct,
      });
    }
    toast({ title: "Item Updated", description: `${name} has been updated` });
    onClose();
  };

  const handleQuickOrder = () => {
    toast({
      title: "Order Placed",
      description: `Ordered ${calcReorderQty} ${unitOfMeasure} of ${name}`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center space-x-3">
            {getCategoryIcon(category)}
            <div>
              <div className="font-semibold">{name}</div>
              <div className="text-sm text-muted-foreground flex items-center space-x-2 mt-1">
                <Badge variant="outline">{category}</Badge>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(item.trend)}
                  <Badge variant={getStatusColor(item.status) as any}>
                    {item.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>Edit item details — all fields persist to the item profile</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          <div className="space-y-5 pb-4">
            {/* Stock Level Progress */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Stock Level</span>
                <span className="font-medium">
                  {formatNumber(currentStock, 0)} / {formatNumber(reorderPoint, 0)} {unitOfMeasure} ({formatNumber(calcStockPct, 1)}%)
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    currentStock < reorderPoint ? 'bg-destructive' :
                    calcStockPct < 50 ? 'bg-warning' : 'bg-success'
                  }`}
                  style={{ width: `${calcStockPct}%` }}
                />
              </div>
            </div>

            {/* Computed Totals */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Total Inventory Value</div>
                <div className="text-lg font-bold">{formatCurrency(calcTotalValue)}</div>
                <div className="text-[10px] text-muted-foreground">
                  {formatNumber(currentStock, 0)} × {formatCurrency(costPerUnit)}
                </div>
              </div>
              {hasUnitSize && (
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-xs text-muted-foreground">Total Volume / Weight</div>
                  <div className="text-lg font-bold">{formatNumber(calcTotalVolume, 2)} {individualUnitUom}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatNumber(currentStock, 0)} × {formatNumber(individualUnitSize, 2)} {individualUnitUom}
                  </div>
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-xs text-muted-foreground">Reorder Quantity</div>
                <div className="text-lg font-bold">{formatNumber(calcReorderQty, 0)} {unitOfMeasure}</div>
                <div className="text-[10px] text-muted-foreground">
                  Par {formatNumber(reorderPoint, 0)} − Case Count {formatNumber(currentStock, 0)}
                </div>
              </div>
            </div>

            <Separator />

            {/* Row 1: Name, SKU, GTIN — matches Add form */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Item Name *</Label>
                <Input id="edit-name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-sku">SKU</Label>
                <Input id="edit-sku" value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. COF-PRM-001" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-gtin">GTIN / Barcode</Label>
                <Input id="edit-gtin" value={gtin} onChange={e => setGtin(e.target.value)} placeholder="e.g. 00012345678905" />
              </div>
            </div>

            {/* Row 2: Description — matches Add form (Textarea) */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea id="edit-desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Item description, notes, specifications..." rows={2} />
            </div>

            {/* Row 3: Category (dropdown), Stock Unit (dropdown), Supplier (dropdown) — matches Add form */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stock Unit</Label>
                <Select value={unitOfMeasure} onValueChange={setUnitOfMeasure}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {uomUnits.length > 0 ? (
                      uomUnits.map(u => (
                        <SelectItem key={u.id} value={u.unit_abbrev}>
                          {u.unit_name} ({u.unit_abbrev})
                        </SelectItem>
                      ))
                    ) : (
                      <>
                    <SelectItem value="units">Units</SelectItem>
                    <SelectItem value="lbs">Pounds</SelectItem>
                    <SelectItem value="gallons">Gallons</SelectItem>
                    <SelectItem value="cartons">Cartons</SelectItem>
                    <SelectItem value="pallets">Pallets</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select value={supplierId || 'none'} onValueChange={v => setSupplierId(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: Unit Size, Unit Size UOM (dropdown), Pack Count — matches Add form */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Unit Size</Label>
                <Input type="number" step="0.01" value={individualUnitSize} onChange={e => setIndividualUnitSize(parseFloat(e.target.value) || 0)} min="0" placeholder="e.g. 10" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Size UOM</Label>
                <Select value={individualUnitUom || 'none'} onValueChange={v => setIndividualUnitUom(v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="e.g. ml" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {uomUnits.length > 0 ? (
                      uomUnits.map(u => (
                        <SelectItem key={u.id} value={u.unit_abbrev}>
                          {u.unit_name} ({u.unit_abbrev})
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="ml">Milliliters</SelectItem>
                        <SelectItem value="oz">Ounces</SelectItem>
                        <SelectItem value="g">Grams</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pack Count</Label>
                <Input type="number" value={totalUnitCount} onChange={e => setTotalUnitCount(parseInt(e.target.value) || 0)} min="0" placeholder="e.g. 12 per case" />
              </div>
            </div>

            {/* Row 5: Case Count, QOH (disabled), Par Level, Cost */}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Case Count</Label>
                <Input type="number" value={currentStock} onChange={e => { const v = Number(e.target.value); setCurrentStock(v); setParLevel(v); }} min="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity On Hand <span className="text-xs text-muted-foreground">(live)</span></Label>
                <Input type="number" value={currentStock} disabled className="bg-muted cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label>Par Level</Label>
                <Input type="number" value={reorderPoint} onChange={e => setReorderPoint(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Cost per Unit ($)</Label>
                <Input type="number" step="0.01" value={costPerUnit} onChange={e => setCostPerUnit(Number(e.target.value))} />
              </div>
            </div>

            {/* Row 6: Tolerance & Shelf Life — matches Add form */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Tolerance Variance %</Label>
                <Input type="number" step="0.1" value={toleranceVariancePct} onChange={e => setToleranceVariancePct(parseFloat(e.target.value) || 5.0)} min="0" max="100" />
              </div>
              {requiresBatchTracking && (
                <div className="space-y-1.5">
                  <Label>Min Shelf Life (days)</Label>
                  <Input type="number" value={minimumShelfLifeDays} onChange={e => setMinimumShelfLifeDays(Number(e.target.value))} min="0" />
                </div>
              )}
            </div>

            {/* Row 7: Tracking toggles — matches Add form */}
            <div className="flex items-center gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Switch checked={requiresSerialization} onCheckedChange={setRequiresSerialization} />
                <Label>Serial Tracking</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={requiresBatchTracking} onCheckedChange={setRequiresBatchTracking} />
                <Label>Batch/Lot Tracking</Label>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t gap-2">
          {currentStock <= reorderPoint && (
            <Button variant="outline" onClick={handleQuickOrder} size="sm">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Quick Order ({formatNumber(calcReorderQty, 0)} {unitOfMeasure})
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose} size="sm">Cancel</Button>
          <Button onClick={handleSave} size="sm">
            <Save className="w-4 h-4 mr-2" />Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
