import { useEffect, useMemo, useState } from 'react';
import { Shield, Radio, Megaphone, Brain, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

// Untyped handle: these tables are newer than the generated types.
const db = supabase as any;

interface Tick { id: string; agent: string; event_type: string; severity: string; resolved: boolean; occurred_at: string; }
interface Milestone { id: string; title: string; body: string; category: string; effective_date: string; published: boolean; }

const AGENTS = ['sentinel', 'oracle', 'hunter', 'guardian', 'gatekeeper', 'shield', 'mirror', 'insight'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const label = (s: string) => s.replace(/^crazy_/, '').replace(/_/g, ' ');
const sevClass: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-secondary text-secondary-foreground',
  high: 'bg-destructive/70 text-destructive-foreground',
  critical: 'bg-destructive text-destructive-foreground',
};
const timeAgo = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

const CrazyFriendSecurityDashboard = () => {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [live, setLive] = useState(false);
  const [sevFilter, setSevFilter] = useState<string>('all');

  useEffect(() => {
    let active = true;
    (async () => {
      const [t, m, u] = await Promise.all([
        db.from('security_ticker').select('*').order('occurred_at', { ascending: false }).limit(200),
        db.from('security_milestones').select('*').order('effective_date', { ascending: false }).limit(100),
        supabase.auth.getUser(),
      ]);
      if (!active) return;
      setTicks(t.data ?? []);
      setMilestones(m.data ?? []);
      const uid = u.data.user?.id;
      if (uid) {
        const { data } = await db.rpc('has_role', { _user_id: uid, _role: 'super_admin' });
        if (active) setIsAdmin(!!data);
      }
    })();
    const ch = supabase
      .channel(`sec-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_ticker' }, (p: any) => {
        const row = p.new as Tick;
        if (!row?.id) return;
        setTicks((prev) => [row, ...prev.filter((x) => x.id !== row.id)].slice(0, 200));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_milestones' }, (p: any) => {
        if (p.eventType === 'DELETE') return setMilestones((prev) => prev.filter((x) => x.id !== p.old.id));
        const row = p.new as Milestone;
        setMilestones((prev) => [row, ...prev.filter((x) => x.id !== row.id)]
          .sort((a, b) => b.effective_date.localeCompare(a.effective_date)));
      })
      .subscribe((s) => setLive(s === 'SUBSCRIBED'));
    return () => { active = false; supabase.removeChannel(ch); };
  }, []);

  const day = Date.now() - 86400000;
  const stats = useMemo(() => {
    const recent = ticks.filter((t) => new Date(t.occurred_at).getTime() > day);
    const open = ticks.filter((t) => !t.resolved && ['high', 'critical'].includes(t.severity));
    return { recent: recent.length, open: open.length, critical: open.filter((t) => t.severity === 'critical').length, openList: open };
  }, [ticks]);

  const agents = useMemo(() => AGENTS.map((a) => {
    const own = ticks.filter((t) => label(t.agent) === a);
    const lastHour = own.filter((t) => Date.now() - new Date(t.occurred_at).getTime() < 3600000);
    const status = lastHour.some((t) => ['high', 'critical'].includes(t.severity)) ? 'alert' : lastHour.length ? 'active' : 'idle';
    return { name: a, total: own.length, last: own[0]?.occurred_at, status };
  }), [ticks]);

  const shown = sevFilter === 'all' ? ticks : ticks.filter((t) => t.severity === sevFilter);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-3 px-1 pb-24 sm:space-y-5">
      {/* Header */}
      <header className="flex items-center gap-2">
        <Shield className="h-6 w-6 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold leading-tight sm:text-2xl">Crazy Friend Security</h1>
          <p className="truncate text-xs text-muted-foreground">IDIA Protocol defense system</p>
        </div>
        <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
          live ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', live ? 'animate-pulse bg-primary' : 'bg-muted-foreground')} />
          {live ? 'Live' : 'Offline'}
        </span>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
        {[
          { k: 'Agents', v: `${agents.filter((a) => a.status !== 'idle').length}/8` },
          { k: '24h', v: stats.recent },
          { k: 'Open', v: stats.open },
          { k: 'Critical', v: stats.critical, hot: stats.critical > 0 },
        ].map((s) => (
          <div key={s.k} className="rounded-lg border bg-card px-2 py-1.5 text-center sm:py-3">
            <div className={cn('text-base font-bold tabular-nums sm:text-2xl', s.hot && 'text-destructive')}>{s.v}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">{s.k}</div>
          </div>
        ))}
      </div>

      {/* Scrolling ticker strip */}
      {ticks.length > 0 && (
        <div className="overflow-hidden rounded-md border bg-card py-1.5">
          <div className="flex w-max animate-[marquee_40s_linear_infinite] gap-6 whitespace-nowrap px-3 text-xs">
            {[...ticks.slice(0, 12), ...ticks.slice(0, 12)].map((t, i) => (
              <span key={`${t.id}-${i}`} className="flex items-center gap-1.5">
                <span className={cn('h-1.5 w-1.5 rounded-full', t.severity === 'critical' || t.severity === 'high' ? 'bg-destructive' : 'bg-primary')} />
                <span className="font-medium capitalize">{label(t.agent)}</span>
                <span className="text-muted-foreground">{label(t.event_type)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-4 p-0.5">
          {[
            { v: 'live', i: Radio, t: 'Live' },
            { v: 'updates', i: Megaphone, t: 'Updates' },
            { v: 'agents', i: Brain, t: 'Agents' },
            { v: 'threats', i: AlertTriangle, t: 'Threats' },
          ].map(({ v, i: I, t }) => (
            <TabsTrigger key={v} value={v} className="flex flex-col gap-0.5 px-1 py-1.5 text-[11px] sm:flex-row sm:gap-1.5 sm:text-sm">
              <I className="h-4 w-4" />{t}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Live telemetry */}
        <TabsContent value="live" className="mt-2 space-y-2">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {['all', ...SEVERITIES].map((s) => (
              <button key={s} onClick={() => setSevFilter(s)}
                className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-xs capitalize',
                  sevFilter === s ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground')}>
                {s}
              </button>
            ))}
          </div>
          <ul className="divide-y rounded-lg border bg-card">
            {shown.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">No telemetry yet. Waiting for live events…</li>}
            {shown.map((t) => (
              <li key={t.id} className="flex items-center gap-2 px-2.5 py-2">
                <Badge className={cn('w-16 shrink-0 justify-center px-1 text-[10px] capitalize', sevClass[t.severity])}>{t.severity}</Badge>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm capitalize">{label(t.event_type)}</div>
                  <div className="truncate text-[11px] capitalize text-muted-foreground">{label(t.agent)}{t.resolved && ' · resolved'}</div>
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{timeAgo(t.occurred_at)}</span>
              </li>
            ))}
          </ul>
        </TabsContent>

        {/* Milestones */}
        <TabsContent value="updates" className="mt-2 space-y-2">
          {isAdmin && <MilestoneComposer />}
          {milestones.length === 0 && <p className="rounded-lg border bg-card p-4 text-center text-sm text-muted-foreground">No official updates published yet.</p>}
          {milestones.map((m) => (
            <article key={m.id} className="rounded-lg border bg-card p-3">
              <div className="mb-1 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] capitalize">{m.category}</Badge>
                <time className="text-[11px] text-muted-foreground">{new Date(m.effective_date + 'T00:00:00').toLocaleDateString()}</time>
                {!m.published && <Badge variant="secondary" className="text-[10px]">Draft</Badge>}
                {isAdmin && (
                  <button aria-label="Delete update" className="ml-auto text-muted-foreground"
                    onClick={async () => { const { error } = await db.from('security_milestones').delete().eq('id', m.id); if (error) toast.error('Delete failed'); }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <h3 className="text-sm font-semibold leading-snug">{m.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{m.body}</p>
            </article>
          ))}
        </TabsContent>

        {/* Agents */}
        <TabsContent value="agents" className="mt-2">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-3">
            {agents.map((a) => (
              <div key={a.name} className="rounded-lg border bg-card p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold capitalize">{a.name}</span>
                  <span className={cn('h-2 w-2 rounded-full',
                    a.status === 'alert' ? 'animate-pulse bg-destructive' : a.status === 'active' ? 'bg-primary' : 'bg-muted-foreground/40')} />
                </div>
                <div className="mt-1 text-[11px] capitalize text-muted-foreground">{a.status}</div>
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span className="tabular-nums">{a.total} events</span>
                  <span>{a.last ? timeAgo(a.last) : '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Threats */}
        <TabsContent value="threats" className="mt-2">
          <ul className="divide-y rounded-lg border bg-card">
            {stats.openList.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">No open high or critical threats.</li>}
            {stats.openList.map((t) => (
              <li key={t.id} className="flex items-center gap-2 px-2.5 py-2">
                <AlertTriangle className={cn('h-4 w-4 shrink-0', t.severity === 'critical' ? 'text-destructive' : 'text-muted-foreground')} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm capitalize">{label(t.event_type)}</div>
                  <div className="text-[11px] capitalize text-muted-foreground">{label(t.agent)} · {t.severity}</div>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(t.occurred_at)}</span>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const MilestoneComposer = () => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('milestone');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  if (!open) return (
    <Button size="sm" className="w-full" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />Publish update</Button>
  );

  const submit = async (published: boolean) => {
    if (title.trim().length < 3 || !body.trim()) return toast.error('Add a title and details');
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from('security_milestones').insert({
      title: title.trim(), body: body.trim(), category, effective_date: date, published, author_id: u.user?.id,
    });
    setBusy(false);
    if (error) return toast.error('Could not publish update');
    toast.success(published ? 'Update published' : 'Draft saved');
    setTitle(''); setBody(''); setOpen(false);
  };

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <Input placeholder="Title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="h-10 rounded-md border bg-background px-2 text-sm">
          <option value="milestone">Milestone</option>
          <option value="compliance">Compliance</option>
          <option value="advisory">Advisory</option>
        </select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <Textarea placeholder="Reviewed details" rows={4} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        <Button size="sm" variant="outline" className="ml-auto" disabled={busy} onClick={() => submit(false)}>Draft</Button>
        <Button size="sm" disabled={busy} onClick={() => submit(true)}>Publish</Button>
      </div>
    </div>
  );
};

export default CrazyFriendSecurityDashboard;
