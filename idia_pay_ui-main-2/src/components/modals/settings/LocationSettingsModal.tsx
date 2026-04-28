import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";

interface LocationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Location {
  id: string;
  name: string;
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
  isActive: boolean;
  isNew?: boolean;
}

export const LocationSettingsModal = ({ isOpen, onClose }: LocationSettingsModalProps) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) loadLocations();
  }, [isOpen]);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const businessId = await getBusinessId();
      const { data, error } = await supabase
        .from('business_locations')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at');

      if (!error && data) {
        setLocations(data.map((loc: any) => ({
          id: loc.id,
          name: loc.name,
          street: loc.street || '',
          street2: loc.street2 || '',
          city: loc.city || '',
          state: loc.state || '',
          zip: loc.zip || '',
          isActive: loc.is_active,
        })));
      }
    } catch (err) {
      console.error('Error loading locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const addLocation = () => {
    setLocations([...locations, {
      id: crypto.randomUUID(),
      name: "",
      street: "",
      street2: "",
      city: "",
      state: "",
      zip: "",
      isActive: true,
      isNew: true,
    }]);
  };

  const removeLocation = (id: string) => {
    setLocations(locations.filter(loc => loc.id !== id));
  };

  const updateLocation = (id: string, field: keyof Location, value: any) => {
    setLocations(locations.map(loc =>
      loc.id === id ? { ...loc, [field]: value } : loc
    ));
  };

  const handleSave = async () => {
    const valid = locations.filter(l => l.name.trim());
    if (valid.length === 0) {
      toast({ title: "Error", description: "At least one named location is required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const businessId = await getBusinessId();

      // Delete all existing and re-insert (simple upsert strategy)
      await supabase.from('business_locations').delete().eq('business_id', businessId);

      const rows = valid.map(loc => ({
        id: loc.id,
        business_id: businessId,
        name: loc.name.trim(),
        street: loc.street.trim(),
        street2: loc.street2.trim(),
        city: loc.city.trim(),
        state: loc.state.trim(),
        zip: loc.zip.trim(),
        address: [loc.street, loc.street2, loc.city, loc.state, loc.zip].filter(Boolean).join(', ').trim() || null,
        is_active: loc.isActive,
      }));

      const { error } = await supabase.from('business_locations').insert(rows);
      if (error) throw error;

      toast({ title: "Location Settings Updated", description: "Your locations have been saved." });
      onClose();
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Settings
          </DialogTitle>
          <DialogDescription>
            Manage your business locations. These locations appear in inventory transfers, receiving, and transaction recording.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Business Locations</h3>
            <Button onClick={addLocation} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </Button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading locations...</div>
          ) : locations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No locations yet. Add one to get started.</div>
          ) : locations.map((location) => (
            <Card key={location.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {location.name || "New Location"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={location.isActive}
                      onCheckedChange={(checked) => updateLocation(location.id, 'isActive', checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLocation(location.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Location Name</Label>
                    <Input
                      value={location.name}
                      onChange={(e) => updateLocation(location.id, 'name', e.target.value)}
                      placeholder="e.g., Downtown Location"
                    />
                  </div>
                </div>
                <div>
                  <Label>Street Address</Label>
                  <Input
                    value={location.street}
                    onChange={(e) => updateLocation(location.id, 'street', e.target.value)}
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <Label>Street Line 2</Label>
                  <Input
                    value={location.street2}
                    onChange={(e) => updateLocation(location.id, 'street2', e.target.value)}
                    placeholder="Suite, Unit, Floor (optional)"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={location.city}
                      onChange={(e) => updateLocation(location.id, 'city', e.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={location.state}
                      onChange={(e) => updateLocation(location.id, 'state', e.target.value)}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <Label>Zip Code</Label>
                    <Input
                      value={location.zip}
                      onChange={(e) => updateLocation(location.id, 'zip', e.target.value)}
                      placeholder="Zip"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
