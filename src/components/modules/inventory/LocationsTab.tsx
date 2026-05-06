import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, ChevronRight, ChevronDown, MapPin, Warehouse, 
  Grid3X3, LayoutGrid, Package, Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WarehouseLocation {
  id: string;
  name_code: string;
  type: 'Facility' | 'Zone' | 'Aisle' | 'Rack' | 'Bin';
  is_pickable: boolean;
  item_count: number;
  children: WarehouseLocation[];
}

// Locations now start empty - populated from database
const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Facility': return <Warehouse className="w-4 h-4" />;
    case 'Zone': return <LayoutGrid className="w-4 h-4" />;
    case 'Aisle': return <Grid3X3 className="w-4 h-4" />;
    case 'Rack': return <Package className="w-4 h-4" />;
    case 'Bin': return <MapPin className="w-4 h-4" />;
    default: return <MapPin className="w-4 h-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Facility': return 'default' as const;
    case 'Zone': return 'secondary' as const;
    case 'Aisle': return 'outline' as const;
    case 'Rack': return 'outline' as const;
    case 'Bin': return 'outline' as const;
    default: return 'outline' as const;
  }
};

const LocationNode = ({ location, depth = 0 }: { location: WarehouseLocation; depth?: number }) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = location.children.length > 0;

  return (
    <div>
      <div 
        className="flex items-center gap-2 py-2 px-3 hover:bg-muted/30 cursor-pointer rounded transition-colors"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <div className="w-4" />
        )}
        {getTypeIcon(location.type)}
        <span className="font-medium text-sm flex-1">{location.name_code}</span>
        <Badge variant={getTypeColor(location.type)} className="text-[10px]">{location.type}</Badge>
        {location.is_pickable && (
          <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">
            <Check className="w-2.5 h-2.5 mr-0.5" />Pickable
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">{location.item_count} items</span>
      </div>
      {expanded && hasChildren && (
        <div>
          {location.children.map(child => (
            <LocationNode key={child.id} location={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const LocationsTab = () => {
  const [locations] = useState<WarehouseLocation[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const { toast } = useToast();

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex justify-between items-center flex-shrink-0">
        <div className="text-sm text-muted-foreground">
          Warehouse location hierarchy — expand nodes to drill down
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Add Location
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto border rounded-lg">
        {locations.map(location => (
          <LocationNode key={location.id} location={location} />
        ))}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
            <DialogDescription>Add a new warehouse location to the hierarchy</DialogDescription>
          </DialogHeader>
          <AddLocationForm onCancel={() => setIsAddOpen(false)} onSubmit={(data) => {
            toast({ title: "Location Added", description: `${data.name_code} has been created` });
            setIsAddOpen(false);
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AddLocationForm = ({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    name_code: '', type: 'Zone' as const, is_pickable: false, parent: ''
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }} className="space-y-4">
      <div className="space-y-2">
        <Label>Name / Code</Label>
        <Input value={formData.name_code} onChange={(e) => setFormData(p => ({ ...p, name_code: e.target.value }))} placeholder="e.g. A1-R03-B01" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={formData.type} onValueChange={(v: any) => setFormData(p => ({ ...p, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Facility">Facility</SelectItem>
              <SelectItem value="Zone">Zone</SelectItem>
              <SelectItem value="Aisle">Aisle</SelectItem>
              <SelectItem value="Rack">Rack</SelectItem>
              <SelectItem value="Bin">Bin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Parent Location</Label>
          <Select value={formData.parent} onValueChange={(v) => setFormData(p => ({ ...p, parent: v }))}>
            <SelectTrigger><SelectValue placeholder="None (top level)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (top level)</SelectItem>
              <SelectItem value="1">Main Warehouse</SelectItem>
              <SelectItem value="15">Downtown Store</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={formData.is_pickable} onCheckedChange={(v) => setFormData(p => ({ ...p, is_pickable: v }))} />
        <Label>Pickable location</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Add Location</Button>
      </div>
    </form>
  );
};
