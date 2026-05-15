import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getBusinessId } from '@/lib/business-access';
import TeamManagement from '@/components/teams/TeamManagement';

interface BusinessRow {
  id: string;
  name: string;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
}

export const SettingsBusinessProfile = () => {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BusinessRow>({ id: '', name: '', tax_id: '', email: '', phone: '' });

  useEffect(() => {
    let alive = true;
    (async () => {
      const id = await getBusinessId();
      if (!alive) return;
      if (!id) { setLoading(false); return; }
      setBusinessId(id);
      const { data, error } = await supabase
        .from('businesses')
        .select('id,name,tax_id,email,phone')
        .eq('id', id)
        .maybeSingle();
      if (!alive) return;
      if (error) {
        toast.error(`Failed to load business profile: ${error.message}`);
      } else if (data) {
        setForm(data as BusinessRow);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    const { error } = await supabase
      .from('businesses')
      .update({
        name: form.name,
        tax_id: form.tax_id || null,
        email: form.email || null,
        phone: form.phone || null,
      })
      .eq('id', businessId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Business profile updated');
  };

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Business Entity Profile
          </CardTitle>
          <CardDescription>
            Manage your organization's identity and contact information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !businessId ? (
            <p className="text-sm text-muted-foreground">
              No business entity is associated with this account.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Company Name</Label>
                  <Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tax ID / EIN</Label>
                  <Input
                    value={form.tax_id ?? ''}
                    onChange={(e) => setForm({ ...form, tax_id: e.target.value })}
                    placeholder="XX-XXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact Email</Label>
                  <Input
                    type="email"
                    value={form.email ?? ''}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Contact Phone</Label>
                  <Input
                    value={form.phone ?? ''}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleSave} size="sm" disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Save Changes
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Live team roster — same source as the sidebar Team Management page */}
      <TeamManagement />
    </div>
  );
};
