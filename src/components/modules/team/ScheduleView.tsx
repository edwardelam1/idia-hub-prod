import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Plus, BarChart3, CalendarDays, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import type { TeamMemberRow, ScheduleRow, BusinessHoursRow, TimeEntryRow } from "@/hooks/use-team-data";

interface ScheduleViewProps {
  members: TeamMemberRow[];
  schedules: ScheduleRow[];
  timeEntries: TimeEntryRow[];
  businessHours: BusinessHoursRow[];
  onAddSchedule: (data: Partial<ScheduleRow>) => Promise<boolean>;
  onDeleteSchedule: (id: string) => Promise<boolean>;
}

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ScheduleView = ({ members, schedules, timeEntries, businessHours, onAddSchedule, onDeleteSchedule }: ScheduleViewProps) => {
  const [viewMode, setViewMode] = useState<string>("gantt");
  const [filterMember, setFilterMember] = useState<string>("all");
  const [weekOffset, setWeekOffset] = useState(0);
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    team_member_id: "", schedule_date: "", start_time: "09:00", end_time: "17:00", break_minutes: "30", location: "",
  });

  const currentWeekStart = startOfWeek(addDays(new Date(), weekOffset * 7), { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: endOfWeek(currentWeekStart, { weekStartsOn: 0 }) });

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (filterMember !== "all" && s.team_member_id !== filterMember) return false;
      return true;
    });
  }, [schedules, filterMember]);

  const filteredEntries = useMemo(() => {
    return timeEntries.filter(e => {
      if (filterMember !== "all" && e.team_member_id !== filterMember) return false;
      return true;
    });
  }, [timeEntries, filterMember]);

  const displayMembers = filterMember === "all" ? members : members.filter(m => m.id === filterMember);

  const getSchedulesForDay = (memberId: string, day: Date) => {
    return filteredSchedules.filter(s => {
      return s.team_member_id === memberId && isSameDay(parseISO(s.schedule_date), day);
    });
  };

  const getBusinessHoursForDay = (dayOfWeek: number) => {
    return businessHours.find(bh => bh.day_of_week === dayOfWeek);
  };

  const timeToPercent = (timeStr: string, bh: BusinessHoursRow) => {
    const [h, m] = timeStr.split(":").map(Number);
    const [oh, om] = bh.open_time.split(":").map(Number);
    const [ch, cm] = bh.close_time.split(":").map(Number);
    const totalMinutes = (ch * 60 + cm) - (oh * 60 + om);
    const currentMinutes = (h * 60 + m) - (oh * 60 + om);
    return Math.max(0, Math.min(100, (currentMinutes / totalMinutes) * 100));
  };

  const handleAddShift = async () => {
    if (!shiftForm.team_member_id || !shiftForm.schedule_date) return;
    await onAddSchedule({
      team_member_id: shiftForm.team_member_id,
      schedule_date: shiftForm.schedule_date,
      start_time: shiftForm.start_time,
      end_time: shiftForm.end_time,
      break_minutes: parseInt(shiftForm.break_minutes) || 0,
      location: shiftForm.location || undefined,
    });
    setIsAddShiftOpen(false);
    setShiftForm({ team_member_id: "", schedule_date: "", start_time: "09:00", end_time: "17:00", break_minutes: "30", location: "" });
  };

  // Calculate total hours for each member this week
  const memberWeeklyHours = useMemo(() => {
    const map: Record<string, number> = {};
    displayMembers.forEach(m => {
      const memberSchedules = filteredSchedules.filter(s => {
        const d = parseISO(s.schedule_date);
        return s.team_member_id === m.id && d >= currentWeekStart && d <= endOfWeek(currentWeekStart, { weekStartsOn: 0 });
      });
      const total = memberSchedules.reduce((sum, s) => {
        const [sh, sm] = s.start_time.split(":").map(Number);
        const [eh, em] = s.end_time.split(":").map(Number);
        return sum + ((eh * 60 + em) - (sh * 60 + sm) - s.break_minutes) / 60;
      }, 0);
      map[m.id] = Math.round(total * 10) / 10;
    });
    return map;
  }, [displayMembers, filteredSchedules, currentWeekStart]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">
            {format(currentWeekStart, "MMM d")} — {format(endOfWeek(currentWeekStart, { weekStartsOn: 0 }), "MMM d, yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Members" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setIsAddShiftOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Shift
          </Button>
        </div>
      </div>

      <Tabs value={viewMode} onValueChange={setViewMode}>
        <TabsList>
          <TabsTrigger value="gantt" className="flex items-center gap-1">
            <BarChart3 className="w-4 h-4" /> Gantt
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" /> Calendar
          </TabsTrigger>
        </TabsList>

        {/* Gantt View */}
        <TabsContent value="gantt" className="mt-4">
          {displayMembers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-lg">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No team members to display.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 text-sm font-medium w-48">Team Member</th>
                    {weekDays.map(day => (
                      <th key={day.toISOString()} className="text-center p-2 text-sm font-medium">
                        <div>{DAY_NAMES_SHORT[day.getDay()]}</div>
                        <div className="text-xs text-muted-foreground">{format(day, "M/d")}</div>
                      </th>
                    ))}
                    <th className="text-center p-2 text-sm font-medium w-20">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {displayMembers.map(member => (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="p-3">
                        <div className="text-sm font-medium truncate">{member.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{member.role}</div>
                      </td>
                      {weekDays.map(day => {
                        const daySchedules = getSchedulesForDay(member.id, day);
                        const bh = getBusinessHoursForDay(day.getDay());
                        return (
                          <td key={day.toISOString()} className="p-1 align-middle">
                            {bh?.is_closed ? (
                              <div className="text-xs text-center text-muted-foreground">Closed</div>
                            ) : daySchedules.length > 0 ? (
                              <div className="space-y-1">
                                {daySchedules.map(s => (
                                  <div key={s.id} className="relative group">
                                    <div className="bg-primary/20 text-primary text-xs rounded px-1.5 py-1 text-center font-medium">
                                      {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="absolute -top-1 -right-1 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => onDeleteSchedule(s.id)}
                                    >
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-center text-muted-foreground/50">—</div>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2 text-center">
                        <Badge variant="secondary" className="text-xs">
                          {memberWeeklyHours[member.id] || 0}h
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-4">
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map(day => (
              <div key={day.toISOString()} className="text-center">
                <div className="text-sm font-medium p-2 bg-muted/50 rounded-t">
                  {DAY_NAMES_SHORT[day.getDay()]} {format(day, "M/d")}
                </div>
                <div className="border rounded-b min-h-[200px] p-1 space-y-1">
                  {displayMembers.map(member => {
                    const daySchedules = getSchedulesForDay(member.id, day);
                    return daySchedules.map(s => (
                      <div key={s.id} className="bg-primary/10 text-xs rounded p-1.5 text-left group relative">
                        <div className="font-medium truncate">{member.name}</div>
                        <div className="text-muted-foreground">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</div>
                        {s.location && <div className="text-muted-foreground truncate">{s.location}</div>}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-0 right-0 h-4 w-4 opacity-0 group-hover:opacity-100"
                          onClick={() => onDeleteSchedule(s.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ));
                  })}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Shift Dialog */}
      <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Shift</DialogTitle>
            <DialogDescription>Schedule a shift for a team member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Team Member</Label>
              <Select value={shiftForm.team_member_id} onValueChange={v => setShiftForm(p => ({ ...p, team_member_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={shiftForm.schedule_date} onChange={e => setShiftForm(p => ({ ...p, schedule_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={shiftForm.start_time} onChange={e => setShiftForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" value={shiftForm.end_time} onChange={e => setShiftForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Break (minutes)</Label>
                <Input type="number" value={shiftForm.break_minutes} onChange={e => setShiftForm(p => ({ ...p, break_minutes: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={shiftForm.location} onChange={e => setShiftForm(p => ({ ...p, location: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddShiftOpen(false)}>Cancel</Button>
              <Button onClick={handleAddShift} disabled={!shiftForm.team_member_id || !shiftForm.schedule_date}>Add Shift</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
