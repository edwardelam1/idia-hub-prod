import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Users, ShieldCheck, MoreVertical, UserPlus, Building2, Key, AlertCircle,
  Nfc, Radio, Ghost, UserCircle2, Loader2, Trash2,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { getBusinessId } from '@/lib/business-access';

type PlatformRole = 'Org Admin' | 'Team Lead' | 'Team Member';

interface EmployeeRow {
  id: string;
  business_id: string;
  user_id: string | null;
  name: string;
  platform_role: PlatformRole;
  status: string;
  is_ephemeral: boolean;
  aca_secured: boolean;
  platform_guid?: string | null;
  created_at: string;
}

const NDEFReaderAvailable = (): boolean =>
  typeof window !== 'undefined' && 'NDEFReader' in window;

const newInstanceId = () => Math.random().toString(36).slice(2, 10);

export default function TeamManagement() {
  const { toast } = useToast();
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisionRole, setProvisionRole] = useState<PlatformRole>('Team Member');
  const [nfcArmed, setNfcArmed] = useState(false);
  const [nfcAbort, setNfcAbort] = useState<AbortController | null>(null);

  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false);
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);

  // Resolve active business
  useEffect(() => {
    let alive = true;
    getBusinessId().then((id) => { if (alive) setBusinessId(id ?? null); });
    return () => { alive = false; };
  }, []);

  const loadRoster = useCallback(async (bId: string) => {
    setLoading(true);
    const { data: emps, error } = await (supabase as any)
      .from('employees')
      .select('id,business_id,user_id,name,platform_role,status,is_ephemeral,aca_secured,created_at')
      .eq('business_id', bId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[TeamManagement.loadRoster]', error.message);
      toast({ title: 'Failed to load roster', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const userIds = (emps ?? []).map((e: any) => e.user_id).filter(Boolean);
    let guidMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profs } = await (supabase as any)
        .from('profiles')
        .select('user_id,platform_guid')
        .in('user_id', userIds);
      (profs ?? []).forEach((p: any) => guidMap.set(p.user_id, p.platform_guid));
    }
    setRows((emps ?? []).map((e: any) => ({ ...e, platform_guid: e.user_id ? guidMap.get(e.user_id) : null })));
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (!businessId) return;
    loadRoster(businessId);
    const channel = supabase
      .channel(`employees:${businessId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'employees', filter: `business_id=eq.${businessId}` },
        () => loadRoster(businessId))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [businessId, loadRoster]);

  // ----- NFC handshake -----
  const handleNfcProvisioning = useCallback(async () => {
    const inst = newInstanceId();
    console.log(`[BEGIN: TeamManagement.handleNfcProvisioning] instance=${inst}`);
    if (!businessId) return;
    if (!NDEFReaderAvailable()) {
      toast({
        title: 'NFC Unavailable on This Device',
        description: 'Use a Web NFC-capable browser. For unauthenticated workers, issue an Ephemeral Profile instead.',
        variant: 'destructive',
      });
      console.log(`[END: TeamManagement.handleNfcProvisioning] instance=${inst} reason=no_nfc`);
      return;
    }
    try {
      const ctrl = new AbortController();
      setNfcAbort(ctrl);
      setNfcArmed(true);
      // @ts-ignore - Web NFC types not in lib.dom
      const reader = new (window as any).NDEFReader();
      await reader.scan({ signal: ctrl.signal });
      reader.onreadingerror = () => {
        toast({ title: 'NFC Read Error', description: 'Could not read tag.', variant: 'destructive' });
      };
      reader.onreading = async (event: any) => {
        try {
          const dec = new TextDecoder();
          let guid: string | null = null;
          for (const rec of event.message.records) {
            const txt = dec.decode(rec.data);
            const match = txt.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
            if (match) { guid = match[0]; break; }
          }
          if (!guid) throw new Error('No platform_guid on tag');
          const { data, error } = await (supabase as any).rpc('provision_employee_via_aca', {
            _business_id: businessId,
            _platform_guid: guid,
            _platform_role: provisionRole,
          });
          if (error) throw error;
          toast({ title: 'ACA Bound', description: `Provisioned as ${provisionRole}` });
          setProvisionOpen(false);
          ctrl.abort();
          setNfcArmed(false);
        } catch (e: any) {
          const msg = e?.message ?? 'Unknown error';
          const friendly = msg.includes('ACA_NOT_FOUND')
            ? 'This ACA is not registered with IDIA Life. Provisioning rejected.'
            : msg.includes('ALREADY_PROVISIONED')
              ? 'This identity is already on the team.'
              : msg.includes('NOT_ORG_ADMIN')
                ? 'Only an Org Admin can provision team members.'
                : msg;
          toast({ title: 'Provisioning Failed', description: friendly, variant: 'destructive' });
        }
      };
    } catch (e: any) {
      console.error(`[TeamManagement.handleNfcProvisioning] instance=${inst}`, e?.message, e?.stack);
      toast({ title: 'NFC Error', description: e?.message ?? 'Could not start NFC scan.', variant: 'destructive' });
      setNfcArmed(false);
    }
    console.log(`[END: TeamManagement.handleNfcProvisioning] instance=${inst}`);
  }, [businessId, provisionRole, toast]);

  const cancelNfc = useCallback(() => {
    nfcAbort?.abort();
    setNfcAbort(null);
    setNfcArmed(false);
  }, [nfcAbort]);

  // ----- Ephemeral guest -----
  const handleProvisionEphemeral = useCallback(async () => {
    const inst = newInstanceId();
    console.log(`[BEGIN: TeamManagement.handleProvisionEphemeral] instance=${inst}`);
    if (!businessId) return;
    const { error } = await (supabase as any).rpc('provision_ephemeral_employee', { _business_id: businessId });
    if (error) {
      toast({ title: 'Failed to Issue Ephemeral Profile', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ephemeral Profile Issued', description: 'Unauthenticated Team Member added.' });
      setProvisionOpen(false);
    }
    console.log(`[END: TeamManagement.handleProvisionEphemeral] instance=${inst}`);
  }, [businessId, toast]);

  // ----- Revoke -----
  const handleRevoke = useCallback(async (employeeId: string) => {
    const inst = newInstanceId();
    console.log(`[BEGIN: TeamManagement.handleRevoke] instance=${inst} id=${employeeId}`);
    const { error } = await (supabase as any).rpc('revoke_employee', { _employee_id: employeeId });
    if (error) {
      if (error.message?.includes('LAST_ORG_ADMIN_DELETE_ORG')) {
        setPendingRevokeId(employeeId);
        setDeleteOrgOpen(true);
      } else {
        toast({ title: 'Revoke Failed', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Access Revoked' });
    }
    console.log(`[END: TeamManagement.handleRevoke] instance=${inst}`);
  }, [toast]);

  const handleConfirmDeleteOrg = useCallback(async () => {
    const inst = newInstanceId();
    console.log(`[BEGIN: TeamManagement.handleConfirmDeleteOrg] instance=${inst}`);
    if (!businessId) return;
    const { error } = await (supabase as any).from('businesses').delete().eq('id', businessId);
    if (error) {
      toast({ title: 'Delete Organization Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Organization Deleted', description: 'All members and resources have been removed.' });
      setRows([]);
      setBusinessId(null);
    }
    setDeleteOrgOpen(false);
    setPendingRevokeId(null);
    console.log(`[END: TeamManagement.handleConfirmDeleteOrg] instance=${inst}`);
  }, [businessId, toast]);

  const getRoleBadge = (role: PlatformRole) => {
    if (role === 'Org Admin')
      return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100"><Key className="w-3 h-3 mr-1"/> Org Admin</Badge>;
    if (role === 'Team Lead')
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Team Lead</Badge>;
    return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">Team Member</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Enterprise Team Management
          </h1>
          <p className="text-muted-foreground mt-1">
            PII-free 3-tier hierarchy. Permanent members must hold an active IDIA Life ACA.
          </p>
        </div>

        <Dialog open={provisionOpen} onOpenChange={(o) => { if (!o) cancelNfc(); setProvisionOpen(o); }}>
          <Button onClick={() => setProvisionOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Provision Access
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Nfc className="h-5 w-5 text-primary" /> Provision Access
              </DialogTitle>
              <DialogDescription>
                Tap an IDIA Life-issued NFC card to bind an existing ACA. No PII is collected. For unauthenticated day workers, issue an Ephemeral Profile.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>Every organization must keep at least one Org Admin. Revoking the last Org Admin will trigger organization deletion.</p>
              </div>

              <div className="space-y-2">
                <Label>Platform Role</Label>
                <Select value={provisionRole} onValueChange={(v) => setProvisionRole(v as PlatformRole)} disabled={nfcArmed}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Org Admin">Org Admin (Ownership)</SelectItem>
                    <SelectItem value="Team Lead">Team Lead (Management)</SelectItem>
                    <SelectItem value="Team Member">Team Member (Non-management)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {nfcArmed ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6 border rounded-lg bg-muted/30">
                  <Radio className="h-8 w-8 text-primary animate-pulse" />
                  <p className="text-sm font-medium">Listening for ACA tap…</p>
                  <p className="text-xs text-muted-foreground">Hold the IDIA Life card to the device.</p>
                  <Button variant="ghost" size="sm" onClick={cancelNfc}>Cancel</Button>
                </div>
              ) : (
                <Button onClick={handleNfcProvisioning} className="w-full" disabled={!businessId}>
                  <Nfc className="mr-2 h-4 w-4" /> Trigger NFC Pairing
                </Button>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-col gap-2">
              <div className="w-full border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2">No NFC available or temporary worker?</p>
                <Button variant="outline" className="w-full" onClick={handleProvisionEphemeral} disabled={!businessId || nfcArmed}>
                  <Ghost className="mr-2 h-4 w-4" /> Issue Ephemeral Profile (Guest Account)
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Active Profiles
          </CardTitle>
          <CardDescription>All members in this organization. ACA-secured rows resolve to a verified IDIA Life identity.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                <tr>
                  <th className="px-6 py-4 font-medium">User Profile</th>
                  <th className="px-6 py-4 font-medium">Platform Role</th>
                  <th className="px-6 py-4 font-medium">ACA Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading roster…
                  </td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    No profiles yet. Use "Provision Access" to add your first member.
                  </td></tr>
                ) : rows.map((u) => (
                  <tr key={u.id} className="bg-background hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={u.is_ephemeral ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'}>
                            {u.is_ephemeral ? <Ghost className="h-4 w-4" /> : <UserCircle2 className="h-4 w-4" />}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{u.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.is_ephemeral ? 'Guest Account' : 'IDIA Life Member'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(u.platform_role)}</td>
                    <td className="px-6 py-4">
                      {u.aca_secured && u.platform_guid ? (
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1 text-green-600 font-medium text-xs">
                            <ShieldCheck className="h-4 w-4" /> ACA Secured
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            idx-{u.platform_guid.slice(0, 4)}-{u.platform_guid.slice(9, 13)}
                          </span>
                        </div>
                      ) : u.is_ephemeral ? (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          <Ghost className="h-3 w-3 mr-1" /> Unauthenticated / Ephemeral Access
                        </Badge>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 font-medium text-xs">
                          <AlertCircle className="h-4 w-4" /> Pending ACA Link
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem disabled>Edit Role</DropdownMenuItem>
                          <DropdownMenuItem disabled>View Telemetry Log</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleRevoke(u.id)}
                          >
                            Revoke Access
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOrgOpen} onOpenChange={setDeleteOrgOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" /> Delete Organization?
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are revoking access for the <strong>last remaining Org Admin</strong>. An organization cannot exist without ownership.
              Confirming will <strong>permanently delete the entire organization</strong>, including all team members, schedules, and associated business records. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRevokeId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteOrg} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
