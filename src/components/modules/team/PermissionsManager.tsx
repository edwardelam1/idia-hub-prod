import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Shield, Plus, Edit, Trash2, Copy, Monitor, Wrench, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Permission, DEFAULT_PERMISSIONS } from "./types";
import type { PermissionTemplateRow } from "@/hooks/use-team-data";

interface PermissionsManagerProps {
  permissions: Permission[];
  templates: PermissionTemplateRow[];
  onAddTemplate: (data: { name: string; description: string; permissions: Record<string, boolean> }) => Promise<boolean>;
  onUpdateTemplate: (id: string, data: { name: string; description: string; permissions: Record<string, boolean> }) => Promise<boolean>;
  onDeleteTemplate: (id: string) => Promise<boolean>;
  onDuplicateTemplate: (template: PermissionTemplateRow) => Promise<boolean>;
}

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

export const PermissionsManager = ({ permissions, templates, onAddTemplate, onUpdateTemplate, onDeleteTemplate, onDuplicateTemplate }: PermissionsManagerProps) => {
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PermissionTemplateRow | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", description: "", permissions: {} as Record<string, boolean> });
  const { toast } = useToast();

  const openNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({
      name: "",
      description: "",
      permissions: Object.fromEntries(permissions.map(p => [p.key, false])),
    });
    setIsTemplateDialogOpen(true);
  };

  const openEditTemplate = (template: PermissionTemplateRow) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      description: template.description || "",
      permissions: { ...Object.fromEntries(permissions.map(p => [p.key, false])), ...(template.permissions as Record<string, boolean>) },
    });
    setIsTemplateDialogOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) return;

    if (editingTemplate) {
      const ok = await onUpdateTemplate(editingTemplate.id, templateForm);
      if (ok) toast({ title: "Template Updated", description: `"${templateForm.name}" saved` });
    } else {
      const ok = await onAddTemplate(templateForm);
      if (ok) toast({ title: "Template Created", description: `"${templateForm.name}" created` });
    }
    setIsTemplateDialogOpen(false);
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Permission Templates</TabsTrigger>
          <TabsTrigger value="permissions">All Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Create reusable permission sets to quickly assign to new team members</p>
            <Button size="sm" onClick={openNewTemplate}>
              <Plus className="w-4 h-4 mr-2" /> New Template
            </Button>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No permission templates yet.</p>
              <p className="text-xs mt-1">Create one to streamline team onboarding.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => {
                const perms = (template.permissions || {}) as Record<string, boolean>;
                const enabledCount = Object.values(perms).filter(Boolean).length;
                return (
                  <Card key={template.id} className="relative">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        {template.name}
                        {template.is_system && <Badge variant="outline" className="text-xs">System</Badge>}
                      </CardTitle>
                      <CardDescription className="mt-1">{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1 mb-3">
                        {Object.entries(perms)
                          .filter(([_, v]) => v)
                          .slice(0, 5)
                          .map(([key]) => (
                            <span key={key} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              {key.replace(/_/g, " ")}
                            </span>
                          ))}
                        {enabledCount > 5 && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">+{enabledCount - 5} more</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditTemplate(template)}>
                          <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDuplicateTemplate(template)}>
                          <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate
                        </Button>
                        {!template.is_system && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDeleteTemplate(template.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">All available permissions that can be assigned to team members and templates</p>
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <Card key={category}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  {categoryIcons[category]}
                  {categoryLabels[category]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {perms.map(perm => (
                    <div key={perm.id} className="flex items-start gap-3 p-2 rounded-lg border bg-card">
                      <Shield className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{perm.label}</p>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Template Editor Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Permission Template"}</DialogTitle>
            <DialogDescription>Configure which permissions this template grants</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={templateForm.name} onChange={e => setTemplateForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Shift Lead" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={templateForm.description} onChange={e => setTemplateForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" />
              </div>
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
                      const allEnabled = perms.every(p => templateForm.permissions[p.key]);
                      setTemplateForm(prev => ({
                        ...prev,
                        permissions: {
                          ...prev.permissions,
                          ...Object.fromEntries(perms.map(p => [p.key, !allEnabled])),
                        },
                      }));
                    }}
                  >
                    Toggle All
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {perms.map(perm => (
                    <div key={perm.key} className="flex items-center justify-between p-2 rounded border">
                      <div>
                        <p className="text-sm font-medium">{perm.label}</p>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </div>
                      <Switch
                        checked={!!templateForm.permissions[perm.key]}
                        onCheckedChange={checked => setTemplateForm(prev => ({
                          ...prev,
                          permissions: { ...prev.permissions, [perm.key]: checked },
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveTemplate} disabled={!templateForm.name.trim()}>
                {editingTemplate ? "Save Changes" : "Create Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
