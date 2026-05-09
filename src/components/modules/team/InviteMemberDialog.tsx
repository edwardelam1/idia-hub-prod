import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fingerprint, UserPlus } from "lucide-react";
import type { PermissionTemplateRow } from "@/hooks/use-team-data";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: PermissionTemplateRow[];
  onSubmit: (data: any) => void;
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const InviteMemberDialog = ({ open, onOpenChange, templates, onSubmit }: InviteMemberDialogProps) => {
  const [guid, setGuid] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<"org_admin" | "team_lead" | "team_member">("team_member");
  const [templateId, setTemplateId] = useState<string>("");
  const guidValid = GUID_RE.test(guid.trim());

  const reset = () => {
    setGuid("");
    setJobTitle("");
    setRole("team_member");
    setTemplateId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guidValid) return;
    onSubmit({
      platform_guid: guid.trim().toLowerCase(),
      job_title: jobTitle.trim() || null,
      name: jobTitle.trim() || "ACA Member",
      role,
      template_id: templateId,
      source: "aca_provision",
    });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Provision Team Member
          </DialogTitle>
          <DialogDescription>
            Add an existing IDIA Life identity to this organization by their Platform GUID.
            No PII is stored — only the anonymous identifier.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Fingerprint className="w-3.5 h-3.5" /> Platform GUID
            </Label>
            <Input
              value={guid}
              onChange={e => setGuid(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="font-mono text-xs"
              autoFocus
            />
            {guid && !guidValid && (
              <p className="text-xs text-destructive">Not a valid UUID v4 format.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="e.g. Head of Operations"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={v => setRole(v as typeof role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="org_admin">Org Admin</SelectItem>
                  <SelectItem value="team_lead">Team Lead</SelectItem>
                  <SelectItem value="team_member">Team Member</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Permission Template (optional)</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
              <SelectContent>
                {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!guidValid}>
              <UserPlus className="w-4 h-4 mr-2" /> Provision via ACA
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
