import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, Search, Coffee, Milk, Croissant, Coffee as CoffeeSupplies,
  Barcode, Layers, Box, Pencil, Trash2, CheckSquare, XSquare
} from "lucide-react";

export interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  gtin: string;
  description: string;
  category: string;
  current_stock: number;
  par_level: number;
  reorder_point: number;
  unit_of_measure: string;
  cost_per_unit: number;
  supplier: string;
  supplier_id: string | null;
  last_ordered: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked';
  trend: 'up' | 'down' | 'stable';
  requires_serialization: boolean;
  requires_batch_tracking: boolean;
  minimum_shelf_life_days: number;
  tolerance_variance_pct: number;
  individual_unit_size: number;
  individual_unit_uom: string;
  total_unit_count: number;
}

interface ProductsTabProps {
  items: InventoryProduct[];
  onItemClick: (item: InventoryProduct) => void;
  onEditItem?: (item: InventoryProduct) => void;
  onDeleteItem?: (item: InventoryProduct) => void;
  onMassDelete?: (ids: string[]) => void;
}

const categories = ["all", "Coffee", "Dairy", "Pastry", "Supplies", "Food"];
const statuses = ["all", "in_stock", "low_stock", "out_of_stock", "overstocked"];

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'coffee': return <Coffee className="w-6 h-6" />;
    case 'dairy': return <Milk className="w-6 h-6" />;
    case 'pastry': return <Croissant className="w-6 h-6" />;
    case 'supplies': return <CoffeeSupplies className="w-6 h-6" />;
    default: return <Package className="w-6 h-6" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'in_stock': return 'bg-success';
    case 'low_stock': return 'bg-warning';
    case 'out_of_stock': return 'bg-destructive';
    case 'overstocked': return 'bg-secondary';
    default: return 'bg-muted';
  }
};

export const ProductsTab = ({ items, onItemClick, onEditItem, onDeleteItem, onMassDelete }: ProductsTabProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === "all" || item.category === filterCategory;
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.map(i => i.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
    setSelectionMode(false);
  };

  const handleMassDelete = () => {
    if (selectedIds.size > 0 && onMassDelete) {
      onMassDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setSelectionMode(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search and Filters */}
      <div className="flex gap-4 flex-shrink-0 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category === "all" ? "All Categories" : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map(status => (
              <SelectItem key={status} value={status}>
                {status === "all" ? "All Status" : status.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant={selectionMode ? "secondary" : "outline"}
          onClick={() => { setSelectionMode(!selectionMode); if (selectionMode) deselectAll(); }}
        >
          <CheckSquare className="w-4 h-4 mr-1" />
          Select
        </Button>
      </div>

      {/* Selection Toolbar */}
      {selectionMode && (
        <div className="flex items-center gap-3 px-3 py-2 bg-muted rounded-lg flex-shrink-0">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" variant="ghost" onClick={selectAll}>Select All ({filteredItems.length})</Button>
          <Button size="sm" variant="ghost" onClick={deselectAll}><XSquare className="w-4 h-4 mr-1" />Clear</Button>
          <div className="flex-1" />
          <Button size="sm" variant="destructive" onClick={handleMassDelete} disabled={selectedIds.size === 0}>
            <Trash2 className="w-4 h-4 mr-1" />Delete Selected
          </Button>
        </div>
      )}

      {/* Products Container */}
      <div className="border rounded-lg flex-1 min-h-0 bg-card">
        <ScrollArea className="h-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-3">
            {filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 relative group ${selectedIds.has(item.id) ? 'ring-2 ring-primary' : ''}`}
                onClick={() => selectionMode ? toggleSelect(item.id) : onItemClick(item)}
              >
                <CardContent className="p-3 flex flex-col items-center text-center space-y-2">
                  {/* Selection checkbox */}
                  {selectionMode && (
                    <div className="absolute top-1 left-1 z-10">
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  {/* Edit / Delete buttons */}
                  {!selectionMode && (
                    <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); onEditItem?.(item); }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); onDeleteItem?.(item); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  <div className="relative">
                    {getCategoryIcon(item.category)}
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(item.status)}`} />
                  </div>
                  <div className="w-full">
                    <div className="font-medium text-sm truncate">{item.name}</div>
                    {item.sku && (
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Barcode className="w-3 h-3" />
                        {item.sku}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {item.current_stock} {item.unit_of_measure}
                    </div>
                    {item.individual_unit_size > 0 && item.individual_unit_uom && (
                      <div className="text-[10px] text-muted-foreground">
                        ({item.individual_unit_size} {item.individual_unit_uom} each)
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {item.requires_serialization && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          <Box className="w-2.5 h-2.5 mr-0.5" />SN
                        </Badge>
                      )}
                      {item.requires_batch_tracking && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          <Layers className="w-2.5 h-2.5 mr-0.5" />Lot
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredItems.length === 0 && (
              <div className="col-span-full p-8 text-center text-muted-foreground">No items found.</div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
