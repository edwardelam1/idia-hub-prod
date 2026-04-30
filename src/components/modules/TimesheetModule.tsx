import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, Calendar, DollarSign, CheckCircle, AlertTriangle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBusinessId } from "@/lib/business-access";
import { useToast } from "@/hooks/use-toast";

interface TimeEntry {
  id: string;
  team_member_id: string;
  memberName: string;
  role: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  total_hours: number | null;
  overtime_hours: number | null;
  status: string;
  notes: string | null;
  location: string | null;
}

interface ScheduleRow {
  id: string;
  team_member_id: string;
  memberName: string;
  schedule_date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  status: string;
}

export const TimesheetModule = () => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const businessId = await getBusinessId();
      const [membersRes, entriesRes, schedulesRes] = await Promise.all([
        supabase.from("team_members").select("id, name, role").eq("business_id", businessId),
        supabase.from("time_entries").select("*").eq("business_id", businessId).order("clock_in", { ascending: false }).limit(200),
        supabase.from("team_schedules").select("*").eq("business_id", businessId).order("schedule_date", { ascending: true }).limit(200),
      ]);

      const members = (membersRes.data || []) as any[];
      const memberMap = new Map<string, any>();
      members.forEach(m => memberMap.set(m.id, m));

      const rows: TimeEntry[] = ((entriesRes.data || []) as any[]).map(e => ({
        id: e.id,
        team_member_id: e.team_member_id,
        memberName: memberMap.get(e.team_member_id)?.name || "Unknown",
        role: memberMap.get(e.team_member_id)?.role || "",
        clock_in: e.clock_in,
        clock_out: e.clock_out,
        break_minutes: e.break_minutes || 0,
        total_hours: e.total_hours,
        overtime_hours: e.overtime_hours,
        status: e.status,
        notes: e.notes,
        location: e.location,
      }));
      setEntries(rows);

      const schedRows: ScheduleRow[] = ((schedulesRes.data || []) as any[]).map(s => ({
        id: s.id,
        team_member_id: s.team_member_id,
        memberName: memberMap.get(s.team_member_id)?.name || "Unknown",
        schedule_date: s.schedule_date,
        start_time: s.start_time,
        end_time: s.end_time,
        break_minutes: s.break_minutes || 0,
        status: s.status,
      }));
      setSchedules(schedRows);
    } catch (e) {
      console.error("Error loading timesheets:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeShifts = entries.filter(e => !e.clock_out && e.status === "active");
  const pendingApprovals = entries.filter(e => e.status === "pending");
  const todayEntries = entries.filter(e => {
    const d = new Date(e.clock_in).toDateString();
    return d === new Date().toDateString();
  });
  const todayHours = todayEntries.reduce((s, e) => s + (e.total_hours || 0), 0);

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from("time_entries").update({ status: "approved" } as any).eq("id", id);
    if (!error) {
      toast({ title: "Approved", description: "Time entry approved" });
      load();
    }
  };

  const handleApproveAll = async () => {
    const ids = pendingApprovals.map(e => e.id);
    for (const id of ids) {
      await supabase.from("time_entries").update({ status: "approved" } as any).eq("id", id);
    }
    toast({ title: "All Approved", description: `${ids.length} entries approved` });
    load();
  };

  // Weekly schedule aggregation
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekSchedules = schedules.filter(s => {
    const d = new Date(s.schedule_date);
    return d >= weekStart && d < weekEnd;
  });

  // Group by member
  const memberScheduleMap = new Map<string, Map<number, ScheduleRow>>();
  weekSchedules.forEach(s => {
    if (!memberScheduleMap.has(s.team_member_id)) {
      memberScheduleMap.set(s.team_member_id, new Map());
    }
    const dow = new Date(s.schedule_date).getDay();
    memberScheduleMap.get(s.team_member_id)!.set(dow, s);
  });

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff on Duty</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeShifts.length}</div>
            <p className="text-xs text-muted-foreground">Currently clocked in</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{pendingApprovals.length}</div>
            <p className="text-xs text-muted-foreground">Timesheets awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Total logged hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entries.length}</div>
            <p className="text-xs text-muted-foreground">In period</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Current Shifts</TabsTrigger>
          <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
          <TabsTrigger value="schedule">Weekly Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="current">
          <Card>
            <CardHeader>
              <CardTitle>Current Shifts</CardTitle>
              <CardDescription>Employees currently on duty</CardDescription>
            </CardHeader>
            <CardContent>
              {activeShifts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Break</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeShifts.map(shift => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-medium">{shift.memberName}</TableCell>
                        <TableCell className="capitalize">{shift.role}</TableCell>
                        <TableCell>{new Date(shift.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell>{shift.break_minutes} min</TableCell>
                        <TableCell>
                          <Badge variant="default" className="flex items-center gap-1 w-fit">
                            <User className="w-3 h-3" />active
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No active shifts — clock in employees to see them here
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle>Pending Timesheet Approvals</CardTitle>
              <CardDescription>Review and approve employee hours</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingApprovals.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Clock In/Out</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>OT</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApprovals.map(ts => (
                        <TableRow key={ts.id}>
                          <TableCell className="font-medium">{ts.memberName}</TableCell>
                          <TableCell>{new Date(ts.clock_in).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {new Date(ts.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {ts.clock_out ? ` – ${new Date(ts.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : " – active"}
                          </TableCell>
                          <TableCell>{(ts.total_hours || 0).toFixed(1)} hrs</TableCell>
                          <TableCell className={(ts.overtime_hours || 0) > 0 ? "text-warning font-medium" : ""}>
                            {(ts.overtime_hours || 0).toFixed(1)} hrs
                          </TableCell>
                          <TableCell className="max-w-32 truncate">{ts.notes || "–"}</TableCell>
                          <TableCell>
                            <Button size="sm" onClick={() => handleApprove(ts.id)}>Approve</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex gap-2">
                    <Button onClick={handleApproveAll}>
                      <CheckCircle className="w-4 h-4 mr-2" />Approve All ({pendingApprovals.length})
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No pending approvals
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
              <CardDescription>Employee schedules for the current week</CardDescription>
            </CardHeader>
            <CardContent>
              {memberScheduleMap.size > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        {dayNames.map(d => <TableHead key={d}>{d}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from(memberScheduleMap.entries()).map(([memberId, dayMap]) => {
                        const firstName = dayMap.values().next().value?.memberName || "Unknown";
                        return (
                          <TableRow key={memberId}>
                            <TableCell className="font-medium">{firstName}</TableCell>
                            {dayNames.map((_, i) => {
                              const sched = dayMap.get(i);
                              return (
                                <TableCell key={i} className={!sched ? "text-muted-foreground" : ""}>
                                  {sched ? `${sched.start_time.slice(0, 5)} – ${sched.end_time.slice(0, 5)}` : "OFF"}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No schedules for this week — create shifts in Team Management
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
