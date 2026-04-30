import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Shield, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTeamData } from "@/hooks/use-team-data";
import type { TeamMemberRow } from "@/hooks/use-team-data";
import { DEFAULT_PERMISSIONS } from "./team/types";
import { InviteMemberDialog } from "./team/InviteMemberDialog";
import { EditMemberDialog } from "./team/EditMemberDialog";
import { TeamMemberCard } from "./team/TeamMemberCard";
import { PermissionsManager } from "./team/PermissionsManager";
import { ScheduleView } from "./team/ScheduleView";

export const TeamManagement = () => {
  const {
    members, templates, businessHours, schedules, timeEntries, loading,
    addMember, updateMember, toggleMemberStatus,
    addTemplate, updateTemplate, deleteTemplate, duplicateTemplate,
    addSchedule, deleteSchedule,
  } = useTeamData();

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberRow | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [activeTab, setActiveTab] = useState("members");
  const { toast } = useToast();

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || member.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const handleInviteMember = async (memberData: any) => {
    const templatePerms = memberData.template_id
      ? templates.find(t => t.id === memberData.template_id)?.permissions || {}
      : {};

    await addMember({
      name: memberData.name,
      email: memberData.email,
      phone: memberData.phone,
      role: memberData.role || "employee",
      hourly_rate: memberData.hourly_rate,
      permissions: templatePerms,
      permission_template_id: memberData.template_id || null,
    } as any);

    setIsInviteDialogOpen(false);
    toast({
      title: memberData.source === "existing_user" ? "User Added" : "Invitation Sent",
      description: `${memberData.name} has been added to the team`,
    });
  };

  const handleUpdateMember = async (id: string, data: Partial<TeamMemberRow>) => {
    const success = await updateMember(id, data);
    if (success) {
      setIsEditDialogOpen(false);
      setSelectedMember(null);
      toast({ title: "Member Updated", description: "Team member has been updated" });
    }
  };

  const handleToggleStatus = async (memberId: string) => {
    await toggleMemberStatus(memberId);
    toast({ title: "Status Updated" });
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Team Management
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage staff, roles, permissions, schedules, and templates
            </p>
          </div>
          <Button onClick={() => setIsInviteDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-4 pt-3">
            <TabsList>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Team Members
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Schedule
              </TabsTrigger>
              <TabsTrigger value="permissions" className="flex items-center gap-2">
                <Shield className="w-4 h-4" /> Manage Permissions
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Members Tab */}
          <TabsContent value="members" className="flex-1 overflow-hidden flex flex-col p-4 space-y-4 mt-0">
            <div className="flex gap-4 flex-shrink-0">
              <Input
                placeholder="Search team members..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading team members...</div>
              ) : filteredMembers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No team members found.</p>
                  <p className="text-xs mt-1">Click "Add Member" to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMembers.map(member => (
                    <TeamMemberCard
                      key={member.id}
                      member={member}
                      onEdit={m => { setSelectedMember(m); setIsEditDialogOpen(true); }}
                      onToggleStatus={handleToggleStatus}
                    />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="flex-1 overflow-y-auto p-4 mt-0">
            <ScheduleView
              members={members}
              schedules={schedules}
              timeEntries={timeEntries}
              businessHours={businessHours}
              onAddSchedule={addSchedule}
              onDeleteSchedule={deleteSchedule}
            />
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="flex-1 overflow-y-auto p-4 mt-0">
            <PermissionsManager
              permissions={DEFAULT_PERMISSIONS}
              templates={templates}
              onAddTemplate={addTemplate}
              onUpdateTemplate={updateTemplate}
              onDeleteTemplate={deleteTemplate}
              onDuplicateTemplate={duplicateTemplate}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <InviteMemberDialog
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
        templates={templates}
        onSubmit={handleInviteMember}
      />

      {selectedMember && (
        <EditMemberDialog
          open={isEditDialogOpen}
          onOpenChange={open => { setIsEditDialogOpen(open); if (!open) setSelectedMember(null); }}
          member={selectedMember}
          templates={templates}
          businessHours={businessHours}
          onSubmit={handleUpdateMember}
        />
      )}
    </div>
  );
};
