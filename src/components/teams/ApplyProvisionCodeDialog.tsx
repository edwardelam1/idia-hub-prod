import { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, KeyRound, Unlink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProvisionBlueprint {
  id: string;
  code: string;
  label: string | null;
  status: string;
  assigned_employee_id: string | null;
  assigned_at: string | null;
  created_at: string;
}

interface ApplyProvisionCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string | null;
  employeeName: string;
  businessId: string | null;
  onApplied?: () => void;
}

export function ApplyProvisionCodeDialog({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  businessId,
  onApplied,
}: ApplyProvisionCodeDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [available, setAvailable] = useState<ProvisionBlueprint[]>([]);
  const [current, setCurrent] = useState<ProvisionBlueprint | null>(null);
  const [selectedCode, setSelectedCode] = useState<string>("");

  const load = useCallback(async () => {
    if (!businessId || !employeeId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("device_provisioning_blueprints")
      .select("id,code,label,status,assigned_employee_id,assigned_at,created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load codes", description: error.message, variant: "destructive" });
      return;
    }
    const rows = (data ?? []) as ProvisionBlueprint[];
    setCurrent(rows.find((r) => r.assigned_employee_id === employeeId) ?? null);
    setAvailable(rows.filter((r) => r.status === "active" && !r.assigned_employee_id));
    setSelectedCode("");
  }, [businessId, employeeId, toast]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleApply = async () => {
    if (!employeeId || !selectedCode) return;
    setSubmitting(true);
    const { error } = await (supabase as any).rpc("assign_provisioning_code", {
      _employee_id: employeeId,
      _code: selectedCode,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Assignment Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Provisioning Code Applied", description: `${selectedCode} → ${employeeName}` });
    onApplied?.();
    onOpenChange(false);
  };

  const handleUnassign = async () => {
    if (!current) return;
    setSubmitting(true);
    const { error } = await (supabase as any).rpc("unassign_provisioning_code", {
      _code: current.code,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Unassign Failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Provisioning Code Released", description: current.code });
    onApplied?.();
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" /> Apply Provisioning Code
          </DialogTitle>
          <DialogDescription>
            Bind an ACTIVE provisioning code from the code log to <strong>{employeeName}</strong>. The employee then
            uses this code to pair an IDIA Pay terminal.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading codes…
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {current && (
              <div className="flex items-start justify-between gap-2 p-3 border rounded-lg bg-muted/30">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Currently assigned</p>
                  <p className="font-mono text-sm truncate">{current.code}</p>
                  {current.label && (
                    <p className="text-xs text-muted-foreground truncate">{current.label}</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleUnassign} disabled={submitting}>
                  <Unlink className="h-3.5 w-3.5 mr-1" /> Release
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>Available ACTIVE codes</Label>
              {available.length === 0 ? (
                <p className="text-xs text-muted-foreground border rounded-lg p-3">
                  No unassigned ACTIVE provisioning codes for this business. Generate one from the Provisioning code
                  log first.
                </p>
              ) : (
                <Select value={selectedCode} onValueChange={setSelectedCode} disabled={submitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a code…" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((b) => (
                      <SelectItem key={b.id} value={b.code}>
                        <span className="font-mono">{b.code}</span>
                        {b.label ? <span className="text-muted-foreground"> — {b.label}</span> : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!selectedCode || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Apply Code
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}