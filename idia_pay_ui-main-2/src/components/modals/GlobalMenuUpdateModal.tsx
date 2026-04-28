
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Percent, DollarSign, MapPin } from "lucide-react";

interface GlobalMenuUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalMenuUpdateModal = ({ isOpen, onClose }: GlobalMenuUpdateModalProps) => {
  const [updateType, setUpdateType] = useState<"percentage" | "fixed">("percentage");
  const [adjustmentValue, setAdjustmentValue] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<string>("all");
  const [scheduleUpdate, setScheduleUpdate] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const { toast } = useToast();

  const categories = ["Coffee", "Food", "Pastry", "Beverages"];

  const handlePriceUpdate = async () => {
    try {
      const adjustment = parseFloat(adjustmentValue);
      if (isNaN(adjustment)) {
        toast({
          title: "Invalid Input",
          description: "Please enter a valid number",
          variant: "destructive"
        });
        return;
      }

      // Calculate new prices based on type
      let updateQuery = supabase
        .from('menu_items')
        .select('id, base_price')
        .eq('business_id', '550e8400-e29b-41d4-a716-446655440001');

      if (selectedCategories.length > 0) {
        updateQuery = updateQuery.in('category', selectedCategories);
      }

      const { data: items, error: fetchError } = await updateQuery;
      
      if (fetchError) throw fetchError;

      // Update prices
      for (const item of items || []) {
        const newPrice = updateType === "percentage" 
          ? item.base_price * (1 + adjustment / 100)
          : item.base_price + adjustment;

        await supabase
          .from('menu_items')
          .update({ base_price: Math.max(0, newPrice) })
          .eq('id', item.id);
      }

      toast({
        title: "Menu Updated Successfully",
        description: `${items?.length || 0} items updated ${updateType === 'percentage' ? `by ${adjustment}%` : `by $${adjustment}`}`,
      });

      onClose();
    } catch (error) {
      console.error('Error updating menu:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update menu prices",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Global Menu Price Update
          </DialogTitle>
          <DialogDescription>
            Update prices across all locations and categories
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Update Type */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Update Type</label>
            <Select value={updateType} onValueChange={(value: "percentage" | "fixed") => setUpdateType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage Adjustment</SelectItem>
                <SelectItem value="fixed">Fixed Amount Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Adjustment Value */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              {updateType === "percentage" ? "Percentage Change (%)" : "Fixed Amount ($)"}
            </label>
            <div className="relative">
              {updateType === "percentage" ? (
                <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              ) : (
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              )}
              <Input
                type="number"
                step="0.01"
                value={adjustmentValue}
                onChange={(e) => setAdjustmentValue(e.target.value)}
                className="pl-10"
                placeholder={updateType === "percentage" ? "e.g., 5.5" : "e.g., 0.50"}
              />
            </div>
          </div>

          {/* Category Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Categories</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategories.includes(category) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedCategories(prev => 
                      prev.includes(category)
                        ? prev.filter(c => c !== category)
                        : [...prev, category]
                    );
                  }}
                >
                  {category}
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCategories([])}
                className="text-xs"
              >
                Clear All
              </Button>
            </div>
            {selectedCategories.length === 0 && (
              <p className="text-xs text-muted-foreground">All categories will be updated</p>
            )}
          </div>

          {/* Location Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Target Locations</label>
            <Select value={selectedLocations} onValueChange={setSelectedLocations}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="downtown">Downtown Location</SelectItem>
                <SelectItem value="mall">Mall Location</SelectItem>
                <SelectItem value="airport">Airport Location</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule Update */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                checked={scheduleUpdate}
                onCheckedChange={setScheduleUpdate}
              />
              <label className="text-sm font-medium">Schedule for later</label>
            </div>
            {scheduleUpdate && (
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            )}
          </div>

          {/* Preview */}
          {adjustmentValue && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Preview Changes</h4>
              <p className="text-sm text-muted-foreground">
                {updateType === "percentage" 
                  ? `Prices will be ${parseFloat(adjustmentValue) > 0 ? 'increased' : 'decreased'} by ${Math.abs(parseFloat(adjustmentValue))}%`
                  : `Prices will be ${parseFloat(adjustmentValue) > 0 ? 'increased' : 'decreased'} by $${Math.abs(parseFloat(adjustmentValue))}`
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Example: $4.50 → ${updateType === "percentage" 
                  ? (4.50 * (1 + parseFloat(adjustmentValue || "0") / 100)).toFixed(2)
                  : (4.50 + parseFloat(adjustmentValue || "0")).toFixed(2)
                }
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handlePriceUpdate}
              disabled={!adjustmentValue || isNaN(parseFloat(adjustmentValue))}
            >
              {scheduleUpdate ? "Schedule Update" : "Update Prices"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
