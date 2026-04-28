
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Truck, Package, ArrowRight, Search } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit_of_measure: string;
  current_stock: number;
}

interface InventoryTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InventoryTransferModal = ({ isOpen, onClose }: InventoryTransferModalProps) => {
  const [sourceLocation, setSourceLocation] = useState("");
  const [destinationLocation, setDestinationLocation] = useState("");
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Array<{id: string, quantity: number}>>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const locations = [
    { id: "downtown", name: "Downtown Location" },
    { id: "mall", name: "Mall Location" },
    { id: "airport", name: "Airport Location" }
  ];

  useEffect(() => {
    if (sourceLocation && isOpen) {
      loadInventoryItems();
    }
  }, [sourceLocation, isOpen]);

  const loadInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          id, name, category, unit_of_measure,
          location_inventory!inner(current_stock)
        `)
        .eq('business_id', '550e8400-e29b-41d4-a716-446655440001')
        .gt('location_inventory.current_stock', 0);

      if (data) {
        const items = data.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          unit_of_measure: item.unit_of_measure,
          current_stock: item.location_inventory[0]?.current_stock || 0
        }));
        setInventoryItems(items);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setSelectedItems(prev => {
      const existing = prev.find(item => item.id === itemId);
      if (existing) {
        if (quantity <= 0) {
          return prev.filter(item => item.id !== itemId);
        }
        return prev.map(item => 
          item.id === itemId ? { ...item, quantity } : item
        );
      } else if (quantity > 0) {
        return [...prev, { id: itemId, quantity }];
      }
      return prev;
    });
  };

  const processTransfer = async () => {
    if (!sourceLocation || !destinationLocation || selectedItems.length === 0) {
      toast({
        title: "Invalid Transfer",
        description: "Please select locations and items to transfer",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create transfer record and update inventory
      for (const item of selectedItems) {
        // Record the movement
        await supabase
          .from('inventory_movements')
          .insert({
            inventory_item_id: item.id,
            location_id: sourceLocation,
            movement_type: 'transfer_out',
            quantity: -item.quantity,
            notes: `Transfer to ${destinationLocation}`
          });

        await supabase
          .from('inventory_movements')
          .insert({
            inventory_item_id: item.id,
            location_id: destinationLocation,
            movement_type: 'transfer_in',
            quantity: item.quantity,
            notes: `Transfer from ${sourceLocation}`
          });
      }

      toast({
        title: "Transfer Completed",
        description: `${selectedItems.length} items transferred successfully`,
      });

      setSelectedItems([]);
      onClose();
    } catch (error) {
      console.error('Error processing transfer:', error);
      toast({
        title: "Transfer Failed",
        description: "Failed to process inventory transfer",
        variant: "destructive"
      });
    }
  };

  const filteredItems = inventoryItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Truck className="w-5 h-5 mr-2" />
            Inventory Transfer
          </DialogTitle>
          <DialogDescription>
            Transfer inventory items between locations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Location Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="space-y-2">
              <label className="text-sm font-medium">From Location</label>
              <Select value={sourceLocation} onValueChange={setSourceLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem 
                      key={location.id} 
                      value={location.id}
                      disabled={location.id === destinationLocation}
                    >
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-6 h-6 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Location</label>
              <Select value={destinationLocation} onValueChange={setDestinationLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem 
                      key={location.id} 
                      value={location.id}
                      disabled={location.id === sourceLocation}
                    >
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {sourceLocation && (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search inventory items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Inventory Items */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filteredItems.map((item) => {
                  const selectedQuantity = selectedItems.find(si => si.id === item.id)?.quantity || 0;
                  
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{item.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {item.category} • Available: {item.current_stock} {item.unit_of_measure}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="0"
                          max={item.current_stock}
                          value={selectedQuantity}
                          onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="w-20"
                          placeholder="0"
                        />
                        <span className="text-xs text-muted-foreground">{item.unit_of_measure}</span>
                      </div>
                    </div>
                  );
                })}

                {filteredItems.length === 0 && searchTerm && (
                  <p className="text-center text-muted-foreground py-4">
                    No items found matching "{searchTerm}"
                  </p>
                )}
              </div>

              {/* Transfer Summary */}
              {selectedItems.length > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Transfer Summary</h4>
                  <div className="space-y-1">
                    {selectedItems.map((item) => {
                      const inventoryItem = inventoryItems.find(i => i.id === item.id);
                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{inventoryItem?.name}</span>
                          <span>{item.quantity} {inventoryItem?.unit_of_measure}</span>
                        </div>
                      );
                    })}
                  </div>
                  <Badge variant="secondary" className="mt-2">
                    {selectedItems.length} items selected
                  </Badge>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={processTransfer}
              disabled={!sourceLocation || !destinationLocation || selectedItems.length === 0}
            >
              Process Transfer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
