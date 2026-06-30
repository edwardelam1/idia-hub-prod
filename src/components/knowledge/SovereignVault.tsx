import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderLock, RefreshCw, Search, FileText, Plus, AlertTriangle, ShieldCheck } from "lucide-react";
import { useSovereignVault, type VaultSearchHit } from "@/hooks/useSovereignVault";
import { getBridgeUrl } from "@/lib/mcpBridgeSocket";

/**
 * SovereignVault — local knowledge-base browser that talks ONLY to the
 * user's idia-mcp-bridge. No Supabase invocation occurs for vault.*
 * tools (the cloud relay rejects them with -32004).
 */
export const SovereignVault = () => {
  const { bridgeStatus, busy, lastError, refreshBridgeStatus, readNote, search, appendNote } =
    useSovereignVault();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<VaultSearchHit[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [activeContent, setActiveContent] = useState<string>("");
  const [appendDraft, setAppendDraft] = useState<string>("");

  useEffect(() => {
    // Initial index load on mount when bridge is online.
    if (bridgeStatus === "online" && hits.length === 0 && query === "") {
      void (async () => {
        const initial = await search("", 100);
        setHits(initial);
      })();
    }
  }, [bridgeStatus, hits.length, query, search]);

  const handleSearch = async () => {
    const r = await search(query, 100);
    setHits(r);
  };

  const handleOpen = async (filePath: string) => {
    setActivePath(filePath);
    setActiveContent("");
    const r = await readNote(filePath);
    if (r) setActiveContent(r.content);
  };

  const handleAppend = async () => {
    if (!activePath || !appendDraft.trim()) return;
    const ok = await appendNote(activePath, appendDraft.trim());
    if (ok) {
      setAppendDraft("");
      const r = await readNote(activePath);
      if (r) setActiveContent(r.content);
    }
  };

  const statusBadge =
    bridgeStatus === "online" ? (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
        <ShieldCheck className="h-3 w-3 mr-1" />
        Local bridge online
      </Badge>
    ) : bridgeStatus === "offline" ? (
      <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Bridge offline
      </Badge>
    ) : (
      <Badge variant="outline">Probing…</Badge>
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderLock className="h-5 w-5 text-primary" />
            Sovereign Vault
          </CardTitle>
          <CardDescription>
            Your local-only knowledge base. All operations run on your machine through the IDIA MCP bridge —
            vault contents never leave your hardware.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {statusBadge}
          <code className="text-xs text-muted-foreground truncate">{getBridgeUrl()}</code>
          <Button variant="outline" size="sm" onClick={() => void refreshBridgeStatus()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Re-probe
          </Button>
          {lastError && (
            <span className="text-xs text-rose-500 truncate max-w-md" title={lastError}>
              {lastError}
            </span>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Search & Index</CardTitle>
            <CardDescription>Substring or /regex/ over every .md/.txt note.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Empty = full index"
                onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
              />
              <Button onClick={() => void handleSearch()} disabled={busy || bridgeStatus !== "online"}>
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            </div>
            <ScrollArea className="h-[340px] rounded-md border border-border">
              <div className="divide-y divide-border">
                {hits.map((h, i) => (
                  <button
                    key={`${h.filePath}:${h.line}:${i}`}
                    onClick={() => void handleOpen(h.filePath)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      {h.filePath}
                      {h.line > 0 && (
                        <span className="text-xs text-muted-foreground">:{h.line}</span>
                      )}
                    </div>
                    {h.snippet && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">{h.snippet}</div>
                    )}
                  </button>
                ))}
                {hits.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {bridgeStatus === "online" ? "No results." : "Start the bridge to load the vault index."}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{activePath ?? "Select a note"}</CardTitle>
            <CardDescription>Read & append. Append never creates new files.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScrollArea className="h-[260px] rounded-md border border-border bg-muted/30 p-3">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                {activeContent || (activePath ? "(empty)" : "Open a note from the index on the left.")}
              </pre>
            </ScrollArea>
            <Textarea
              value={appendDraft}
              onChange={(e) => setAppendDraft(e.target.value)}
              placeholder="Append AI-reasoned content to this note…"
              rows={4}
              disabled={!activePath || bridgeStatus !== "online"}
            />
            <Button
              onClick={() => void handleAppend()}
              disabled={!activePath || !appendDraft.trim() || busy || bridgeStatus !== "online"}
            >
              <Plus className="h-4 w-4 mr-1" />
              Append to note
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SovereignVault;