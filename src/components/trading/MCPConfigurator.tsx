import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Copy, Download, Plug, Code2, ShieldCheck, Globe, Terminal } from "lucide-react";
import { toast } from "sonner";
import { useMcpToolSchemas, type McpToolSchema } from "@/hooks/useMcpToolSchemas";

export const MCPConfigurator = () => {
  const { tools, toggleTool, manifestUrl, exportManifest } = useMcpToolSchemas();
  const [drawerTool, setDrawerTool] = useState<McpToolSchema | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
  }, []);

  const SUPABASE_PROJECT_REF = "zxyngqciipcvveigrzqt";
  const fnBase = `https://${SUPABASE_PROJECT_REF}.functions.supabase.co`;
  const remoteManifestUrl = userId
    ? `${fnBase}/mcp-manifest?user_id=${userId}`
    : `${fnBase}/mcp-manifest?user_id=<your-user-id>`;
  const relayUrl = `${fnBase}/mcp-edge-relay`;
  const bridgeScriptUrl = `${window.location.origin}/downloads/idia-mcp-bridge.js`;

  const enabledCount = tools.filter((t) => t.enabled).length;

  const handleCopyManifest = async () => {
    console.log("[MCPConfigurator] START handleCopyManifest");
    try {
      await navigator.clipboard.writeText(exportManifest());
      toast.success("Manifest copied to clipboard");
    } catch (err) {
      console.error("[MCPConfigurator] ERROR handleCopyManifest", err);
      toast.error("Failed to copy manifest");
    } finally {
      console.log("[MCPConfigurator] END handleCopyManifest");
    }
  };

  const handleDownload = () => {
    console.log("[MCPConfigurator] START handleDownload");
    try {
      const blob = new Blob([exportManifest()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mcp.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("mcp.json downloaded");
    } catch (err) {
      console.error("[MCPConfigurator] ERROR handleDownload", err);
      toast.error("Download failed");
    } finally {
      console.log("[MCPConfigurator] END handleDownload");
    }
  };

  const claudeSnippet = `{
  "mcpServers": {
    "idia-hub": {
      "url": "${manifestUrl}",
      "transport": "http"
    }
  }
}`;

  const ollamaSnippet = `# ~/.ollama/mcp.json
{
  "servers": {
    "idia-hub": {
      "endpoint": "${manifestUrl}"
    }
  }
}`;

  const bridgeConfigSnippet = `{
  "mcpServers": {
    "idia-hub": {
      "command": "node",
      "args": ["/absolute/path/to/idia-mcp-bridge.js"],
      "env": {
        "IDIA_API_KEY": "idia_live_...",
        "IDIA_MANIFEST_URL": "${remoteManifestUrl}",
        "IDIA_HUB_URL": "${relayUrl}"
      }
    }
  }
}`;

  const handleDownloadBridge = () => {
    console.log("[MCPConfigurator] START handleDownloadBridge");
    const a = document.createElement("a");
    a.href = bridgeScriptUrl;
    a.download = "idia-mcp-bridge.js";
    a.click();
    toast.success("idia-mcp-bridge.js download started");
    console.log("[MCPConfigurator] END handleDownloadBridge");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary" />
            MCP Server Configurator
          </CardTitle>
          <CardDescription>
            Expose Hub capabilities to local Model Context Protocol clients (Claude Desktop, Ollama, custom agents).
            Toggles below control which JSON-RPC tools are advertised. {enabledCount} of {tools.length} enabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[260px] rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground truncate">
            {manifestUrl || "Manifest URL pending"}
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyManifest}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Manifest
          </Button>
          <Button size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download mcp.json
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tool Catalog</CardTitle>
          <CardDescription>
            Each tool's input schema is parsed directly from the live edge-function contract — local models inherit
            accurate tool-calling signatures.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Schema</TableHead>
                <TableHead className="text-right">Enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tools.map((tool) => (
                <TableRow key={tool.name}>
                  <TableCell>
                    <div className="font-medium text-foreground">{tool.name}</div>
                    <div className="text-xs text-muted-foreground max-w-md">{tool.description}</div>
                  </TableCell>
                  <TableCell>
                    {tool.scope === "public" ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        <Globe className="h-3 w-3 mr-1" />
                        Public Access
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Premium Gated
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">{tool.endpoint}</code>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setDrawerTool(tool)}>
                      <Code2 className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={tool.enabled}
                      onCheckedChange={(v) => toggleTool(tool.name, v)}
                      aria-label={`Toggle ${tool.name}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {tools.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    No tools available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {enabledCount === 0 && tools.length > 0 && (
            <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              No tools are currently enabled. Local MCP clients will see an empty capability set.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Local Client Configuration</CardTitle>
          <CardDescription>Copy these snippets into your local MCP client config.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Claude Desktop</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(claudeSnippet);
                  toast.success("Claude config copied");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <pre className="text-xs bg-muted/60 border border-border rounded-md p-3 overflow-x-auto">
              {claudeSnippet}
            </pre>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Ollama</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(ollamaSnippet);
                  toast.success("Ollama config copied");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <pre className="text-xs bg-muted/60 border border-border rounded-md p-3 overflow-x-auto">
              {ollamaSnippet}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!drawerTool} onOpenChange={(open) => !open && setDrawerTool(null)}>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            Local Bridge (Recommended)
          </CardTitle>
          <CardDescription>
            Run the IDIA MCP Bridge locally to expose your enabled tools to any MCP client over stdio. The bridge
            authenticates with your API key, pulls your live manifest from the Hub, and relays every <code>tools/call</code>{" "}
            envelope through the Liability Shield perimeter — sanitization, billing, and provenance fire automatically
            server-side.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={handleDownloadBridge}>
              <Download className="h-4 w-4 mr-2" />
              Download idia-mcp-bridge.js
            </Button>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <ShieldCheck className="h-3 w-3 mr-1" />
              Liability Shield enforced
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2 text-xs">
            <div className="space-y-1">
              <div className="font-semibold text-muted-foreground">Manifest URL</div>
              <code className="block bg-muted/60 border border-border rounded-md p-2 break-all">
                {remoteManifestUrl}
              </code>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-muted-foreground">JSON-RPC Relay URL</div>
              <code className="block bg-muted/60 border border-border rounded-md p-2 break-all">{relayUrl}</code>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Claude Desktop config (bridge mode)</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(bridgeConfigSnippet);
                  toast.success("Bridge config copied");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <pre className="text-xs bg-muted/60 border border-border rounded-md p-3 overflow-x-auto">
              {bridgeConfigSnippet}
            </pre>
            <p className="text-xs text-muted-foreground">
              Set <code>IDIA_API_KEY</code> to an active key from API Key Management. Trace logs land in{" "}
              <code>idia_mcp_bridge_trace.log</code> next to the script.
            </p>
          </div>
        </CardContent>
      </Card>

      <Sheet open={!!drawerTool} onOpenChange={(open) => !open && setDrawerTool(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{drawerTool?.name}</SheetTitle>
            <SheetDescription>{drawerTool?.description}</SheetDescription>
          </SheetHeader>
          {drawerTool && (
            <pre className="mt-4 text-xs bg-muted/60 border border-border rounded-md p-3 overflow-x-auto">
              {JSON.stringify(
                {
                  name: drawerTool.name,
                  description: drawerTool.description,
                  inputSchema: drawerTool.inputSchema,
                },
                null,
                2,
              )}
            </pre>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MCPConfigurator;