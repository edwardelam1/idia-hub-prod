import { ReactNode, useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, Lightbulb, ListChecks, RotateCcw, Activity, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  agentInfo, eventInfo, eventHeadline, label, probeLabel, narrativeFromSignals, sevClass, SEVERITY_MEANING, signalLabel, timeAgo,
} from './securityGlossary';

// Untyped handle: these RPCs are newer than the generated types.
const db = supabase as any;

export interface TickLike { id: string; agent: string; event_type: string; severity: string; resolved: boolean; occurred_at: string; }

interface Detail {
  id: string; agent: string; event_type: string; severity: string; resolved: boolean; occurred_at: string;
  analysis: { kind?: string; headline?: string; risk_level: string; summary: string; findings: string[]; recommended_actions: string[]; confidence: number; trend?: string; outlook?: string; what_happened?: string; why_it_matters?: string; what_was_done?: string } | null;
  ai_unavailable: string | null;
  signals: Record<string, any>;
  privileged: boolean;
}

/** Shared mobile-first bottom sheet shell. */
export const InfoSheet = ({ open, onOpenChange, title, description, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; description?: ReactNode; children: ReactNode;
}) => (
  <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent className="max-h-[88dvh]">
      <DrawerHeader className="px-4 pb-2 pt-3 text-left">
        <DrawerTitle className="text-base leading-snug">{title}</DrawerTitle>
        {description && <DrawerDescription className="text-xs">{description}</DrawerDescription>}
      </DrawerHeader>
      <div className="mx-auto w-full max-w-2xl space-y-3 overflow-y-auto px-4 pb-6">{children}</div>
    </DrawerContent>
  </Drawer>
);

const Section = ({ icon: I, title, children }: { icon: typeof Activity; title: string; children: ReactNode }) => (
  <section className="rounded-lg border bg-card p-3">
    <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <I className="h-3.5 w-3.5" />{title}
    </h4>
    {children}
  </section>
);

const isCountMap = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => typeof x === 'number');

const SignalValue = ({ k, v }: { k: string; v: any }) => {
  if (typeof v === 'number') return <span className="tabular-nums">{k === 'error_rate' ? `${(v * 100).toFixed(1)}%` : v.toLocaleString()}</span>;
  if (typeof v === 'boolean') return <span>{v ? 'Yes' : 'No'}</span>;
  if (typeof v === 'string') return <span className="break-all">{v}</span>;
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="text-muted-foreground">None</span>;
    if (v.every((x) => typeof x !== 'object')) return (
      <span className="flex flex-wrap justify-end gap-1">{v.map((x, i) => <Badge key={i} variant="outline" className="text-[10px]">{String(x)}</Badge>)}</span>
    );
    return (
      <ul className="w-full space-y-1.5">
        {v.map((x, i) => (
          <li key={i} className="rounded-md bg-muted/50 px-2 py-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              {x?.severity && <Badge className={cn('px-1 text-[9px] capitalize', sevClass[x.severity])}>{x.severity}</Badge>}
              <span className="font-medium capitalize">{label(x?.agent ?? '')}</span>
              <span className="text-muted-foreground">{eventInfo(x?.type ?? '').title}</span>
            </div>
            {x?.summary && <p className="mt-1 text-muted-foreground">{x.summary}</p>}
          </li>
        ))}
      </ul>
    );
  }
  if (isCountMap(v)) {
    const entries = Object.entries(v);
    if (!entries.length) return <span className="text-muted-foreground">None</span>;
    return (
      <span className="flex flex-wrap justify-end gap-1">
        {entries.map(([a, b]) => <Badge key={a} variant="outline" className="max-w-full truncate text-[10px]">{label(a)}: {String(b)}</Badge>)}
      </span>
    );
  }
  if (v && typeof v === 'object') {
    const entries = Object.entries(v);
    if (!entries.length) return <span className="text-muted-foreground">None</span>;
    return (
      <ul className="w-full space-y-1">
        {entries.map(([a, b]) => (
          <li key={a} className="flex items-start justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{label(a)}</span>
            <SignalValue k={a} v={b} />
          </li>
        ))}
      </ul>
    );
  }
  return <span className="text-muted-foreground">—</span>;
};

const SignalFeed = ({ signals }: { signals: Record<string, any> }) => {
  const entries = Object.entries(signals ?? {});
  if (!entries.length) return <p className="text-xs text-muted-foreground">No numbers were recorded for this event.</p>;
  return (
    <dl className="divide-y">
      {entries.map(([k, v]) => {
        const block = (Array.isArray(v) && v.some((x) => typeof x === 'object')) || (v && typeof v === 'object' && !Array.isArray(v) && !isCountMap(v));
        return (
          <div key={k} className={cn('py-1.5 text-sm', block ? 'space-y-1' : 'flex items-start justify-between gap-3')}>
            <dt className="shrink-0 text-muted-foreground">{signalLabel(k)}</dt>
            <dd className={cn('min-w-0 text-right', block && 'text-left')}><SignalValue k={k} v={v} /></dd>
          </div>
        );
      })}
    </dl>
  );
};

export const SecurityEventSheet = ({ tick, onOpenChange, onResolvedChange }: {
  tick: TickLike | null; onOpenChange: (o: boolean) => void; onResolvedChange?: (id: string, resolved: boolean) => void;
}) => {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    if (!tick) return;
    let active = true;
    setDetail(null); setFailed(false); setShowRaw(false); setLoading(true);
    (async () => {
      console.log('[SecurityEventSheet][FETCH_DETAIL][PHASE_START]', { id: tick.id });
      try {
        const { data, error } = await db.rpc('get_security_event_detail', { _id: tick.id });
        if (error) throw error;
        if (active) setDetail(data as Detail | null);
        console.log('[SecurityEventSheet][FETCH_DETAIL][PHASE_END]', { found: !!data });
      } catch (err) {
        console.error('[SecurityEventSheet][FETCH_DETAIL][ERROR]', err instanceof Error ? `${err.message}\n${err.stack}` : err);
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [tick?.id]);

  const toggleResolved = async () => {
    if (!detail) return;
    const next = !detail.resolved;
    setBusy(true);
    console.log('[SecurityEventSheet][RESOLVE][PHASE_START]', { id: detail.id, next });
    try {
      const { error } = await db.rpc('resolve_security_event', { _id: detail.id, _resolved: next });
      if (error) throw error;
      setDetail({ ...detail, resolved: next });
      onResolvedChange?.(detail.id, next);
      toast.success(next ? 'Marked resolved' : 'Reopened');
      console.log('[SecurityEventSheet][RESOLVE][PHASE_END]');
    } catch (err) {
      console.error('[SecurityEventSheet][RESOLVE][ERROR]', err instanceof Error ? `${err.message}\n${err.stack}` : err);
      toast.error('Could not update this event');
    } finally {
      setBusy(false);
    }
  };

  const t = detail ?? tick;
  const agent = t ? agentInfo(t.agent) : null;
  const ev = t ? eventInfo(t.event_type) : null;
  const resolved = detail?.resolved ?? tick?.resolved ?? false;
  const sev = t?.severity ?? 'low';

  return (
    <InfoSheet
      open={!!tick}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Badge className={cn('shrink-0 px-1.5 text-[10px] capitalize', sevClass[sev])}>{sev}</Badge>
          <span className="line-clamp-2">{eventHeadline(t.event_type, detail?.analysis?.headline, detail?.signals)}</span>
        </span>
      }
      description={t && <>{agent?.name} · {agent?.title} · {timeAgo(t.occurred_at)} ago{resolved && ' · resolved'}</>}
    >
      {t && (
        <>
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">{ev?.meaning}</p>

          {loading && <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-28 w-full" /></div>}
          {failed && <p className="text-sm text-muted-foreground">Details are only available while signed in. Try again in a moment.</p>}
          {!loading && !failed && !detail && <p className="text-sm text-muted-foreground">This event's details are no longer available.</p>}

          {detail && (
            <>
              <Section icon={Bot} title="What happened">
                <p className="text-sm leading-relaxed">{detail.analysis?.summary || narrativeFromSignals(detail.agent, detail.signals)}</p>
                {detail.analysis && (
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>AI confidence</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((detail.analysis.confidence ?? 0) * 100)}%` }} />
                    </div>
                    <span className="tabular-nums">{Math.round((detail.analysis.confidence ?? 0) * 100)}%</span>
                  </div>
                )}
                {!detail.analysis && detail.ai_unavailable && (
                  <p className="mt-1 text-[11px] text-muted-foreground">The AI review didn't run for this event, so this summary comes straight from the numbers.</p>
                )}
              </Section>

              {detail.analysis?.kind === 'record' && (
                <Section icon={Lightbulb} title={`Incident record · ${new Date(detail.occurred_at).toLocaleString()}`}>
                  <dl className="space-y-2 text-sm">
                    {([['What happened', detail.analysis.what_happened], ['Why it matters', detail.analysis.why_it_matters], ['What was done', detail.analysis.what_was_done]] as const).filter(([, v]) => v).map(([k, v]) => (
                      <div key={k}><dt className="text-[11px] font-semibold uppercase text-muted-foreground">{k}</dt><dd className="leading-relaxed">{v}</dd></div>
                    ))}
                    <div><dt className="text-[11px] font-semibold uppercase text-muted-foreground">Record ID</dt><dd className="break-all font-mono text-[11px]">{detail.id}</dd></div>
                  </dl>
                </Section>
              )}

              {detail.analysis?.kind === 'forecast' && (detail.analysis.trend || detail.analysis.outlook) && (
                <Section icon={Lightbulb} title="Forecast">
                  {detail.analysis.trend && <p className="text-sm"><span className="font-semibold">Trend: </span>{detail.analysis.trend}</p>}
                  {detail.analysis.outlook && <p className="mt-1 text-sm"><span className="font-semibold">Next 24 hours: </span>{detail.analysis.outlook}</p>}
                </Section>
              )}

              {Array.isArray(detail.signals?.probes) && (
                <Section icon={ListChecks} title="Attacks tried">
                  <ul className="space-y-1 text-sm">{detail.signals.probes.map((p: { probe: string; blocked: boolean }) => (
                    <li key={p.probe} className="flex justify-between gap-2"><span className="truncate">{probeLabel(p.probe)}</span><span className={p.blocked ? 'text-muted-foreground' : 'font-semibold text-destructive'}>{p.blocked ? 'Blocked' : 'Got through'}</span></li>
                  ))}</ul>
                </Section>
              )}

              {!!detail.analysis?.findings?.length && (
                <Section icon={Lightbulb} title={detail.analysis.kind === 'redteam' ? 'Gaps found' : 'What we saw'}>
                  <ul className="list-disc space-y-1 pl-4 text-sm">{detail.analysis.findings.map((f, i) => <li key={i}>{f}</li>)}</ul>
                </Section>
              )}

              {!!detail.analysis?.recommended_actions?.length && (
                <Section icon={ListChecks} title="What to do">
                  <ol className="list-decimal space-y-1 pl-4 text-sm">{detail.analysis.recommended_actions.map((f, i) => <li key={i}>{f}</li>)}</ol>
                </Section>
              )}

              <Section icon={Activity} title="Data feed · last 30 minutes">
                <SignalFeed signals={detail.signals} />
                {['low', 'info'].includes(String(detail.severity).toLowerCase()) ? (
                <div className="flex items-center justify-center gap-1.5 rounded-lg border bg-card p-2.5 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />Low-risk alert, resolved automatically
                </div>
              ) : detail.privileged && (
                  <button onClick={() => setShowRaw((s) => !s)} className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <ChevronDown className={cn('h-3 w-3 transition-transform', showRaw && 'rotate-180')} />Raw record
                  </button>
                )}
                {showRaw && (
                  <pre className="mt-1 max-h-60 overflow-auto rounded-md bg-muted p-2 text-[10px] leading-snug">{JSON.stringify(detail, null, 2)}</pre>
                )}
              </Section>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border bg-card p-2.5">
                  <div className="font-semibold capitalize">{sev} severity</div>
                  <div className="mt-0.5 text-muted-foreground">{SEVERITY_MEANING[sev]}</div>
                </div>
                <div className="rounded-lg border bg-card p-2.5">
                  <div className="font-semibold">{agent?.name} checks</div>
                  <div className="mt-0.5 text-muted-foreground">{agent?.watches}</div>
                </div>
              </div>

              {detail.privileged && (
                <Button className="w-full" variant={detail.resolved ? 'outline' : 'default'} disabled={busy} onClick={toggleResolved}>
                  {detail.resolved ? <><RotateCcw className="mr-1.5 h-4 w-4" />Reopen</> : <><CheckCircle2 className="mr-1.5 h-4 w-4" />Mark resolved</>}
                </Button>
              )}
            </>
          )}
        </>
      )}
    </InfoSheet>
  );
};
