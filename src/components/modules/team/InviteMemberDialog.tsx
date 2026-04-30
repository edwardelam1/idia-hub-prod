import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { PermissionTemplateRow } from "@/hooks/use-team-data";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: PermissionTemplateRow[];
  onSubmit: (data: any) => void;
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
}

export const InviteMemberDialog = ({ open, onOpenChange, templates, onSubmit }: InviteMemberDialogProps) => {
  const [tab, setTab] = useState<string>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [manualForm, setManualForm] = useState({
    name: "", email: "", phone: "", role: "employee" as const, hourly_rate: "", template_id: "",
  });
  const [assignRole, setAssignRole] = useState<string>("employee");
  const [assignTemplate, setAssignTemplate] = useState<string>("");

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setSelectedUser(null);
    if (query.length < 2) { setSearchResults([]); return; }

    setSearching(true);
    try {
      // Search existing team members across all businesses as a proxy for IDIA Life users
      const { data } = await supabase
        .from("team_members")
        .select("id, name, email")
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
      setSearchResults((data as SearchResult[]) || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchSubmit = () => {
    if (!selectedUser) return;
    onSubmit({
      name: selectedUser.name,
      email: selectedUser.email,
      role: assignRole,
      template_id: assignTemplate,
      source: "existing_user",
    });
    resetState();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...manualForm,
      hourly_rate: manualForm.hourly_rate ? parseFloat(manualForm.hourly_rate) : undefined,
      source: "manual",
    });
    resetState();
  };

  const resetState = () => {
    setSearchQuery("");
    setSelectedUser(null);
    setSearchResults([]);
    setManualForm({ name: "", email: "", phone: "", role: "employee", hourly_rate: "", template_id: "" });
    setAssignRole("employee");
    setAssignTemplate("");
    setTab("search");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Add Team Member
          </DialogTitle>
          <DialogDescription>Search for an existing IDIA Life user or manually add a new team member</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" /> Find IDIA Life User
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Manual Add
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Search by name or email</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search IDIA Life users..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {searchQuery.length >= 2 && (
              <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                {searching ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No users found. Try the manual add option.</div>
                ) : (
                  searchResults.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      className={`w-full flex items-center gap-3 p-3 text-left hover:bg-accent/50 transition-colors ${selectedUser?.id === user.id ? "bg-accent" : ""}`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {user.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      {selectedUser?.id === user.id && <Badge variant="default" className="text-xs">Selected</Badge>}
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedUser && (
              <div className="space-y-4 pt-2 border-t">
                <div className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary">
                    {selectedUser.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-medium">{selectedUser.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={assignRole} onValueChange={setAssignRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="owner">Owner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Permission Template</Label>
                    <Select value={assignTemplate} onValueChange={setAssignTemplate}>
                      <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                      <SelectContent>
                        {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button onClick={handleSearchSubmit}>
                    <UserPlus className="w-4 h-4 mr-2" /> Add to Team
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="m-name">Full Name</Label>
                  <Input id="m-name" value={manualForm.name} onChange={e => setManualForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="m-email">Email Address</Label>
                  <Input id="m-email" type="email" value={manualForm.email} onChange={e => setManualForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="m-phone">Phone Number</Label>
                  <Input id="m-phone" value={manualForm.phone} onChange={e => setManualForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={manualForm.role} onValueChange={(v: any) => setManualForm(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="m-rate">Hourly Rate ($)</Label>
                  <Input id="m-rate" type="number" step="0.01" value={manualForm.hourly_rate} onChange={e => setManualForm(p => ({ ...p, hourly_rate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Permission Template</Label>
                  <Select value={manualForm.template_id} onValueChange={v => setManualForm(p => ({ ...p, template_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                    <SelectContent>
                      {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-2" /> Send Invitation
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
