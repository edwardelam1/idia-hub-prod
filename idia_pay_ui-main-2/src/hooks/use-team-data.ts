import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_PERMISSIONS } from "@/components/modules/team/types";

export interface TeamMemberRow {
  id: string;
  business_id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  hourly_rate: number | null;
  overtime_rate: number | null;
  salary_type: string;
  pay_frequency: string;
  tax_filing_status: string | null;
  direct_deposit_enabled: boolean;
  assigned_locations: string[];
  permissions: Record<string, boolean>;
  permission_template_id: string | null;
  hire_date: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermissionTemplateRow {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHoursRow {
  id: string;
  business_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface ScheduleRow {
  id: string;
  business_id: string;
  team_member_id: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  location: string | null;
  notes: string | null;
  status: string;
  created_at: string;
}

export interface TimeEntryRow {
  id: string;
  business_id: string;
  team_member_id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  total_hours: number | null;
  overtime_hours: number | null;
  location: string | null;
  notes: string | null;
  status: string;
}

export function useTeamData() {
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [templates, setTemplates] = useState<PermissionTemplateRow[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHoursRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const businessId = getBusinessId();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, templatesRes, hoursRes, schedulesRes, entriesRes] = await Promise.all([
        supabase.from("team_members").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
        supabase.from("permission_templates").select("*").eq("business_id", businessId).order("created_at"),
        supabase.from("business_hours").select("*").eq("business_id", businessId).order("day_of_week"),
        supabase.from("team_schedules").select("*").eq("business_id", businessId).order("schedule_date"),
        supabase.from("time_entries").select("*").eq("business_id", businessId).order("clock_in", { ascending: false }),
      ]);

      if (membersRes.data) setMembers(membersRes.data as unknown as TeamMemberRow[]);
      if (templatesRes.data) setTemplates(templatesRes.data as unknown as PermissionTemplateRow[]);
      if (hoursRes.data) setBusinessHours(hoursRes.data as unknown as BusinessHoursRow[]);
      if (schedulesRes.data) setSchedules(schedulesRes.data as unknown as ScheduleRow[]);
      if (entriesRes.data) setTimeEntries(entriesRes.data as unknown as TimeEntryRow[]);
    } catch (err) {
      console.error("Failed to load team data", err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addMember = async (data: Partial<TeamMemberRow>) => {
    const { error, data: newMember } = await supabase.from("team_members").insert({
      business_id: businessId,
      name: data.name || "",
      email: data.email || "",
      phone: data.phone,
      role: data.role || "employee",
      status: "pending",
      hourly_rate: data.hourly_rate || 0,
      permissions: data.permissions || {},
      permission_template_id: data.permission_template_id,
    } as any).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return null; }
    await fetchAll();
    return newMember;
  };

  const updateMember = async (id: string, data: Partial<TeamMemberRow>) => {
    const { error } = await supabase.from("team_members").update({
      ...data,
      updated_at: new Date().toISOString(),
    } as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return false; }
    await fetchAll();
    return true;
  };

  const toggleMemberStatus = async (id: string) => {
    const member = members.find(m => m.id === id);
    if (!member) return;
    const newStatus = member.status === "active" ? "inactive" : "active";
    await updateMember(id, { status: newStatus } as any);
  };

  const addTemplate = async (data: { name: string; description: string; permissions: Record<string, boolean> }) => {
    const { error } = await supabase.from("permission_templates").insert({
      business_id: businessId,
      name: data.name,
      description: data.description,
      permissions: data.permissions,
    } as any).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return false; }
    await fetchAll();
    return true;
  };

  const updateTemplate = async (id: string, data: { name: string; description: string; permissions: Record<string, boolean> }) => {
    const { error } = await supabase.from("permission_templates").update({
      name: data.name,
      description: data.description,
      permissions: data.permissions,
      updated_at: new Date().toISOString(),
    } as any).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return false; }
    await fetchAll();
    return true;
  };

  const deleteTemplate = async (id: string) => {
    const { error } = await supabase.from("permission_templates").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return false; }
    await fetchAll();
    return true;
  };

  const duplicateTemplate = async (template: PermissionTemplateRow) => {
    return addTemplate({
      name: `${template.name} (Copy)`,
      description: template.description || "",
      permissions: template.permissions,
    });
  };

  const saveBusinessHours = async (hours: { day_of_week: number; open_time: string; close_time: string; is_closed: boolean }[]) => {
    // Delete existing and re-insert
    await supabase.from("business_hours").delete().eq("business_id", businessId);
    const inserts = hours.map(h => ({ business_id: businessId, ...h }));
    const { error } = await supabase.from("business_hours").insert(inserts as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return false; }
    await fetchAll();
    return true;
  };

  const addSchedule = async (data: Partial<ScheduleRow>) => {
    const { error } = await supabase.from("team_schedules").insert({
      business_id: businessId,
      team_member_id: data.team_member_id,
      schedule_date: data.schedule_date,
      start_time: data.start_time,
      end_time: data.end_time,
      break_minutes: data.break_minutes || 0,
      location: data.location,
      notes: data.notes,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return false; }
    await fetchAll();
    return true;
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase.from("team_schedules").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return false; }
    await fetchAll();
    return true;
  };

  return {
    members, templates, businessHours, schedules, timeEntries, loading,
    addMember, updateMember, toggleMemberStatus,
    addTemplate, updateTemplate, deleteTemplate, duplicateTemplate,
    saveBusinessHours, addSchedule, deleteSchedule,
    refetch: fetchAll,
  };
}
