import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertTriangle, Clock, Gauge, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Metric = { id: string; endpoint: string; status_code: number; latency_ms: number; timestamp: string | null; error_details: string | null };
type Delivery = { id: string; event_type: string; status: string; attempts: number; last_status_code: number | null; created_at: string; delivered_at: string | null; next_attempt_at: string };

const WINDOWS = [
  { id: "30m", label: "30m", ms: 30 * 60e3, bucket: 60e3 },
  { id: "1h", label: "1h", ms: 60 * 60e3, bucket: 2 * 60e3 },
  { id: "6h", label: "6h", ms: 6 * 3600e3, bucket: 15 * 60e3 },
  { id: "24h", label: "24h", ms: 24 * 3600e3, bucket: 3600e3 },
  { id: "7d", label: "7d", ms: 7 * 24 * 3600e3, bucket: 6 * 3600e3 },
] as const;
const PAGE = 1000;
const MAX_ROWS = 20000;

const pct = (n: number, d: number) => (d ? (n / d) * 100 : 0);
function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}
function statusClass(code: number): "default" | "secondary" | "destructive" | "outline" {
  if (code >= 500) return "destructive";
  if (code === 429 || code === 402) return "secondary";
  if (code >= 400) return "outline";
  return "default";
}

export default function APIMonitoring() {
  const [win, setWin] = useState<(typeof WINDOWS)[number]>(WINDOWS[3]);
  const [endpoint, setEndpoint] = useState("all");
  const [rows, setRows] = useState<Metric[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);

  const load = useCallback(async () => {
    console.log(`[PHASE_START: Monitoring.Load] window=${win.id}`);
    setError(null);
    try {
      const since = new Date(Date.now() - win.ms).toISOString();
      const all: Metric[] = [];
      // Page past the 1,000-row API cap so totals are exact up to MAX_ROWS.
      for (let from = 0; from < MAX_ROWS; from += PAGE) {
        console.log(`[PHASE_START: Monitoring.Page] from=${from}`);
        const { data, error: e } = await supabase
          .from("api_metrics")
          .select("id,endpoint,status_code,latency_ms,timestamp,error_details")
          .gte("timestamp", since)
          .order("timestamp", { ascending: false })
          .range(from, from + PAGE - 1);
        console.log(`[PHASE_END: Monitoring.Page] rows=${data?.length ?? 0}`);
        if (e) throw e;
        all.push(...((data ?? []) as Metric[]));
        if (!data || data.length < PAGE) break;
      }
      setTruncated(all.length >= MAX_ROWS);
      setRows(all);

      console.log("[PHASE_START: Monitoring.Deliveries]");
      const { data: d, error: de } = await supabase
        .from("api_webhook_deliveries")
        .select("id,event_type,status,attempts,last_status_code,created_at,delivered_at,next_attempt_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);
      console.log(`[PHASE_END: Monitoring.Deliveries] rows=${d?.length ?? 0}`);
      if (de) throw de;
      setDeliveries((d ?? []) as Delivery[]);
      setUpdatedAt(new Date());
    } catch (e) {
      console.error("[Monitoring.Load.Fault]", e, e instanceof Error ? e.stack : "");
      setError(e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Could not load monitoring data.");
    } finally {
      setLoading(false);
      console.log("[PHASE_END: Monitoring.Load]");
    }
  }, [win]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`api-monitoring-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "api_metrics" }, (p) => {
        const r = p.new as Metric;
        setRows((prev) => (prev.some((x) => x.id === r.id) ? prev : [r, ...prev]));
        setUpdatedAt(new Date());
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "api_webhook_deliveries" }, (p) => {
        const r = p.new as Delivery;
        if (!r?.id) return;
        setDeliveries((prev) => [r, ...prev.filter((x) => x.id !== r.id)]);
      })
      .subscribe((s) => setLive(s === "SUBSCRIBED"));
    // Backstop in case the live connection drops silently.
    const poll = setInterval(load, 60_000);
    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [load]);

  const inWindow = useMemo(() => {
    const cutoff = Date.now() - win.ms;
    return rows.filter((r) => r.timestamp && new Date(r.timestamp).getTime() >= cutoff);
  }, [rows, win]);

  const endpoints = useMemo(() => Array.from(new Set(inWindow.map((r) => r.endpoint))).sort(), [inWindow]);
  const view = useMemo(() => (endpoint === "all" ? inWindow : inWindow.filter((r) => r.endpoint === endpoint)), [inWindow, endpoint]);

  const stats = useMemo(() => {
    const total = view.length;
    const lat = view.map((r) => r.latency_ms).sort((a, b) => a - b);
    const ok = view.filter((r) => r.status_code < 400).length;
    const client = view.filter((r) => r.status_code >= 400 && r.status_code < 500 && r.status_code !== 429).length;
    const throttled = view.filter((r) => r.status_code === 429).length;
    const server = view.filter((r) => r.status_code >= 500).length;
    return {
      total, ok, client, throttled, server,
      avg: total ? Math.round(lat.reduce((a, b) => a + b, 0) / total) : 0,
      p95: percentile(lat, 95),
      max: lat[lat.length - 1] ?? 0,
    };
  }, [view]);

  const chart = useMemo(() => {
    const start = Math.floor((Date.now() - win.ms) / win.bucket) * win.bucket;
    const n = Math.ceil(win.ms / win.bucket) + 1;
    const b = Array.from({ length: n }, (_, i) => ({ t: start + i * win.bucket, requests: 0, errors: 0, latSum: 0 }));
    for (const r of view) {
      const i = Math.floor((new Date(r.timestamp!).getTime() - start) / win.bucket);
      if (i < 0 || i >= n) continue;
      b[i].requests++;
      b[i].latSum += r.latency_ms;
      if (r.status_code >= 400) b[i].errors++;
    }
    const fmt = (t: number) => {
      const d = new Date(t);
      return win.ms > 24 * 3600e3
        ? d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit" })
        : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };
    return b.map((x) => ({ time: fmt(x.t), requests: x.requests, errors: x.errors, latency: x.requests ? Math.round(x.latSum / x.requests) : 0 }));
  }, [view, win]);

  const byEndpoint = useMemo(() => {
    const m = new Map<string, { n: number; err: number; lat: number }>();
    for (const r of inWindow) {
      const c = m.get(r.endpoint) ?? { n: 0, err: 0, lat: 0 };
      c.n++; c.lat += r.latency_ms; if (r.status_code >= 400) c.err++;
      m.set(r.endpoint, c);
    }
    return Array.from(m, ([name, c]) => ({ name, ...c, avg: Math.round(c.lat / c.n) })).sort((a, b) => b.n - a.n);
  }, [inWindow]);

  const hooks = useMemo(() => ({
    delivered: deliveries.filter((d) => d.status === "delivered").length,
    pending: deliveries.filter((d) => d.status === "pending").length,
    failed: deliveries.filter((d) => d.status !== "delivered" && d.status !== "pending").length,
  }), [deliveries]);

  const kpis = [
    { label: "Requests", value: stats.total.toLocaleString(), sub: `${win.label} window`, icon: Activity },
    { label: "Latency", value: `${stats.avg}ms`, sub: `p95 ${stats.p95}ms · max ${stats.max}ms`, icon: Clock },
    { label: "Success", value: `${pct(stats.ok, stats.total).toFixed(1)}%`, sub: `${stats.client + stats.server} errors`, icon: Gauge },
    { label: "Throttled", value: stats.throttled.toLocaleString(), sub: "HTTP 429 rate limit", icon: ShieldAlert },
  ];

  const statusMix = [
    { label: "2xx/3xx success", n: stats.ok, cls: "bg-primary" },
    { label: "4xx client/auth", n: stats.client, cls: "bg-muted-foreground" },
    { label: "429 throttled", n: stats.throttled, cls: "bg-accent-foreground" },
    { label: "5xx server", n: stats.server, cls: "bg-destructive" },
  ];

  return (
    <div className="space-y-4 min-w-0">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={live ? "default" : "outline"} className="gap-1.5">
          <span className={`h-2 w-2 rounded-full ${live ? "bg-primary-foreground animate-pulse" : "bg-muted-foreground"}`} />
          {live ? "Live" : "Connecting"}
        </Badge>
        <div className="flex rounded-md border p-0.5">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              onClick={() => setWin(w)}
              className={`px-2.5 py-1 text-xs rounded ${win.id === w.id ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {w.label}
            </button>
          ))}
        </div>
        <Select value={endpoint} onValueChange={setEndpoint}>
          <SelectTrigger className="h-8 w-full sm:w-56 text-xs"><SelectValue placeholder="All endpoints" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All endpoints</SelectItem>
            {endpoints.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="icon" variant="ghost" className="h-8 w-8 ml-auto" onClick={() => load()} aria-label="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      {updatedAt && <p className="text-[11px] text-muted-foreground -mt-2">Updated {updatedAt.toLocaleTimeString()} · your account's calls only{truncated ? ` · showing newest ${MAX_ROWS.toLocaleString()}` : ""}</p>}
      {error && (
        <Card className="border-destructive"><CardContent className="p-3 text-sm text-destructive flex gap-2 items-center"><AlertTriangle className="h-4 w-4" />{error}</CardContent></Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {kpis.map(({ label, value, sub, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">{label}<Icon className="h-4 w-4" /></div>
              <div className="text-xl sm:text-2xl font-bold mt-1 tabular-nums">{value}</div>
              <div className="text-[11px] text-muted-foreground truncate">{sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Throughput */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-0"><CardTitle className="text-sm sm:text-base">Throughput & errors</CardTitle></CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="h-[200px] sm:h-[260px]">
            {stats.total ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="requests" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="errors" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                {loading ? "Loading telemetry…" : `No API calls from your account in the last ${win.label}.`}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Endpoints */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2"><CardTitle className="text-sm sm:text-base">Endpoints</CardTitle></CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
            {byEndpoint.length === 0 && <p className="text-sm text-muted-foreground">No traffic yet.</p>}
            {byEndpoint.slice(0, 8).map((e) => (
              <button key={e.name} onClick={() => setEndpoint(endpoint === e.name ? "all" : e.name)} className="w-full text-left">
                <div className="flex justify-between gap-2 text-xs">
                  <span className="font-mono truncate">{e.name}</span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">{e.n} · {e.avg}ms · {pct(e.err, e.n).toFixed(0)}% err</span>
                </div>
                <div className="h-1.5 mt-1 rounded bg-muted overflow-hidden">
                  <div className={`h-full ${endpoint === e.name ? "bg-primary" : "bg-primary/60"}`} style={{ width: `${pct(e.n, byEndpoint[0].n)}%` }} />
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Status mix */}
        <Card>
          <CardHeader className="p-3 sm:p-4 pb-2"><CardTitle className="text-sm sm:text-base">Response codes</CardTitle></CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
            <div className="flex h-2.5 rounded overflow-hidden bg-muted">
              {statusMix.map((s) => <div key={s.label} className={s.cls} style={{ width: `${pct(s.n, stats.total)}%` }} />)}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {statusMix.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-xs">
                  <span className={`h-2 w-2 rounded-full ${s.cls}`} />
                  <span className="text-muted-foreground truncate">{s.label}</span>
                  <span className="ml-auto tabular-nums font-medium">{s.n}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live log */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2"><CardTitle className="text-sm sm:text-base">Live request log</CardTitle></CardHeader>
        <CardContent className="p-0">
          {view.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No requests in this window.</p>
          ) : (
            <ul className="divide-y max-h-[420px] overflow-y-auto">
              {view.slice(0, 50).map((r) => (
                <li key={r.id}>
                  <button className="w-full text-left px-3 sm:px-4 py-2" onClick={() => setOpenRow(openRow === r.id ? null : r.id)}>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant={statusClass(r.status_code)} className="font-mono px-1.5">{r.status_code}</Badge>
                      <span className="font-mono truncate flex-1">{r.endpoint}</span>
                      <span className="tabular-nums text-muted-foreground">{r.latency_ms}ms</span>
                      <span className="tabular-nums text-muted-foreground hidden sm:inline">{r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : ""}</span>
                    </div>
                    {openRow === r.id && (
                      <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5 font-mono break-all">
                        <div>time: {r.timestamp}</div>
                        <div>error: {r.error_details ?? "none"}</div>
                        <div>id: {r.id}</div>
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2"><Send className="h-4 w-4" />Webhook deliveries</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 pt-0 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["Delivered", hooks.delivered], ["Retrying", hooks.pending], ["Failed", hooks.failed]].map(([l, n]) => (
              <div key={l as string} className="rounded-md border p-2">
                <div className="text-lg font-bold tabular-nums">{n as number}</div>
                <div className="text-[11px] text-muted-foreground">{l as string}</div>
              </div>
            ))}
          </div>
          {deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No webhook deliveries in this window.</p>
          ) : (
            <ul className="divide-y text-xs">
              {deliveries.slice(0, 15).map((d) => (
                <li key={d.id} className="py-1.5 flex items-center gap-2">
                  <Badge variant={d.status === "delivered" ? "default" : d.status === "pending" ? "secondary" : "destructive"} className="px-1.5">{d.status}</Badge>
                  <span className="font-mono truncate flex-1">{d.event_type}</span>
                  <span className="text-muted-foreground tabular-nums">{d.last_status_code ?? "—"} · {d.attempts}×</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
