import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, DollarSign, TrendingUp } from "lucide-react";
import type { LaborSummary, TimeEntryRow } from "@/hooks/use-enterprise-reports";

interface Props {
  labor: LaborSummary;
  timeEntries: TimeEntryRow[];
  loading: boolean;
}

export const LaborPayrollTab = ({ labor, timeEntries, loading }: Props) => {
  if (loading) return <div className="flex items-center justify-center h-48 text-muted-foreground">Loading...</div>;

  // Aggregate by member
  const memberAgg = new Map<string, { name: string; role: string; hours: number; ot: number; entries: number }>();
  timeEntries.forEach(e => {
    const existing = memberAgg.get(e.team_member_id) || { name: e.memberName, role: e.role, hours: 0, ot: 0, entries: 0 };
    existing.hours += e.total_hours || 0;
    existing.ot += e.overtime_hours || 0;
    existing.entries += 1;
    memberAgg.set(e.team_member_id, existing);
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Active Headcount</p>
              <p className="text-lg font-bold">{labor.headcount}</p>
            </div>
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Hours</p>
              <p className="text-lg font-bold">{labor.totalHours.toFixed(1)}</p>
            </div>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Labor Cost</p>
              <p className="text-lg font-bold">${labor.laborCost.toFixed(2)}</p>
            </div>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Labor % of Sales</p>
              <p className="text-lg font-bold">{labor.laborCostPercent.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Hours by Employee</CardTitle>
            <CardDescription className="text-xs">Aggregated for selected period</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            {memberAgg.size > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                    <TableHead className="text-right">OT</TableHead>
                    <TableHead className="text-right">Shifts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(memberAgg.entries()).map(([id, m]) => (
                    <TableRow key={id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="capitalize">{m.role}</TableCell>
                      <TableCell className="text-right">{m.hours.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        {m.ot > 0 ? <span className="text-warning font-medium">{m.ot.toFixed(1)}</span> : "0"}
                      </TableCell>
                      <TableCell className="text-right">{m.entries}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                No time entries for this period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Overtime Summary</CardTitle>
            <CardDescription className="text-xs">Overtime hours breakdown</CardDescription>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-3">
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">Regular Hours</span>
                <span className="text-sm font-bold">{(labor.totalHours - labor.overtimeHours).toFixed(1)} hrs</span>
              </div>
              <div className="flex justify-between p-2 bg-warning/10 border border-warning/20 rounded">
                <span className="text-sm">Overtime Hours</span>
                <span className="text-sm font-bold text-warning">{labor.overtimeHours.toFixed(1)} hrs</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span className="text-sm">Currently On Duty</span>
                <Badge variant="secondary">{labor.activeShifts}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
