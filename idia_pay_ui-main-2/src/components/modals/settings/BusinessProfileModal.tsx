import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { Building, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";

interface BusinessProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface BusinessHourEntry {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

const DEFAULT_HOURS: BusinessHourEntry[] = DAY_NAMES.map((_, i) => ({
  day_of_week: i,
  open_time: "09:00",
  close_time: "17:00",
  is_closed: i === 0, // Sunday closed by default
}));

export const BusinessProfileModal = ({ isOpen, onClose }: BusinessProfileModalProps) => {
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [taxId, setTaxId] = useState("");
  const [hours, setHours] = useState<BusinessHourEntry[]>(DEFAULT_HOURS);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const businessId = getBusinessId();

  useEffect(() => {
    if (isOpen) {
      loadBusinessHours();
    }
  }, [isOpen]);

  const loadBusinessHours = async () => {
    const { data } = await supabase
      .from("business_hours")
      .select("*")
      .eq("business_id", businessId)
      .order("day_of_week");

    if (data && data.length > 0) {
      const mapped = DAY_NAMES.map((_, i) => {
        const existing = (data as any[]).find((d: any) => d.day_of_week === i);
        return existing
          ? { day_of_week: i, open_time: existing.open_time, close_time: existing.close_time, is_closed: existing.is_closed }
          : DEFAULT_HOURS[i];
      });
      setHours(mapped);
    }
  };

  const updateHour = (dayIndex: number, field: keyof BusinessHourEntry, value: any) => {
    setHours(prev => prev.map((h, i) => i === dayIndex ? { ...h, [field]: value } : h));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Save business hours
      await supabase.from("business_hours").delete().eq("business_id", businessId);
      const inserts = hours.map(h => ({
        business_id: businessId,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed,
      }));
      await supabase.from("business_hours").insert(inserts as any);

      toast({
        title: "Business Profile Updated",
        description: "Your business profile and hours have been saved.",
      });
      onClose();
    } catch {
      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Manage Business Profile
          </DialogTitle>
          <DialogDescription>Update your business information, contact details, and operating hours.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input id="businessName" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Your Business Name" />
            </div>
            <div>
              <Label htmlFor="businessType">Business Type</Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger><SelectValue placeholder="Select business type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                  <SelectItem value="cafe">Café</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="franchise">Franchise</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Business Description</Label>
            <Textarea id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of your business" rows={3} />
          </div>

          <div>
            <Label htmlFor="address">Business Address</Label>
            <Textarea id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Complete business address" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label htmlFor="email">Business Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="business@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" />
            </div>
            <div>
              <Label htmlFor="taxId">Tax ID / EIN</Label>
              <Input id="taxId" value={taxId} onChange={e => setTaxId(e.target.value)} placeholder="XX-XXXXXXX" />
            </div>
          </div>

          <Separator />

          {/* Business Hours Section */}
          <div className="space-y-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Business Hours
            </h3>
            <p className="text-sm text-muted-foreground">Set your operating hours. These are used for team scheduling.</p>

            <div className="space-y-2">
              {hours.map((h, i) => (
                <div key={i} className="flex items-center gap-3 p-2 border rounded-lg">
                  <span className="text-sm font-medium w-24 flex-shrink-0">{DAY_NAMES[i]}</span>
                  <div className="flex items-center gap-2">
                    <Switch checked={!h.is_closed} onCheckedChange={v => updateHour(i, "is_closed", !v)} />
                    <span className="text-xs text-muted-foreground w-10">{h.is_closed ? "Closed" : "Open"}</span>
                  </div>
                  {!h.is_closed && (
                    <div className="flex items-center gap-2 flex-1">
                      <Input type="time" value={h.open_time} onChange={e => updateHour(i, "open_time", e.target.value)} className="w-32" />
                      <span className="text-sm text-muted-foreground">to</span>
                      <Input type="time" value={h.close_time} onChange={e => updateHour(i, "close_time", e.target.value)} className="w-32" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
