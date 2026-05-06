import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Truck, Plus, Star, Clock, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";

interface Vendor {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  payment_terms: string;
  rating: number;
  lead_time_days: number;
  status: 'Active' | 'On-Hold' | 'Inactive';
  product_count: number;
}

export const VendorsTab = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    const businessId = await getBusinessId();
    if (!businessId) return;

    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', businessId);

      if (!error && data) {
        setVendors(data.map(s => ({
          id: s.id,
          name: s.name,
          contact_name: s.contact_name || '',
          email: s.email || '',
          phone: s.phone || '',
          payment_terms: s.payment_terms || 'Net 30',
          rating: s.rating || 0,
          lead_time_days: (s as any).lead_time_days || 0,
          status: ((s as any).status || 'Active') as any,
          product_count: 0,
        })));
      }
    } catch (err) {
      console.error('Error loading vendors:', err);
    }
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.contact_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Active': return 'default' as const;
      case 'On-Hold': return 'secondary' as const;
      case 'Inactive': return 'destructive' as const;
      default: return 'outline' as const;
    }
  };

  const handleAddVendor = (formData: any) => {
    const newVendor: Vendor = {
      id: crypto.randomUUID(),
      ...formData,
      rating: 0,
      product_count: 0,
    };
    setVendors(prev => [...prev, newVendor]);
    setIsAddOpen(false);
    toast({ title: "Vendor Added", description: `${formData.name} has been added` });
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex gap-4 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Add Vendor
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 text-sm font-medium">Vendor</th>
                <th className="text-left p-3 text-sm font-medium">Contact</th>
                <th className="text-left p-3 text-sm font-medium">Terms</th>
                <th className="text-center p-3 text-sm font-medium">Lead Time</th>
                <th className="text-center p-3 text-sm font-medium">Rating</th>
                <th className="text-center p-3 text-sm font-medium">Products</th>
                <th className="text-center p-3 text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.map(vendor => (
                <tr 
                  key={vendor.id} 
                  className="border-t hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedVendor(vendor)}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{vendor.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{vendor.contact_name}</td>
                  <td className="p-3 text-sm">{vendor.payment_terms}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Clock className="w-3 h-3" />{vendor.lead_time_days}d
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />{vendor.rating}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Package className="w-3 h-3" />{vendor.product_count}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={getStatusVariant(vendor.status)}>{vendor.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vendor Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Vendor</DialogTitle>
            <DialogDescription>Add a new supplier to your vendor list</DialogDescription>
          </DialogHeader>
          <AddVendorForm onCancel={() => setIsAddOpen(false)} onSubmit={handleAddVendor} />
        </DialogContent>
      </Dialog>

      {/* Vendor Detail Dialog */}
      <Dialog open={!!selectedVendor} onOpenChange={() => setSelectedVendor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />{selectedVendor?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedVendor && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Contact:</span><div className="font-medium">{selectedVendor.contact_name}</div></div>
                <div><span className="text-muted-foreground">Email:</span><div className="font-medium">{selectedVendor.email}</div></div>
                <div><span className="text-muted-foreground">Phone:</span><div className="font-medium">{selectedVendor.phone}</div></div>
                <div><span className="text-muted-foreground">Payment Terms:</span><div className="font-medium">{selectedVendor.payment_terms}</div></div>
                <div><span className="text-muted-foreground">Lead Time:</span><div className="font-medium">{selectedVendor.lead_time_days} days</div></div>
                <div><span className="text-muted-foreground">Rating:</span><div className="font-medium flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />{selectedVendor.rating}/5</div></div>
              </div>
              <Badge variant={getStatusVariant(selectedVendor.status)}>{selectedVendor.status}</Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AddVendorForm = ({ onCancel, onSubmit }: { onCancel: () => void; onSubmit: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    name: '', contact_name: '', email: '', phone: '',
    payment_terms: 'Net 30', lead_time_days: 7, status: 'Active' as const
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Vendor Name</Label>
          <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} required />
        </div>
        <div className="space-y-2">
          <Label>Contact Name</Label>
          <Input value={formData.contact_name} onChange={(e) => setFormData(p => ({ ...p, contact_name: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={formData.phone} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Payment Terms</Label>
          <Select value={formData.payment_terms} onValueChange={(v) => setFormData(p => ({ ...p, payment_terms: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="COD">COD</SelectItem>
              <SelectItem value="Net 15">Net 15</SelectItem>
              <SelectItem value="Net 30">Net 30</SelectItem>
              <SelectItem value="Net 45">Net 45</SelectItem>
              <SelectItem value="Net 60">Net 60</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Lead Time (days)</Label>
          <Input type="number" value={formData.lead_time_days} onChange={(e) => setFormData(p => ({ ...p, lead_time_days: parseInt(e.target.value) || 0 }))} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(v: any) => setFormData(p => ({ ...p, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="On-Hold">On-Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Add Vendor</Button>
      </div>
    </form>
  );
};
