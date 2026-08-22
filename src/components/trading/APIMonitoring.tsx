import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, AlertTriangle, Info } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function APIMonitoring() {
  const [metrics, setMetrics] = useState({
    totalRequests: 0,
    avgLatency: 0,
    errorRate: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
    const channel = supabase
      .channel("live-metrics")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "api_metrics" }, (payload) => {
        fetchMetrics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMetrics = async () => {
    // Live aggregation over the last 24h of api_metrics.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("api_metrics")
      .select("timestamp,latency_ms,status_code")
      .gte("timestamp", since)
      .order("timestamp", { ascending: false })
      .limit(10000);

    setLoading(false);
    if (data && data.length > 0) {
      const total = data.length;
      const errors = data.filter((d) => d.status_code >= 400).length;
      const avgLat = data.reduce((acc, curr) => acc + curr.latency_ms, 0) / total;

      setMetrics({
        totalRequests: total,
        avgLatency: Math.round(avgLat),
        errorRate: Number(((errors / total) * 100).toFixed(2)),
      });

      // Bucket requests per minute over the last 30 minutes (real counts, no simulation).
      const buckets = new Map<string, { time: string; requests: number; latencySum: number }>();
      const cutoff = Date.now() - 30 * 60 * 1000;
      for (const row of data) {
        const t = new Date(row.timestamp).getTime();
        if (t < cutoff) continue;
        const d = new Date(row.timestamp);
        const bucket = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
        const cur = buckets.get(bucket) ?? { time: bucket, requests: 0, latencySum: 0 };
        cur.requests += 1;
        cur.latencySum += row.latency_ms;
        buckets.set(bucket, cur);
      }
      const chart = Array.from(buckets.values())
        .sort((a, b) => (a.time < b.time ? -1 : 1))
        .map((b) => ({ time: b.time, requests: b.requests, latency: Math.round(b.latencySum / b.requests) }));
      setChartData(chart);
    } else {
      setMetrics({ totalRequests: 0, avgLatency: 0, errorRate: 0 });
      setChartData([]);
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-6 min-w-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Live Vault Requests (24h)
                  <UiTooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}><Info className="w-3 h-3 opacity-60" /></span>
                    </TooltipTrigger>
                    <TooltipContent>Total rows recorded in <code>api_metrics</code> over the last 24 hours. Updates live via Postgres change stream.</TooltipContent>
                  </UiTooltip>
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold mt-2">{metrics.totalRequests.toLocaleString()}</h3>
              </div>
              <div className="p-2.5 sm:p-3 shrink-0 bg-blue-100 rounded-xl">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-3 sm:mt-4 font-medium">
              Sourced from <code>public.api_metrics</code>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Average Latency
                  <UiTooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}><Info className="w-3 h-3 opacity-60" /></span>
                    </TooltipTrigger>
                    <TooltipContent>Mean of <code>latency_ms</code> across every request in the 24h window.</TooltipContent>
                  </UiTooltip>
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold mt-2">{metrics.avgLatency}ms</h3>
              </div>
              <div className="p-2.5 sm:p-3 shrink-0 bg-green-100 rounded-xl">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-3 sm:mt-4 font-medium">Round-trip time as recorded by the gateway</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex justify-between items-start gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  Error Rate
                  <UiTooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0}><Info className="w-3 h-3 opacity-60" /></span>
                    </TooltipTrigger>
                    <TooltipContent>Share of requests where <code>status_code &gt;= 400</code> in the 24h window.</TooltipContent>
                  </UiTooltip>
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold mt-2">{metrics.errorRate}%</h3>
              </div>
              <div className="p-2.5 sm:p-3 shrink-0 bg-red-100 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-3 sm:mt-4 font-medium">Across all vault queries</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            Vault Throughput Telemetry
            <UiTooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}><Info className="w-3.5 h-3.5 opacity-60" /></span>
              </TooltipTrigger>
              <TooltipContent>Requests per minute over the last 30 minutes. Real counts bucketed from <code>api_metrics.timestamp</code>.</TooltipContent>
            </UiTooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] sm:h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRequests)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                {loading ? "Loading telemetry..." : "No requests recorded in the last 30 minutes."}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
}
