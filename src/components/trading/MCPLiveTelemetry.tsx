import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Radio } from "lucide-react";
import { useMcpTelemetryStream } from "@/hooks/useMcpTelemetryStream";

const STORAGE_KEY = "mcp.telemetry.apiKey";

export const MCPLiveTelemetry = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setApiKey(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  const { events, connected } = useMcpTelemetryStream(apiKey);

  const handleKeyChange = (v: string) => {
    setApiKey(v || null);
    if (typeof window !== "undefined") {
      if (v) window.localStorage.setItem(STORAGE_KEY, v);
      else window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`h-5 w-5 ${connected ? "text-emerald-500" : "text-muted-foreground"}`} />
            <div>
              <CardTitle className="text-base">Live MCP Telemetry</CardTitle>
              <CardDescription>
                Server-Sent Events stream of relay activity. Trace IDs propagate via W3C traceparent.
              </CardDescription>
            </div>
          </div>
          <Badge variant={connected ? "default" : "outline"}>
            {connected ? "Streaming" : "Idle"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="telemetry-key" className="text-xs">Trading desk API key</Label>
          <Input
            id="telemetry-key"
            type="password"
            placeholder="idia_live_…"
            defaultValue={apiKey ?? ""}
            onBlur={(e) => handleKeyChange(e.target.value.trim())}
          />
          <p className="text-[10px] text-muted-foreground">
            Stored locally only. EventSource cannot send Authorization headers, so the key is passed as a query parameter to the SSE endpoint.
          </p>
        </div>

        <div className="rounded-md border bg-muted/30">
          <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
            <Activity className="h-3 w-3" /> Last {events.length} relay events
          </div>
          <div className="max-h-72 overflow-y-auto divide-y">
            {events.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                Waiting for MCP relay activity…
              </div>
            ) : events.map((ev) => (
              <div key={ev.id} className="px-3 py-2 text-xs flex items-center gap-2">
                <Badge variant={ev.status === "ok" ? "default" : "destructive"} className="text-[10px]">
                  {ev.status}
                </Badge>
                <span className="font-mono truncate flex-1">{ev.tool_name}</span>
                <span className="text-muted-foreground tabular-nums">{ev.duration_ms ?? 0}ms</span>
                <span className="text-muted-foreground font-mono text-[10px]" title={ev.trace_id ?? ""}>
                  {ev.trace_id ? ev.trace_id.slice(0, 8) : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MCPLiveTelemetry;