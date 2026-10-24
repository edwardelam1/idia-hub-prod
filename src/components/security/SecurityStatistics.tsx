import { useEffect, useMemo, useState } from 'react';
import { Users, Workflow, PieChart, Lightbulb, ArrowDown, BookOpen, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { AGENT_INFO, eventHeadline, label } from './securityGlossary';

const db = supabase as any;
const AGENTS = ['sentinel', 'oracle', 'hunter', 'guardian', 'gatekeeper', 'shield', 'mirror', 'insight'];
const SEVS = ['critical', 'high', 'medium', 'low'] as const;
const sevBar: Record<string, string> = {
  critical: 'bg-destructive', high: 'bg-destructive/70', medium: 'bg-primary/70', low: 'bg-muted-foreground/40',
};
interface Row { id: string; agent: string; severity: string; event_type: string; occurred_at: string; resolved: boolean; }

const FLOW_STEPS = [
  ['Activity sources', 'API traffic, ledger, roles, keys, intake, quarantine'],
  ['Crazy 8 sweep', 'Each agent checks its own area every 30 minutes'],
  ['AI review', 'Only notable signals; no personal data is sent'],
  ['Severity sort', 'Low closes itself; medium and up open a case'],
  ['Public feed + detail', 'Sanitized live ticker; full detail for security staff'],
  ['Resolution', 'Operator resolves; Insight records the case'],
];

const FlowHelp = () => (
  <Popover>
    <PopoverTrigger asChild>
      <button type="button" aria-label="How the defense flow works" className="rounded-full p-0.5 text-muted-foreground hover:text-primary">
        <Info className="h-4 w-4" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-72 p-3">
      <div className="mb-1.5 text-xs font-semibold">The path every signal takes</div>
      <ol className="space-y-1">
        {FLOW_STEPS.map(([t, d], i) => (
          <li key={t}>
            <div className="rounded-md border bg-muted/40 px-2 py-1">
              <div className="text-xs font-semibold">{i + 1}. {t}</div>
              <div className="text-[11px] text-muted-foreground">{d}</div>
            </div>
            {i < FLOW_STEPS.length - 1 && <ArrowDown className="mx-auto my-0.5 h-3 w-3 text-muted-foreground" />}
          </li>
        ))}
      </ol>
    </PopoverContent>
  </Popover>
);

const Section = ({ icon: I, title, sub, children, help }: { icon: any; title: string; sub: string; children: React.ReactNode; help?: React.ReactNode }) => (
  <section className="rounded-lg border bg-card p-3">
    <div className="mb-2 flex items-start gap-2">
      <I className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <h2 className="text-sm font-semibold leading-tight">{title}</h2>
          {help}
        </div>
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
    {children}
  </section>
);

const Bar = ({ pct, className }: { pct: number; className?: string }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
    <div className={cn('h-full rounded-full bg-primary', className)} style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }} />
  </div>
);

const RESOURCES: Record<string, { action: string; outcome: string }> = {
  sentinel: { action: 'Review failing endpoints and add rate limits to the noisiest routes.', outcome: 'Fewer failed requests and faster response times.' },
  oracle: { action: 'Compare today against the 7-day trend and pre-assign an owner to the rising area.', outcome: 'Risks handled before they turn into incidents.' },
  hunter: { action: 'Audit the flagged ledger accounts and failed settlements.', outcome: 'Hidden abuse found and stopped early.' },
  guardian: { action: 'Confirm every new admin role and API key was expected; revoke the rest.', outcome: 'Only the right people keep access.' },
  gatekeeper: { action: 'Inspect rejected payloads and tighten input checks on the affected intake.', outcome: 'Bad or injected data never enters the system.' },
  shield: { action: 'Work through the quarantine queue: release verified items, purge the rest.', outcome: 'Unverified data stays isolated.' },
  mirror: { action: 'Fix any probe that got through and re-run the red-team sweep.', outcome: 'Logic gaps closed before attackers find them.' },
  insight: { action: 'Export the incident records for the compliance review.', outcome: 'An audit-ready trail for CISO review.' },
};

const SecurityStatistics = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      console.log('[SecurityStats][LOAD][PHASE_START]');
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await db.from('security_ticker')
        .select('id,agent,severity,event_type,occurred_at,resolved')
        .gte('occurred_at', since).order('occurred_at', { ascending: false }).limit(5000);
      if (error) console.error('[SecurityStats][LOAD][ERROR]', error);
      setRows(data ?? []);
      setLoading(false);
      console.log('[SecurityStats][LOAD][PHASE_END]', { rows: data?.length });
    })();
  }, []);

  const s = useMemo(() => {
    const total = rows.length;
    const byAgent = AGENTS.map((a) => {
      const own = rows.filter((r) => label(r.agent) === a);
      return {
        a, n: own.length,
        serious: own.filter((r) => r.severity !== 'low').length,
        open: own.filter((r) => !r.resolved && r.severity !== 'low').length,
        last: own[0]?.occurred_at,
      };
    });
    const bySev = SEVS.map((v) => ({ v, n: rows.filter((r) => r.severity === v).length }));
    const resolved = rows.filter((r) => r.resolved).length;
    const autoResolved = rows.filter((r) => r.severity === 'low').length;
    const manual = rows.filter((r) => r.severity !== 'low');
    const manualDone = manual.filter((r) => r.resolved).length;
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i));
      const e = new Date(d); e.setDate(e.getDate() + 1);
      const inDay = rows.filter((r) => { const t = new Date(r.occurred_at); return t >= d && t < e; });
      return { d, n: inDay.length, serious: inDay.filter((r) => r.severity !== 'low').length };
    });
    const typeMap = new Map<string, number>();
    rows.forEach((r) => typeMap.set(r.event_type, (typeMap.get(r.event_type) ?? 0) + 1));
    const types = [...typeMap.entries()].sort((x, y) => y[1] - x[1]).slice(0, 6);
    return { total, byAgent, bySev, resolved, autoResolved, manual: manual.length, manualDone, days, types };
  }, [rows]);

  if (loading) return <p className="rounded-lg border bg-card p-4 text-center text-sm text-muted-foreground">Loading statistics…</p>;

  const maxAgent = Math.max(1, ...s.byAgent.map((x) => x.n));
  const maxDay = Math.max(1, ...s.days.map((x) => x.n));
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
  const active = s.byAgent.filter((x) => x.n > 0).length;
  const priorities = s.byAgent.filter((x) => x.open > 0).sort((x, y) => y.open - x.open);

  return (
    <div className="space-y-2.5">
      <p className="px-0.5 text-[11px] text-muted-foreground">Last 7 days · {s.total.toLocaleString()} signals from the live feed</p>

      {/* Workforce */}
      <Section icon={Users} title="Workforce" sub={`${active} of 8 agents reported this week`}>
        <ul className="space-y-2">
          {s.byAgent.map((x) => (
            <li key={x.a}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate"><span className="font-semibold capitalize">{x.a}</span>
                  <span className="text-muted-foreground"> · {AGENT_INFO[x.a]?.title}</span></span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{x.n} · {pct(x.n, s.total)}%</span>
              </div>
              <Bar pct={(x.n / maxAgent) * 100} className={x.open ? 'bg-destructive/70' : undefined} />
            </li>
          ))}
        </ul>
      </Section>

      {/* Defense Flow */}
      <Section icon={Workflow} title="Defense Flow" sub="How alerts move from detection to closed" help={<FlowHelp />}>
        <div className="grid grid-cols-2 gap-1.5 text-center">
          {[
            { k: 'Sweep cadence', v: '30 min' },
            { k: 'Resolved', v: `${pct(s.resolved, s.total)}%` },
            { k: 'Auto-closed (low)', v: s.autoResolved.toLocaleString() },
            { k: 'Manual closed', v: `${s.manualDone}/${s.manual}` },
          ].map((m) => (
            <div key={m.k} className="rounded-md bg-muted/50 px-2 py-1.5">
              <div className="text-base font-bold tabular-nums">{m.v}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.k}</div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Daily volume</div>
          <div className="flex h-20 items-end gap-1">
            {s.days.map((d) => (
              <div key={d.d.toISOString()} className="flex flex-1 flex-col items-center gap-0.5">
                <span className="text-[9px] tabular-nums text-muted-foreground">{d.n}</span>
                <div className="flex w-full flex-col justify-end overflow-hidden rounded-sm bg-muted" style={{ height: `${Math.max(4, (d.n / maxDay) * 56)}px` }}>
                  <div className="w-full bg-destructive/70" style={{ height: `${pct(d.serious, d.n)}%` }} />
                  <div className="w-full flex-1 bg-primary/60" />
                </div>
                <span className="text-[9px] text-muted-foreground">{d.d.toLocaleDateString(undefined, { weekday: 'narrow' })}</span>
              </div>
            ))}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Red share = medium and above, which need a person to resolve.</p>
        </div>
      </Section>


      {/* Breakdown */}
      <Section icon={PieChart} title="Breakdown" sub="By severity and by type of signal">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {s.bySev.map((x) => <div key={x.v} className={sevBar[x.v]} style={{ width: `${pct(x.n, s.total)}%` }} />)}
        </div>
        <div className="mt-1.5 grid grid-cols-4 gap-1 text-center">
          {s.bySev.map((x) => (
            <div key={x.v}>
              <div className="text-sm font-bold tabular-nums">{x.n}</div>
              <div className="flex items-center justify-center gap-1 text-[10px] capitalize text-muted-foreground">
                <span className={cn('h-1.5 w-1.5 rounded-full', sevBar[x.v])} />{x.v}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Top signal types</div>
        <ul className="mt-1 space-y-1.5">
          {s.types.length === 0 && <li className="text-xs text-muted-foreground">No signals this week.</li>}
          {s.types.map(([t, n]) => (
            <li key={t}>
              <div className="flex justify-between gap-2 text-xs"><span className="truncate">{eventHeadline(t)}</span><span className="tabular-nums text-muted-foreground">{n}</span></div>
              <Bar pct={pct(n, s.types[0][1])} />
            </li>
          ))}
        </ul>
      </Section>

      {/* Suggested outputs */}
      <Section icon={Lightbulb} title="Suggested actions & outcomes" sub="Based on open medium-and-above alerts">
        {priorities.length === 0 ? (
          <p className="text-xs text-muted-foreground">No open cases. Keep the 30-minute sweep running and review the weekly trend.</p>
        ) : (
          <ul className="space-y-1.5">
            {priorities.map((x) => (
              <li key={x.a} className="rounded-md border px-2.5 py-1.5">
                <div className="flex justify-between text-xs"><span className="font-semibold capitalize">{x.a}</span><span className="text-destructive">{x.open} open</span></div>
                <p className="text-[11px]"><span className="font-medium">Do:</span> {RESOURCES[x.a].action}</p>
                <p className="text-[11px] text-muted-foreground"><span className="font-medium">Outcome:</span> {RESOURCES[x.a].outcome}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Resources */}
      <Section icon={BookOpen} title="Resources" sub="Reference guides for responders">
        <ul className="space-y-1 text-xs">
          {[
            ['OWASP Top 10', 'https://owasp.org/www-project-top-ten/'],
            ['OWASP LLM Top 10 (prompt injection)', 'https://genai.owasp.org/llm-top-10/'],
            ['NIST incident response guide', 'https://csrc.nist.gov/pubs/sp/800/61/r3/final'],
            ['Supabase row-level security', 'https://supabase.com/docs/guides/database/postgres/row-level-security'],
            ['MITRE ATT&CK techniques', 'https://attack.mitre.org/'],
          ].map(([t, u]) => (
            <li key={u}><a href={u} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">{t}</a></li>
          ))}
        </ul>
      </Section>
    </div>
  );
};

export default SecurityStatistics;
