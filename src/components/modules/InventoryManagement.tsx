import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";
import { Package, Plus, Zap, Truck, MapPin, Layers, FileText, History, Upload, Loader2, FileUp, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InventoryItemModal } from "./InventoryItemModal";
import { loadUOMData, type UOMUnit } from "@/lib/uom-engine";
import { pushAIError } from "@/lib/ai-error-bus";
import { roundTo } from "@/lib/calculator";
import { ProductsTab, type InventoryProduct } from "./inventory/ProductsTab";
import { VendorsTab } from "./inventory/VendorsTab";
import { LocationsTab } from "./inventory/LocationsTab";
import { LotsPositionsTab } from "./inventory/LotsPositionsTab";
import { TransactionLedgerTab } from "./inventory/TransactionLedgerTab";
import { InventoryHistoryTab } from "./inventory/InventoryHistoryTab";

interface ParsedItem {
  name: string;
  sku: string;
  gtin: string;
  category: string;
  quantity: number;
  unit_of_measure: string;
  cost_per_unit: number;
  selected: boolean;
}

interface SupplierOption {
  id: string;
  name: string;
}

export const InventoryManagement = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryProduct[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("products");
  const [uomUnits, setUomUnits] = useState<UOMUnit[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importParsing, setImportParsing] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [importInserting, setImportInserting] = useState(false);
  const [parsedVendor, setParsedVendor] = useState<{ vendor_name: string; vendor_contact?: string; vendor_phone?: string; vendor_email?: string } | null>(null);
  const [duplicateVendorDialogOpen, setDuplicateVendorDialogOpen] = useState(false);
  const [pendingVendorName, setPendingVendorName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadInventoryItems();
    loadUOMData().then(({ units }) => setUomUnits(units));
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const businessId = await getBusinessId();
      const { data } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('business_id', businessId)
        .eq('is_active', true);
      setSuppliers(data || []);
    } catch { setSuppliers([]); }
  };

  const loadInventoryItems = async () => {
    try {
      const businessId = await getBusinessId();

      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (error || !data) {
        setInventoryItems([]);
        return;
      }

      const items: InventoryProduct[] = data.map(item => {
        const stock = (item as any).current_stock ?? 0;
        const parLevel = item.par_level || 50;
        let status: InventoryProduct['status'] = 'in_stock';
        if (stock <= 0) status = 'out_of_stock';
        else if (stock < parLevel * 0.25) status = 'low_stock';
        else if (stock > parLevel * 1.5) status = 'overstocked';

        return {
          id: item.id,
          name: item.name,
          sku: (item as any).sku || '',
          gtin: (item as any).gtin || '',
          description: (item as any).description || '',
          category: item.category,
          current_stock: stock,
          par_level: parLevel,
          reorder_point: Math.floor(parLevel * 0.3),
          unit_of_measure: item.unit_of_measure,
          cost_per_unit: item.current_cost || 0,
          supplier: '',
          supplier_id: (item as any).supplier_id || null,
          last_ordered: '',
          status,
          trend: 'stable' as const,
          requires_serialization: (item as any).requires_serialization || false,
          requires_batch_tracking: (item as any).requires_batch_tracking || false,
          minimum_shelf_life_days: (item as any).minimum_shelf_life_days || 0,
          tolerance_variance_pct: (item as any).tolerance_variance_pct || 5.0,
          individual_unit_size: (item as any).individual_unit_size || 0,
          individual_unit_uom: (item as any).individual_unit_uom || '',
          total_unit_count: (item as any).total_unit_count || 0,
        };
      });
      setInventoryItems(items);
    } catch {
      setInventoryItems([]);
    }
  };

  const handleItemClick = (item: InventoryProduct) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleEditItem = (item: InventoryProduct) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleSaveItem = async (updated: Partial<InventoryProduct> & { id: string }) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          name: updated.name,
          category: updated.category,
          current_stock: updated.current_stock,
          par_level: updated.par_level,
          unit_of_measure: updated.unit_of_measure,
          current_cost: updated.cost_per_unit,
          sku: updated.sku,
          gtin: updated.gtin,
          description: updated.description,
          individual_unit_size: updated.individual_unit_size,
          individual_unit_uom: updated.individual_unit_uom,
          total_unit_count: updated.total_unit_count,
          requires_serialization: updated.requires_serialization,
          requires_batch_tracking: updated.requires_batch_tracking,
          minimum_shelf_life_days: updated.minimum_shelf_life_days,
          tolerance_variance_pct: updated.tolerance_variance_pct,
        } as any)
        .eq('id', updated.id);

      if (error) throw error;
      loadInventoryItems();
    } catch {
      toast({ title: "Error", description: "Failed to update item", variant: "destructive" });
    }
  };

  const handleDeleteItem = async (item: InventoryProduct) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ is_active: false })
        .eq('id', item.id);

      if (error) throw error;

      setInventoryItems(prev => prev.filter(i => i.id !== item.id));
      toast({ title: "Item Removed", description: `${item.name} has been removed from inventory` });
    } catch {
      toast({ title: "Error", description: "Failed to remove item", variant: "destructive" });
    }
  };

  const handleMassDelete = async (ids: string[]) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({ is_active: false } as any)
        .in('id', ids);
      if (error) throw error;
      setInventoryItems(prev => prev.filter(i => !ids.includes(i.id)));
      toast({ title: "Items Removed", description: `${ids.length} items removed from inventory` });
    } catch {
      toast({ title: "Error", description: "Failed to remove items", variant: "destructive" });
    }
  };

  const handleFileSelect = (file: File) => {
    setImportFile(file);
    setParsedItems([]);
  };

  const handleParseDocument = async () => {
    if (!importFile) return;
    setImportParsing(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-inventory-document`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to parse document");
      }

      const result = await response.json();
      setParsedItems((result.items || []).map((item: any) => ({ ...item, selected: true })));
      setParsedVendor(result.vendor || null);
      toast({ title: "Document Parsed", description: `Found ${result.count} items via ${result.source === 'csv_parser' ? 'CSV parser' : 'AI extraction'}` });
    } catch (e: any) {
      toast({ title: "Parse Error", description: e.message || "Failed to parse document", variant: "destructive" });
    } finally {
      setImportParsing(false);
    }
  };

  const insertVendor = async (vendor: typeof parsedVendor) => {
    if (!vendor || !vendor.vendor_name) return;
    try {
      const businessId = await getBusinessId();
      await supabase.from('suppliers').insert({
        business_id: businessId,
        name: vendor.vendor_name,
        contact_email: vendor.vendor_email || null,
        contact_phone: vendor.vendor_phone || null,
        address: null,
      } as any);
      loadSuppliers();
      toast({ title: "Vendor Added", description: `${vendor.vendor_name} added to vendors list` });
    } catch {
      toast({ title: "Error", description: "Failed to add vendor", variant: "destructive" });
    }
  };

  const handleBulkImport = async () => {
    const selected = parsedItems.filter(i => i.selected);
    if (selected.length === 0) return;
    setImportInserting(true);
    try {
      const businessId = await getBusinessId();
      const rows = selected.map(item => ({
        name: item.name,
        sku: item.sku || '',
        gtin: item.gtin || '',
        category: item.category || 'Supplies',
        current_stock: item.quantity || 0,
        unit_of_measure: item.unit_of_measure || 'units',
        current_cost: item.cost_per_unit || 0,
        business_id: businessId,
      }));

      const { error } = await supabase.from('inventory_items').insert(rows as any);
      if (error) throw error;

      // Log history for each imported item
      await Promise.all(selected.map(item =>
        supabase.from('inventory_history').insert({
          business_id: businessId,
          item_name: item.name,
          action: 'imported',
          quantity: item.quantity || 0,
          unit: item.unit_of_measure || 'units',
          note: `Imported via document upload`,
        } as any)
      ));

      toast({ title: "Import Complete", description: `${selected.length} items added to inventory` });

      // Handle vendor
      if (parsedVendor && parsedVendor.vendor_name) {
        const existingMatch = suppliers.find(s => s.name.toLowerCase() === parsedVendor.vendor_name.toLowerCase());
        if (existingMatch) {
          // Duplicate found — show confirmation dialog
          setPendingVendorName(parsedVendor.vendor_name);
          setIsImportDialogOpen(false);
          setImportFile(null);
          setParsedItems([]);
          setDuplicateVendorDialogOpen(true);
          loadInventoryItems();
          return;
        } else {
          // No duplicate — auto-insert
          await insertVendor(parsedVendor);
        }
      }

      setIsImportDialogOpen(false);
      setImportFile(null);
      setParsedItems([]);
      setParsedVendor(null);
      loadInventoryItems();
    } catch {
      toast({ title: "Import Error", description: "Failed to insert items", variant: "destructive" });
    } finally {
      setImportInserting(false);
    }
  };

  const handleDuplicateVendorAdd = async () => {
    await insertVendor(parsedVendor);
    setDuplicateVendorDialogOpen(false);
    setParsedVendor(null);
  };

  const handleDuplicateVendorCancel = () => {
    setDuplicateVendorDialogOpen(false);
    setParsedVendor(null);
    setActiveTab("history");
  };

  const handleAutoProcurement = () => {
    const lowStockItems = inventoryItems.filter(item =>
      item.status === 'low_stock' || item.status === 'out_of_stock'
    );
    toast({
      title: "Auto-Procurement Triggered",
      description: `Processing orders for ${lowStockItems.length} items`,
    });
  };

  const handleAddItem = async (formData: any) => {
    try {
      const businessId = await getBusinessId();

      const { data, error } = await supabase
        .from('inventory_items')
        .insert({
          name: formData.name,
          category: formData.category,
          unit_of_measure: formData.unit_of_measure,
          current_cost: formData.cost_per_unit,
          par_level: formData.par_level,
          current_stock: formData.current_stock,
          business_id: businessId,
          sku: formData.sku,
          gtin: formData.gtin,
          description: formData.description,
          supplier_id: formData.supplier_id || null,
          requires_batch_tracking: formData.requires_batch_tracking,
          requires_serialization: formData.requires_serialization,
          minimum_shelf_life_days: formData.minimum_shelf_life_days,
          tolerance_variance_pct: formData.tolerance_variance_pct,
          individual_unit_size: formData.individual_unit_size,
          individual_unit_uom: formData.individual_unit_uom,
          total_unit_count: formData.total_unit_count,
        } as any)
        .select()
        .single();

      if (error) {
        toast({ title: "Error", description: "Failed to add inventory item", variant: "destructive" });
        return;
      }

      const newItem: InventoryProduct = {
        id: data.id,
        name: data.name,
        sku: (data as any).sku || '',
        gtin: (data as any).gtin || '',
        description: (data as any).description || '',
        category: data.category,
        current_stock: formData.current_stock || 0,
        par_level: data.par_level || 50,
        reorder_point: formData.reorder_point,
        unit_of_measure: data.unit_of_measure,
        cost_per_unit: data.current_cost || 0,
        supplier: '',
        supplier_id: (data as any).supplier_id || null,
        last_ordered: '',
        status: 'out_of_stock',
        trend: 'stable',
        requires_serialization: (data as any).requires_serialization || false,
        requires_batch_tracking: (data as any).requires_batch_tracking || false,
        minimum_shelf_life_days: (data as any).minimum_shelf_life_days || 0,
        tolerance_variance_pct: (data as any).tolerance_variance_pct || 5.0,
        individual_unit_size: (data as any).individual_unit_size || 0,
        individual_unit_uom: (data as any).individual_unit_uom || '',
        total_unit_count: (data as any).total_unit_count || 0,
      };

      setInventoryItems(prev => [...prev, newItem]);
      toast({ title: "Item Added", description: `${formData.name} has been added to inventory` });
    } catch {
      toast({ title: "Error", description: "Failed to add inventory item", variant: "destructive" });
    }
  };

  const handleRestockItem = async (itemId: string, additionalCases: number) => {
    try {
      const existing = inventoryItems.find(i => i.id === itemId);
      if (!existing) return;
      const newStock = existing.current_stock + additionalCases;

      const { error } = await supabase
        .from('inventory_items')
        .update({ current_stock: newStock, par_level: newStock } as any)
        .eq('id', itemId);

      if (error) throw error;

      // Log to inventory history
      const businessId = await getBusinessId();
      await supabase.from('inventory_history').insert({
        business_id: businessId,
        inventory_item_id: itemId,
        item_name: existing.name,
        action: 'restocked',
        quantity: additionalCases,
        unit: existing.unit_of_measure,
        note: `Added ${additionalCases} ${existing.unit_of_measure} via Existing Item restock`,
      } as any);

      loadInventoryItems();
      toast({ title: "Stock Updated", description: `Added ${additionalCases} ${existing.unit_of_measure} to ${existing.name}` });
    } catch {
      toast({ title: "Error", description: "Failed to update stock", variant: "destructive" });
    }
  };

  const inventoryTotalValue = inventoryItems.reduce((sum, item) => sum + roundTo(item.current_stock * item.cost_per_unit, 2), 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Inventory Management
            </h2>
            <p className="text-sm text-muted-foreground">Enterprise inventory tracking, lots, and audit ledger</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={handleAutoProcurement}>
              <Zap className="w-4 h-4 mr-2" />Auto-Procurement
            </Button>
            <Button size="sm" variant="outline" onClick={() => setIsImportDialogOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />Import Document
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />New Item</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <AddInventoryItemForm onCancel={() => setIsAddDialogOpen(false)} onSubmit={handleAddItem} uomUnits={uomUnits} suppliers={suppliers} />
              </DialogContent>
            </Dialog>
            <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Existing Item</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <RestockExistingItemForm
                  existingItems={inventoryItems}
                  onCancel={() => setIsRestockDialogOpen(false)}
                  onSubmit={(itemId, additionalCases) => { handleRestockItem(itemId, additionalCases); setIsRestockDialogOpen(false); }}
                  uomUnits={uomUnits}
                  suppliers={suppliers}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 flex flex-col space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 flex-shrink-0">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold">{inventoryItems.length}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {inventoryItems.filter(i => i.status === 'low_stock').length}
              </div>
              <div className="text-sm text-muted-foreground">Low Stock</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                {inventoryItems.filter(i => i.status === 'out_of_stock').length}
              </div>
              <div className="text-sm text-muted-foreground">Out of Stock</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-2xl font-bold">${inventoryTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-sm text-muted-foreground">Total Value</div>
            </div>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="flex-shrink-0 w-full justify-start">
            <TabsTrigger value="products" className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />Products
            </TabsTrigger>
            <TabsTrigger value="vendors" className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />Vendors
            </TabsTrigger>
            <TabsTrigger value="locations" className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />Locations
            </TabsTrigger>
            <TabsTrigger value="lots" className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />Lots & Positions
            </TabsTrigger>
            <TabsTrigger value="ledger" className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />Transaction Ledger
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="flex-1 min-h-0 mt-4">
            <ProductsTab items={inventoryItems} onItemClick={handleItemClick} onEditItem={handleEditItem} onDeleteItem={handleDeleteItem} onMassDelete={handleMassDelete} />
          </TabsContent>
          <TabsContent value="vendors" className="flex-1 min-h-0 mt-4">
            <VendorsTab />
          </TabsContent>
          <TabsContent value="locations" className="flex-1 min-h-0 mt-4">
            <LocationsTab />
          </TabsContent>
          <TabsContent value="lots" className="flex-1 min-h-0 mt-4">
            <LotsPositionsTab />
          </TabsContent>
          <TabsContent value="ledger" className="flex-1 min-h-0 mt-4">
            <TransactionLedgerTab />
          </TabsContent>
          <TabsContent value="history" className="flex-1 min-h-0 mt-4">
            <InventoryHistoryTab />
          </TabsContent>
        </Tabs>
      </div>

      <InventoryItemModal
        item={selectedItem as any}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveItem}
        uomUnits={uomUnits}
        suppliers={suppliers}
      />

      {/* Import Document Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) { setImportFile(null); setParsedItems([]); }
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileUp className="w-5 h-5" />Import Inventory Document</DialogTitle>
            <DialogDescription>Upload a BOL, packing list, invoice, or spreadsheet (PDF, CSV, XLSX, TXT)</DialogDescription>
          </DialogHeader>

          {/* File Upload Area */}
          {!importFile ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files[0];
                if (file) handleFileSelect(file);
              }}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Drop a file here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports PDF, CSV, XLSX, XLS, TXT</p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.csv,.xlsx,.xls,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected File */}
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileText className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{importFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => { setImportFile(null); setParsedItems([]); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Parse Button */}
              {parsedItems.length === 0 && (
                <Button onClick={handleParseDocument} disabled={importParsing} className="w-full">
                  {importParsing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing Document...</> : <>Analyze Document</>}
                </Button>
              )}

              {/* Parsed Results Preview */}
              {parsedItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{parsedItems.filter(i => i.selected).length} of {parsedItems.length} items selected for import</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setParsedItems(prev => prev.map(i => ({ ...i, selected: true })))}>Select All</Button>
                      <Button size="sm" variant="ghost" onClick={() => setParsedItems(prev => prev.map(i => ({ ...i, selected: false })))}>Deselect All</Button>
                    </div>
                  </div>
                  <ScrollArea className="max-h-[300px] border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"></TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>UOM</TableHead>
                          <TableHead>Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedItems.map((item, idx) => (
                          <TableRow key={idx} className={item.selected ? '' : 'opacity-50'}>
                            <TableCell>
                              <Checkbox
                                checked={item.selected}
                                onCheckedChange={(checked) => {
                                  setParsedItems(prev => prev.map((p, i) => i === idx ? { ...p, selected: !!checked } : p));
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.sku || '—'}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.unit_of_measure}</TableCell>
                            <TableCell>${(item.cost_per_unit ?? 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <Button
                    onClick={handleBulkImport}
                    disabled={importInserting || parsedItems.filter(i => i.selected).length === 0}
                    className="w-full"
                  >
                    {importInserting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : <>Import {parsedItems.filter(i => i.selected).length} Items</>}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Duplicate Vendor Confirmation Dialog */}
      <AlertDialog open={duplicateVendorDialogOpen} onOpenChange={setDuplicateVendorDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Vendor Detected</AlertDialogTitle>
            <AlertDialogDescription>
              A vendor named "<span className="font-semibold">{pendingVendorName}</span>" already exists in your vendors list. Would you like to add a duplicate entry or skip?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDuplicateVendorCancel}>Cancel Vendor Add</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicateVendorAdd}>Add Duplicate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface AddInventoryItemFormProps {
  onCancel: () => void;
  onSubmit: (item: any) => void;
  uomUnits: UOMUnit[];
  suppliers: SupplierOption[];
}

const categories = [
  "Coffee", "Dairy", "Pastry", "Supplies", "Food", "Beverage",
  "Meat", "Seafood", "Produce", "Dry Goods", "Packaging"
];

const AddInventoryItemForm = ({ onCancel, onSubmit, uomUnits, suppliers }: AddInventoryItemFormProps) => {
  const [formData, setFormData] = useState({
    name: '', sku: '', gtin: '', description: '',
    category: 'Coffee', par_level: 50, reorder_point: 15,
    unit_of_measure: 'units', cost_per_unit: 0, supplier_id: '',
    current_stock: 0,
    requires_serialization: false, requires_batch_tracking: false,
    minimum_shelf_life_days: 0, tolerance_variance_pct: 5.0,
    individual_unit_size: 0, individual_unit_uom: '', total_unit_count: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit(formData);
    onCancel();
  };

  const update = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Inventory Item</DialogTitle>
        <DialogDescription>Enterprise inventory catalog — all fields persist to the item profile</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Name, SKU, GTIN */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Item Name *</Label>
            <Input id="name" value={formData.name} onChange={(e) => update('name', e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" value={formData.sku} onChange={(e) => update('sku', e.target.value)} placeholder="e.g. COF-PRM-001" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gtin">GTIN / Barcode</Label>
            <Input id="gtin" value={formData.gtin} onChange={(e) => update('gtin', e.target.value)} placeholder="e.g. 00012345678905" />
          </div>
        </div>

        {/* Row 2: Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" value={formData.description} onChange={(e) => update('description', e.target.value)} placeholder="Item description, notes, specifications..." rows={2} />
        </div>

        {/* Row 3: Category, UOM, Supplier */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(v) => update('category', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Stock Unit</Label>
            <Select value={formData.unit_of_measure} onValueChange={(v) => update('unit_of_measure', v)}>
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
            <Select value={formData.supplier_id || 'none'} onValueChange={(v) => update('supplier_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Row 4: Individual Unit Size, UOM, Total Unit Count */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Unit Size</Label>
            <Input type="number" step="0.01" value={formData.individual_unit_size} onChange={(e) => update('individual_unit_size', parseFloat(e.target.value) || 0)} min="0" placeholder="e.g. 10" />
          </div>
          <div className="space-y-1.5">
            <Label>Unit Size UOM</Label>
            <Select value={formData.individual_unit_uom || 'none'} onValueChange={(v) => update('individual_unit_uom', v === 'none' ? '' : v)}>
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
            <Input type="number" value={formData.total_unit_count} onChange={(e) => update('total_unit_count', parseInt(e.target.value) || 0)} min="0" placeholder="e.g. 12 per case" />
          </div>
        </div>

        {/* Row 5: Case Count, QOH (disabled), Par Level, Cost */}
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label>Case Count</Label>
            <Input type="number" value={formData.current_stock} onChange={(e) => { const v = parseInt(e.target.value) || 0; update('current_stock', v); update('par_level', v); }} min="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Quantity On Hand <span className="text-xs text-muted-foreground">(live)</span></Label>
            <Input type="number" value={formData.current_stock} disabled className="bg-muted cursor-not-allowed" />
          </div>
          <div className="space-y-1.5">
            <Label>Par Level</Label>
            <Input type="number" value={formData.reorder_point} onChange={(e) => update('reorder_point', parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cost per Unit ($)</Label>
            <Input type="number" step="0.01" value={formData.cost_per_unit} onChange={(e) => update('cost_per_unit', parseFloat(e.target.value) || 0)} />
          </div>
        </div>

        {/* Row 5: Tolerance */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Tolerance Variance %</Label>
            <Input type="number" step="0.1" value={formData.tolerance_variance_pct} onChange={(e) => update('tolerance_variance_pct', parseFloat(e.target.value) || 5.0)} min="0" max="100" />
          </div>
          {formData.requires_batch_tracking && (
            <div className="space-y-1.5">
              <Label>Min Shelf Life (days)</Label>
              <Input type="number" value={formData.minimum_shelf_life_days} onChange={(e) => update('minimum_shelf_life_days', parseInt(e.target.value) || 0)} min="0" />
            </div>
          )}
        </div>

        {/* Row 6: Tracking toggles */}
        <div className="flex items-center gap-6 pt-1">
          <div className="flex items-center gap-2">
            <Switch checked={formData.requires_serialization} onCheckedChange={(v) => update('requires_serialization', v)} />
            <Label>Serial Tracking</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={formData.requires_batch_tracking} onCheckedChange={(v) => update('requires_batch_tracking', v)} />
            <Label>Batch/Lot Tracking</Label>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Add Item</Button>
        </div>
      </form>
    </>
  );
};

/* ── Restock Existing Item Form ── */
interface RestockExistingItemFormProps {
  existingItems: InventoryProduct[];
  onCancel: () => void;
  onSubmit: (itemId: string, additionalCases: number) => void;
  uomUnits: UOMUnit[];
  suppliers: SupplierOption[];
}

const RestockExistingItemForm = ({ existingItems, onCancel, onSubmit, uomUnits, suppliers }: RestockExistingItemFormProps) => {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [additionalCases, setAdditionalCases] = useState(0);

  const selectedItem = existingItems.find(i => i.id === selectedItemId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || additionalCases <= 0) return;
    onSubmit(selectedItemId, additionalCases);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Restock Existing Item</DialogTitle>
        <DialogDescription>Add stock to an existing inventory item</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Item Name (dropdown) */}
        <div className="space-y-1.5">
          <Label>Item Name *</Label>
          <Select value={selectedItemId} onValueChange={setSelectedItemId}>
            <SelectTrigger><SelectValue placeholder="Select an existing item" /></SelectTrigger>
            <SelectContent>
              {existingItems.map(item => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedItem && (
          <>
            {/* Row 2: Read-only item info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input value={selectedItem.sku || '—'} disabled className="bg-muted cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label>GTIN / Barcode</Label>
                <Input value={selectedItem.gtin || '—'} disabled className="bg-muted cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input value={selectedItem.category} disabled className="bg-muted cursor-not-allowed" />
              </div>
            </div>

            {/* Row 3: Description (read-only) */}
            {selectedItem.description && (
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea value={selectedItem.description} disabled className="bg-muted cursor-not-allowed" rows={2} />
              </div>
            )}

            {/* Row 4: Stock Unit, Supplier (read-only) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Stock Unit</Label>
                <Input value={selectedItem.unit_of_measure} disabled className="bg-muted cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Size</Label>
                <Input value={selectedItem.individual_unit_size ? `${selectedItem.individual_unit_size} ${selectedItem.individual_unit_uom}` : '—'} disabled className="bg-muted cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label>Pack Count</Label>
                <Input value={selectedItem.total_unit_count || '—'} disabled className="bg-muted cursor-not-allowed" />
              </div>
            </div>

            {/* Row 5: Case Count (editable), QOH (live, disabled), Par Level (read-only), Cost (read-only) */}
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Add Cases</Label>
                <Input type="number" value={additionalCases} onChange={(e) => setAdditionalCases(parseInt(e.target.value) || 0)} min="0" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Quantity On Hand <span className="text-xs text-muted-foreground">(live)</span></Label>
                <Input type="number" value={selectedItem.current_stock} disabled className="bg-muted cursor-not-allowed" />
              </div>
              <div className="space-y-1.5">
                <Label>New Total</Label>
                <Input type="number" value={selectedItem.current_stock + additionalCases} disabled className="bg-muted cursor-not-allowed font-semibold" />
              </div>
              <div className="space-y-1.5">
                <Label>Cost per Unit ($)</Label>
                <Input value={`$${selectedItem.cost_per_unit.toFixed(2)}`} disabled className="bg-muted cursor-not-allowed" />
              </div>
            </div>
          </>
        )}

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={!selectedItemId || additionalCases <= 0}>Restock Item</Button>
        </div>
      </form>
    </>
  );
};
