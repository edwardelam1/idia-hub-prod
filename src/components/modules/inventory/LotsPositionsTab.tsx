import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertTriangle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";

interface InventoryPosition {
  id: string;
  product_name: string;
  lot_number: string;
  location: string;
  status: 'Available' | 'Allocated' | 'Quarantined' | 'In-Transit';
  quantity: number;
  unit: string;
  expiration_date: string | null;
  landed_cost: number;
  received_date: string;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Available': return 'default' as const;
    case 'Allocated': return 'secondary' as const;
    case 'Quarantined': return 'destructive' as const;
    case 'In-Transit': return 'outline' as const;
    default: return 'outline' as const;
  }
};

const isExpiringSoon = (date: string | null) => {
  if (!date) return false;
  const expiry = new Date(date);
  const now = new Date();
  const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntil <= 7 && daysUntil > 0;
};

const isExpired = (date: string | null) => {
  if (!date) return false;
  return new Date(date) < new Date();
};

/**
 * FEFO sort: earliest expiration first, then by received date
 */
const fefoSort = (a: InventoryPosition, b: InventoryPosition): number => {
  // Items with expiration dates come first
  if (a.expiration_date && !b.expiration_date) return -1;
  if (!a.expiration_date && b.expiration_date) return 1;
  if (a.expiration_date && b.expiration_date) {
    const diff = new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
    if (diff !== 0) return diff;
  }
  // Fall back to FIFO (received date)
  return new Date(a.received_date).getTime() - new Date(b.received_date).getTime();
};

export const LotsPositionsTab = () => {
  const [positions, setPositions] = useState<InventoryPosition[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadPositions();
  }, []);

  const loadPositions = async () => {
    // Build positions from inventory items with their state
    const businessId = await getBusinessId();
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (!error && data) {
      const mapped: InventoryPosition[] = data
        .filter(item => (item as any).current_stock > 0)
        .map(item => ({
          id: item.id,
          product_name: item.name,
          lot_number: `LOT-${item.id.substring(0, 8).toUpperCase()}`,
          location: 'Main Warehouse',
          status: ((item as any).inventory_state === 'Allocated_to_WIP' ? 'Allocated' :
                   (item as any).inventory_state === 'In_Transit' ? 'In-Transit' :
                   (item as any).inventory_state === 'Damaged' ? 'Quarantined' : 'Available') as InventoryPosition['status'],
          quantity: (item as any).current_stock || 0,
          unit: item.unit_of_measure,
          expiration_date: null,
          landed_cost: item.current_cost || 0,
          received_date: item.created_at,
        }));
      // Apply FEFO sorting
      setPositions(mapped.sort(fefoSort));
    }
  };

  const filtered = positions.filter(p => {
    const matchSearch = p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lot_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Group by product
  const grouped = filtered.reduce((acc, pos) => {
    if (!acc[pos.product_name]) acc[pos.product_name] = [];
    acc[pos.product_name].push(pos);
    return acc;
  }, {} as Record<string, InventoryPosition[]>);

  // State summary
  const stateCount = {
    Available: positions.filter(p => p.status === 'Available').length,
    Allocated: positions.filter(p => p.status === 'Allocated').length,
    Quarantined: positions.filter(p => p.status === 'Quarantined').length,
    'In-Transit': positions.filter(p => p.status === 'In-Transit').length,
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* State summary badges */}
      <div className="flex gap-2 flex-shrink-0">
        <Badge variant="default" className="text-xs">Available: {stateCount.Available}</Badge>
        <Badge variant="secondary" className="text-xs">Allocated: {stateCount.Allocated}</Badge>
        <Badge variant="destructive" className="text-xs">Quarantined: {stateCount.Quarantined}</Badge>
        <Badge variant="outline" className="text-xs">In-Transit: {stateCount['In-Transit']}</Badge>
      </div>

      <div className="flex gap-4 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search lots, products, locations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="Allocated">Allocated</SelectItem>
            <SelectItem value="Quarantined">Quarantined</SelectItem>
            <SelectItem value="In-Transit">In-Transit</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No inventory positions found. Add inventory items with stock to see lot positions here.
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([productName, positions]) => (
              <div key={productName} className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 font-medium text-sm flex items-center justify-between">
                  <span>{productName}</span>
                  <span className="text-xs text-muted-foreground">
                    {positions.reduce((sum, p) => sum + p.quantity, 0)} {positions[0]?.unit} total
                  </span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="border-t text-xs text-muted-foreground">
                      <th className="text-left p-2 pl-4">Lot #</th>
                      <th className="text-left p-2">Location</th>
                      <th className="text-center p-2">Status</th>
                      <th className="text-center p-2">State</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Cost</th>
                      <th className="text-left p-2">Expiration</th>
                      <th className="text-left p-2 pr-4">Received</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map(pos => (
                      <tr key={pos.id} className="border-t hover:bg-muted/20 transition-colors">
                        <td className="p-2 pl-4 text-sm font-mono">{pos.lot_number}</td>
                        <td className="p-2 text-sm">{pos.location}</td>
                        <td className="p-2 text-center">
                          <Badge variant={getStatusVariant(pos.status)} className="text-[10px]">{pos.status}</Badge>
                        </td>
                        <td className="p-2 text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {pos.status === 'Available' ? 'FEFO Ready' : pos.status}
                          </Badge>
                        </td>
                        <td className="p-2 text-right text-sm font-medium">{pos.quantity} {pos.unit}</td>
                        <td className="p-2 text-right text-sm">${pos.landed_cost.toFixed(2)}</td>
                        <td className="p-2 text-sm">
                          {pos.expiration_date ? (
                            <div className="flex items-center gap-1">
                              {(isExpired(pos.expiration_date) || isExpiringSoon(pos.expiration_date)) && (
                                <AlertTriangle className={`w-3 h-3 ${isExpired(pos.expiration_date) ? 'text-destructive' : 'text-yellow-500'}`} />
                              )}
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              <span className={isExpired(pos.expiration_date) ? 'text-destructive line-through' : isExpiringSoon(pos.expiration_date) ? 'text-yellow-600 font-medium' : ''}>
                                {new Date(pos.expiration_date).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="p-2 pr-4 text-sm text-muted-foreground">{new Date(pos.received_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
