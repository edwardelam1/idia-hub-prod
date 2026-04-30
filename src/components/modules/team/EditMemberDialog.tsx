import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { User, DollarSign, Shield, Calendar, Monitor, Wrench, Database } from "lucide-react";
import { DEFAULT_PERMISSIONS } from "./types";
import type { TeamMemberRow, BusinessHoursRow, PermissionTemplateRow } from "@/hooks/use-team-data";

interface EditMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: TeamMemberRow;
  templates: PermissionTemplateRow[];
  businessHours: BusinessHoursRow[];
  onSubmit: (id: string, data: Partial<TeamMemberRow>) => void;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const categoryIcons: Record<string, React.ReactNode> = {
  screens: <Monitor className="w-4 h-4" />,
  functions: <Wrench className="w-4 h-4" />,
  data: <Database className="w-4 h-4" />,
};

const categoryLabels: Record<string, string> = {
  screens: "Screen Access",
  functions: "Function Access",
  data: "Data Access",
};

export const EditMemberDialog = ({ open, onOpenChange, member, templates, businessHours, onSubmit }: EditMemberDialogProps) => {
  const [form, setForm] = useState<Partial<TeamMemberRow>>({});
  const [activeTab, setActiveTab] = useState("personal");

  useEffect(() => {
    if (member) {
      setForm({ ...member });
      setActiveTab("personal");
    }
  }, [member]);

  const handleSubmit = () => {
    onSubmit(member.id, form);
  };

  const updateField = <K extends keyof TeamMemberRow>(key: K, value: TeamMemberRow[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handlePermissionChange = (key: string, enabled: boolean) => {
    const perms = { ...(form.permissions || {}) };
    perms[key] = enabled;
    updateField("permissions", perms);
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      updateField("permissions", { ...template.permissions });
      updateField("permission_template_id", templateId);
    }
  };

  const groupedPermissions = DEFAULT_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof DEFAULT_PERMISSIONS>);

  const permissions = form.permissions || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Edit Team Member — {member.name}
          </DialogTitle>
          <DialogDescription>Update member details across all categories</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="personal" className="flex items-center gap-1 text-xs sm:text-sm">
              <User className="w-3.5 h-3.5" /> Personal
            </TabsTrigger>
            <TabsTrigger value="pay" className="flex items-center gap-1 text-xs sm:text-sm">
              <DollarSign className="w-3.5 h-3.5" /> Pay Info
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-1 text-xs sm:text-sm">
              <Shield className="w-3.5 h-3.5" /> Permissions
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-1 text-xs sm:text-sm">
              <Calendar className="w-3.5 h-3.5" /> Schedule
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
            {/* Personal Info Tab */}
            <TabsContent value="personal" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={form.name || ""} onChange={e => updateField("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email || ""} onChange={e => updateField("email", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone || ""} onChange={e => updateField("phone", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Hire Date</Label>
                  <Input type="date" value={form.hire_date || ""} onChange={e => updateField("hire_date", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={form.address || ""} onChange={e => updateField("address", e.target.value)} placeholder="Street address" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input value={form.city || ""} onChange={e => updateField("city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input value={form.state || ""} onChange={e => updateField("state", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>ZIP</Label>
                  <Input value={form.zip || ""} onChange={e => updateField("zip", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Emergency Contact Name</Label>
                  <Input value={form.emergency_contact_name || ""} onChange={e => updateField("emergency_contact_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Contact Phone</Label>
                  <Input value={form.emergency_contact_phone || ""} onChange={e => updateField("emergency_contact_phone", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes || ""} onChange={e => updateField("notes", e.target.value)} rows={3} />
              </div>
            </TabsContent>

            {/* Pay Info Tab */}
            <TabsContent value="pay" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Salary Type</Label>
                  <Select value={form.salary_type || "hourly"} onValueChange={v => updateField("salary_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="salary">Salary</SelectItem>
                      <SelectItem value="commission">Commission</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pay Frequency</Label>
                  <Select value={form.pay_frequency || "biweekly"} onValueChange={v => updateField("pay_frequency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                      <SelectItem value="semimonthly">Semi-Monthly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hourly Rate ($)</Label>
                  <Input type="number" step="0.01" value={form.hourly_rate ?? ""} onChange={e => updateField("hourly_rate", parseFloat(e.target.value) || 0)} />
                </div>
                <div className="space-y-2">
                  <Label>Overtime Rate ($)</Label>
                  <Input type="number" step="0.01" value={form.overtime_rate ?? ""} onChange={e => updateField("overtime_rate", parseFloat(e.target.value) || 0)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tax Filing Status</Label>
                  <Select value={form.tax_filing_status || ""} onValueChange={v => updateField("tax_filing_status", v)}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married_filing_jointly">Married Filing Jointly</SelectItem>
                      <SelectItem value="married_filing_separately">Married Filing Separately</SelectItem>
                      <SelectItem value="head_of_household">Head of Household</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Direct Deposit</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Switch
                      checked={form.direct_deposit_enabled || false}
                      onCheckedChange={v => updateField("direct_deposit_enabled", v)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {form.direct_deposit_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="mt-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role || "employee"} onValueChange={v => updateField("role", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Apply Permission Template</Label>
                  <Select value={form.permission_template_id || ""} onValueChange={applyTemplate}>
                    <SelectTrigger><SelectValue placeholder="Select template to apply" /></SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <Badge variant="outline">{Object.values(permissions).filter(Boolean).length}</Badge> of {DEFAULT_PERMISSIONS.length} permissions enabled
              </div>

              {Object.entries(groupedPermissions).map(([category, perms]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      {categoryIcons[category]}
                      {categoryLabels[category]}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        const allEnabled = perms.every(p => permissions[p.key]);
                        perms.forEach(p => handlePermissionChange(p.key, !allEnabled));
                      }}
                    >
                      Toggle All
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {perms.map(perm => (
                      <div key={perm.key} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="text-sm font-medium">{perm.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{perm.description}</p>
                        </div>
                        <Switch
                          checked={!!permissions[perm.key]}
                          onCheckedChange={checked => handlePermissionChange(perm.key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="mt-0 space-y-4">
              <p className="text-sm text-muted-foreground">
                Set this member's availability based on your business hours. Manage detailed shifts on the Schedule tab of Team Management.
              </p>

              {businessHours.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No business hours configured.</p>
                  <p className="text-xs">Set business hours in Settings → Business Profile first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {businessHours.map(bh => (
                    <div key={bh.day_of_week} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-24">{DAY_NAMES[bh.day_of_week]}</span>
                        {bh.is_closed ? (
                          <Badge variant="secondary">Closed</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {bh.open_time} — {bh.close_time}
                          </span>
                        )}
                      </div>
                      {!bh.is_closed && (
                        <Badge variant="outline" className="text-xs">Available</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
