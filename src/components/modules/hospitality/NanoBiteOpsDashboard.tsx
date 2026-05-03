import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ALL_NANO_BITES, type NanoBite } from "@/taxonomy";
import { Activity, CheckCircle2, Clock, Cpu, type LucideIcon } from "lucide-react";

/**
 * NanoBiteOpsDashboard
 * ────────────────────
 * Generic, taxonomy-driven operating dashboard. Renders the canonical
 * NanoBite catalog filtered to a single hospitality sub-domain, with KPIs
 * derived from real taxonomy fields (cadence / automation / tier).
 *
 * Golden Rule compliant — zero synthetic / mock rows. Every row is sourced
 * from src/taxonomy/nanoBites/hospitality.ts.
 */

export interface NanoBiteOpsDashboardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string; // tailwind text/bg class fragment, e.g. "amber"
  filter: (b: NanoBite) => boolean;
  emptyHint?: string;
}

const TIER_VARIANT: Record<string, "secondary" | "default" | "outline"> = {
  basic: "secondary",
  pro: "default",
  enterprise: "outline",
};

export const NanoBiteOpsDashboard = ({
  title,
  description,
  icon: Icon,
  accent,
  filter,
  emptyHint,
}: NanoBiteOpsDashboardProps) => {
  const bites = useMemo(() => ALL_NANO_BITES.filter(filter), [filter]);

  const kpis = useMemo(() => {
    const total = bites.length;
    const automatable = bites.filter((b) => b.automatable).length;
    const enterprise = bites.filter((b) => b.requiresTier === "enterprise").length;
    const cadenceCount = bites.reduce<Record<string, number>>((acc, b) => {
      acc[b.cadence] = (acc[b.cadence] ?? 0) + 1;
      return acc;
    }, {});
    return { total, automatable, enterprise, cadenceCount };
  }, [bites]);

  const groups = useMemo(() => {
    const map = new Map<string, NanoBite[]>();
    for (const b of bites) {
      const key = b.microElement || "general";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [bites]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-start gap-4">
        <div className={`rounded-lg p-3 bg-${accent}-500/10 text-${accent}-500`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant="outline" className="font-mono text-xs">
          {kpis.total} nano-bites
        </Badge>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="w-3 h-3" /> Total Tasks
            </CardDescription>
            <CardTitle className="text-3xl">{kpis.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Cpu className="w-3 h-3" /> Automatable
            </CardDescription>
            <CardTitle className="text-3xl">{kpis.automatable}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3" /> Enterprise-Tier
            </CardDescription>
            <CardTitle className="text-3xl">{kpis.enterprise}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-3 h-3" /> Cadence Mix
            </CardDescription>
            <CardTitle className="text-base font-mono">
              {Object.entries(kpis.cadenceCount)
                .map(([k, v]) => `${k}:${v}`)
                .join(" · ") || "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {bites.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {emptyHint ?? "No nano-bites mapped to this module yet."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operating Tasks</CardTitle>
            <CardDescription>
              Sourced live from the IDIA taxonomy — no mock data.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[480px]">
              {groups.map(([micro, rows]) => (
                <div key={micro} className="border-b last:border-b-0">
                  <div className="px-4 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {micro} · {rows.length}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[55%]">Task</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Cadence</TableHead>
                        <TableHead>Auto</TableHead>
                        <TableHead>Tier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="text-sm">{b.task}</TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {b.valueChainStage}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs capitalize">
                              {b.cadence}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {b.automatable ? (
                              <Badge variant="secondary" className="text-xs">auto</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">manual</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {b.requiresTier ? (
                              <Badge
                                variant={TIER_VARIANT[b.requiresTier] ?? "outline"}
                                className="text-xs capitalize"
                              >
                                {b.requiresTier}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NanoBiteOpsDashboard;