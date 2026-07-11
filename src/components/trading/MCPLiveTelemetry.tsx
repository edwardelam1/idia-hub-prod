import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Radio } from "lucide-react";
import { useMcpTelemetryStream } from "@/hooks/useMcpTelemetryStream";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
    <TooltipProvider delayDuration={150}>
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="cursor-help outline-none">
                  <Radio className={`h-5 w-5 ${connected ? "text-emerald-500" : "text-muted-foreground"}`} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {connected
                  ? "Live: receiving MCP relay events over SSE."
                  : "Offline: no active SSE channel. Enter a valid trading-desk API key to start streaming."}
              </TooltipContent>
            </Tooltip>
            <div>
              <CardTitle className="text-base">Live MCP Telemetry</CardTitle>
              <CardDescription>
                Server-Sent Events stream of relay activity. Trace IDs propagate via W3C traceparent.
              </CardDescription>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="cursor-help outline-none">
                <Badge variant={connected ? "default" : "outline"}>
                  {connected ? "Streaming" : "Idle"}
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs text-xs leading-relaxed">
              <div className="space-y-2">
                <div>
                  <span className="font-semibold text-emerald-500">Streaming</span> — SSE channel
                  open to <code className="font-mono">mcp-telemetry-stream</code>; relay events
                  appear below in real time.
                </div>
                <div>
                  <span className="font-semibold">Idle</span> — no live channel. Common causes:
                  <ul className="mt-1 ml-4 list-disc space-y-0.5">
                    <li>No trading-desk API key entered below.</li>
                    <li>Key rejected by the relay — rotate or re-issue it in API Key Management.</li>
                    <li>Transient network / backoff — reconnect retries automatically.</li>
                  </ul>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Label htmlFor="telemetry-key" className="text-xs cursor-help">
                Trading desk API key
              </Label>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs text-xs">
              Stored in browser localStorage only. Passed as a <code>?apiKey=</code> query
              parameter because the EventSource API cannot send Authorization headers.
            </TooltipContent>
          </Tooltip>
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      className="text-muted-foreground font-mono text-[10px] cursor-help outline-none"
                    >
                      {ev.trace_id ? ev.trace_id.slice(0, 8) : "—"}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="font-mono text-[10px]">
                    {ev.trace_id || "no trace id"}
                  </TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
};

export default MCPLiveTelemetry;