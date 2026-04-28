import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Landmark, Plus, Trash2, History, Percent, Link2, AlertCircle, Loader2 } from "lucide-react";

const BUSINESS_ID = "550e8400-e29b-41d4-a716-446655440001";

interface BankAccount {
  id?: string;
  label: string;
  bank_name: string;
  account_holder: string;
  routing_number: string;
  account_number: string;
  account_type: string;
  direct_deposit_enabled: boolean;
  deposit_split_pct: number;
  is_primary: boolean;
  plaid_account_id: string;
  plaid_institution_id: string;
  verification_status: string;
}

interface HistoryEntry {
  id: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  performed_by: string;
  created_at: string;
}

const emptyAccount = (): BankAccount => ({
  label: "",
  bank_name: "",
  account_holder: "",
  routing_number: "",
  account_number: "",
  account_type: "checking",
  direct_deposit_enabled: false,
  deposit_split_pct: 100,
  is_primary: false,
  plaid_account_id: "",
  plaid_institution_id: "",
  verification_status: "manual",
});

interface BankSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BankSettingsModal = ({ isOpen, onClose }: BankSettingsModalProps) => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState("accounts");
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadAll();
      setEditingIdx(null);
      setActiveTab("accounts");
    }
  }, [isOpen]);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [acctRes, histRes] = await Promise.all([
        supabase.from("bank_settings").select("*").eq("business_id", BUSINESS_ID).order("is_primary", { ascending: false }),
        supabase.from("bank_settings_history").select("*").eq("business_id", BUSINESS_ID).order("created_at", { ascending: false }).limit(50),
      ]);

      if (acctRes.data && acctRes.data.length > 0) {
        setAccounts(acctRes.data.map((a: any) => ({
          id: a.id,
          label: a.label || "Primary",
          bank_name: a.bank_name || "",
          account_holder: a.account_holder || "",
          routing_number: a.routing_number || "",
          account_number: a.account_number || "",
          account_type: a.account_type || "checking",
          direct_deposit_enabled: a.direct_deposit_enabled || false,
          deposit_split_pct: a.deposit_split_pct ?? 100,
          is_primary: a.is_primary || false,
          plaid_account_id: a.plaid_account_id || "",
          plaid_institution_id: a.plaid_institution_id || "",
          verification_status: a.verification_status || "manual",
        })));
      } else {
        setAccounts([{ ...emptyAccount(), label: "Primary", is_primary: true }]);
        setEditingIdx(0);
      }

      if (histRes.data) setHistory(histRes.data as HistoryEntry[]);
    } catch {
      toast({ title: "Error loading bank settings", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const updateAccount = (idx: number, field: keyof BankAccount, value: any) => {
    setAccounts(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  };

  const addAccount = () => {
    const newAcct = { ...emptyAccount(), label: `Account ${accounts.length + 1}` };
    setAccounts(prev => [...prev, newAcct]);
    setEditingIdx(accounts.length);
  };

  const removeAccount = async (idx: number) => {
    const acct = accounts[idx];
    if (acct.is_primary) {
      toast({ title: "Cannot remove primary account", variant: "destructive" });
      return;
    }
    if (acct.id) {
      await supabase.from("bank_settings").delete().eq("id", acct.id);
      await logHistory(acct.id, "deleted", null, acct.label, null);
    }
    setAccounts(prev => prev.filter((_, i) => i !== idx));
    setEditingIdx(null);
    toast({ title: "Account removed" });
  };

  const setPrimary = (idx: number) => {
    setAccounts(prev => prev.map((a, i) => ({ ...a, is_primary: i === idx })));
  };

  const splitTotal = accounts.reduce((s, a) => s + (a.deposit_split_pct || 0), 0);
  const splitValid = Math.abs(splitTotal - 100) < 0.01;

  const logHistory = async (bankSettingId: string | undefined, action: string, field: string | null, oldVal: string | null, newVal: string | null) => {
    await supabase.from("bank_settings_history").insert({
      business_id: BUSINESS_ID,
      bank_setting_id: bankSettingId || null,
      action,
      field_changed: field,
      old_value: oldVal,
      new_value: newVal,
      performed_by: "System",
    });
  };

  const handleSave = async () => {
    if (!splitValid) {
      toast({ title: "Deposit splits must total 100%", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      for (const acct of accounts) {
        const payload: any = {
          business_id: BUSINESS_ID,
          label: acct.label || "Untitled",
          bank_name: acct.bank_name,
          account_holder: acct.account_holder,
          routing_number: acct.routing_number,
          account_number: acct.account_number,
          account_type: acct.account_type,
          direct_deposit_enabled: acct.direct_deposit_enabled,
          deposit_split_pct: acct.deposit_split_pct,
          is_primary: acct.is_primary,
          plaid_account_id: acct.plaid_account_id,
          plaid_institution_id: acct.plaid_institution_id,
          verification_status: acct.verification_status,
          updated_at: new Date().toISOString(),
        };

        if (acct.id) {
          await supabase.from("bank_settings").update(payload).eq("id", acct.id);
          await logHistory(acct.id, "updated", null, null, null);
        } else {
          const { data } = await supabase.from("bank_settings").insert(payload).select("id").single();
          if (data) {
            acct.id = data.id;
            await logHistory(data.id, "created", null, null, acct.label);
          }
        }
      }

      toast({ title: "Bank settings saved" });
      setEditingIdx(null);
      loadAll();
    } catch {
      toast({ title: "Error saving", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const mask = (val: string) => val.length > 4 ? "••••" + val.slice(-4) : val;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-base">
            <Landmark className="w-4 h-4 mr-2" />
            Bank Information
          </DialogTitle>
          <DialogDescription className="text-xs">
            Manage bank accounts, deposit splits, and Plaid connections
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-8">
            <TabsTrigger value="accounts" className="text-xs flex-1">Accounts</TabsTrigger>
            <TabsTrigger value="splits" className="text-xs flex-1">Deposit Splits</TabsTrigger>
            <TabsTrigger value="history" className="text-xs flex-1">History</TabsTrigger>
          </TabsList>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="space-y-3 mt-3">
            {/* Account List */}
            {accounts.map((acct, idx) => (
              <div
                key={idx}
                className={`rounded-lg border p-3 cursor-pointer transition-colors ${editingIdx === idx ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{acct.label || "Untitled"}</span>
                    {acct.is_primary && <Badge className="text-[10px] h-4">Primary</Badge>}
                    {acct.plaid_account_id && (
                      <Badge variant="outline" className="text-[10px] h-4">
                        <Link2 className="w-2.5 h-2.5 mr-0.5" />Plaid
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] h-4">
                      {acct.verification_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{acct.deposit_split_pct}%</span>
                    {!acct.is_primary && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); removeAccount(idx); }}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {acct.bank_name || "No bank"} • {acct.account_type} • {acct.account_number ? mask(acct.account_number) : "No account"}
                </p>

                {/* Expanded edit form */}
                {editingIdx === idx && (
                  <div className="mt-3 space-y-3 border-t pt-3" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input className="h-8 text-xs" value={acct.label} onChange={(e) => updateAccount(idx, "label", e.target.value)} placeholder="e.g. Payroll Account" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Bank Name</Label>
                        <Input className="h-8 text-xs" value={acct.bank_name} onChange={(e) => updateAccount(idx, "bank_name", e.target.value)} placeholder="Chase, Wells Fargo" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Account Holder</Label>
                      <Input className="h-8 text-xs" value={acct.account_holder} onChange={(e) => updateAccount(idx, "account_holder", e.target.value)} placeholder="Business legal name" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Routing Number</Label>
                        <Input className="h-8 text-xs" value={acct.routing_number} onChange={(e) => updateAccount(idx, "routing_number", e.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="9 digits" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Account Number</Label>
                        <Input className="h-8 text-xs" value={acct.account_number} onChange={(e) => updateAccount(idx, "account_number", e.target.value.replace(/\D/g, "").slice(0, 17))} placeholder="Account number" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Account Type</Label>
                        <Select value={acct.account_type} onValueChange={(v) => updateAccount(idx, "account_type", v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checking" className="text-xs">Checking</SelectItem>
                            <SelectItem value="savings" className="text-xs">Savings</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end pb-1">
                        <div className="flex items-center gap-2">
                          <Switch checked={acct.direct_deposit_enabled} onCheckedChange={(v) => updateAccount(idx, "direct_deposit_enabled", v)} />
                          <span className="text-xs">Direct Deposit</span>
                        </div>
                      </div>
                    </div>

                    {!acct.is_primary && (
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setPrimary(idx)}>
                        Set as Primary
                      </Button>
                    )}

                    {/* Plaid Ready Section */}
                    <div className="rounded-lg border border-dashed p-2 bg-muted/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Link2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Plaid Connection</span>
                      </div>
                      {acct.plaid_account_id ? (
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p>Institution: {acct.plaid_institution_id || "—"}</p>
                          <p>Account: {mask(acct.plaid_account_id)}</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">
                          Plaid integration coming soon. Connect your bank for instant verification and real-time balance updates.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Button variant="outline" size="sm" className="w-full text-xs h-8" onClick={addAccount}>
              <Plus className="w-3 h-3 mr-1" />
              Add Bank Account
            </Button>
          </TabsContent>

          {/* Deposit Splits Tab */}
          <TabsContent value="splits" className="space-y-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">Allocate how deposits are split across accounts</p>
              <Badge variant={splitValid ? "default" : "destructive"} className="text-xs">
                {splitTotal.toFixed(1)}% / 100%
              </Badge>
            </div>

            {!splitValid && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2">
                <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                <p className="text-xs text-destructive">Splits must total exactly 100%</p>
              </div>
            )}

            {accounts.map((acct, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg border px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{acct.label || "Untitled"}</p>
                  <p className="text-[10px] text-muted-foreground">{acct.bank_name || "No bank"} • {mask(acct.account_number || "—")}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-20 h-7 text-xs text-right"
                    value={acct.deposit_split_pct}
                    onChange={(e) => updateAccount(idx, "deposit_split_pct", parseFloat(e.target.value) || 0)}
                  />
                  <Percent className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
            ))}

            {accounts.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => {
                  const even = parseFloat((100 / accounts.length).toFixed(1));
                  setAccounts(prev => prev.map((a, i) => ({
                    ...a,
                    deposit_split_pct: i === 0 ? 100 - even * (accounts.length - 1) : even,
                  })));
                }}
              >
                Split Evenly
              </Button>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-3">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-xs">No history yet</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {history.map((h) => (
                  <div key={h.id} className="flex items-start gap-2 rounded border px-2.5 py-2">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      h.action === "created" ? "bg-success" : h.action === "deleted" ? "bg-destructive" : "bg-primary"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium capitalize">{h.action}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(h.created_at)}</span>
                      </div>
                      {h.field_changed && (
                        <p className="text-[10px] text-muted-foreground">
                          {h.field_changed}: {h.old_value || "—"} → {h.new_value || "—"}
                        </p>
                      )}
                      {h.new_value && !h.field_changed && (
                        <p className="text-[10px] text-muted-foreground">{h.new_value}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">by {h.performed_by}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Save Actions */}
        <div className="flex justify-end gap-2 pt-1 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || !splitValid}>
            {isSaving ? "Saving..." : "Save All"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
