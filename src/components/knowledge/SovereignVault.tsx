import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FolderLock, RefreshCw, Search, FileText, Plus, ShieldCheck } from "lucide-react";
import { useSovereignVault, type VaultNoteSummary } from "@/hooks/useSovereignVault";

/**
 * SovereignVault — local knowledge-base browser that talks ONLY to the
 * user's idia-mcp-bridge. No Supabase invocation occurs for vault.*
 * tools (the cloud relay rejects them with -32004).
 */
export const SovereignVault = () => {
  const { busy, lastError, notes, listNotes, search, readNote, createNote, appendNote } =
    useSovereignVault();
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<VaultNoteSummary[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("");
  const [activeContent, setActiveContent] = useState<string>("");
  const [appendDraft, setAppendDraft] = useState<string>("");
  const [newTitle, setNewTitle] = useState<string>("");

  const items = useMemo(() => searchHits ?? notes, [searchHits, notes]);

  const handleSearch = async () => {
    if (!query.trim()) {
      setSearchHits(null);
      return;
    }
    const r = await search(query, 100);
    setSearchHits(r);
  };

  const handleOpen = async (id: string) => {
    setActiveId(id);
    setActiveTitle("");
    setActiveContent("");
    const r = await readNote(id);
    if (r) {
      setActiveTitle(r.title);
      setActiveContent(r.content);
    }
  };

  const handleAppend = async () => {
    if (!activeId || !appendDraft.trim()) return;
    const ok = await appendNote(activeId, "\n" + appendDraft.trim());
    if (ok) {
      setAppendDraft("");
      const r = await readNote(activeId);
      if (r) setActiveContent(r.content);
    }
  };

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const note = await createNote(title, "", []);
    setNewTitle("");
    if (note) void handleOpen(note.id);
  };

  useEffect(() => {
    // initial load handled by hook
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderLock className="h-5 w-5 text-primary" />
            Sovereign Vault
          </CardTitle>
          <CardDescription>
            Your private knowledge base, stored in Supabase under row-level security. Only you can read or
            modify your notes — full-text indexed for instant search as your vault compounds.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
            <ShieldCheck className="h-3 w-3 mr-1" />
            RLS-scoped to your account
          </Badge>
          <span className="text-xs text-muted-foreground">{notes.length} note{notes.length === 1 ? "" : "s"}</span>
          <Button variant="outline" size="sm" onClick={() => void listNotes()} disabled={busy}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New note title"
              className="w-56"
              onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
            />
            <Button size="sm" onClick={() => void handleCreate()} disabled={!newTitle.trim() || busy}>
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
          </div>
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
            <CardDescription>
              Postgres full-text search across every note (GIN-indexed tsvector). Empty = full list.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title + content…"
                onKeyDown={(e) => e.key === "Enter" && void handleSearch()}
              />
              <Button onClick={() => void handleSearch()} disabled={busy}>
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
            </div>
            <ScrollArea className="h-[340px] rounded-md border border-border">
              <div className="divide-y divide-border">
                {items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => void handleOpen(n.id)}
                    className={`w-full text-left px-3 py-2 hover:bg-muted/50 ${
                      activeId === n.id ? "bg-muted/60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{n.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(n.updated_at).toLocaleString()}
                      </span>
                      {n.tags?.slice(0, 4).map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px] px-1 py-0">
                          #{t}
                        </Badge>
                      ))}
                    </div>
                  </button>
                ))}
                {items.length === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {busy ? "Loading…" : "No notes yet. Create one above."}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base truncate">
              {activeTitle || (activeId ? "(untitled)" : "Select a note")}
            </CardTitle>
            <CardDescription>Read & append. Appends are atomic (row-locked).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ScrollArea className="h-[260px] rounded-md border border-border bg-muted/30 p-3">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed">
                {activeContent || (activeId ? "(empty)" : "Open a note from the index on the left.")}
              </pre>
            </ScrollArea>
            <Textarea
              value={appendDraft}
              onChange={(e) => setAppendDraft(e.target.value)}
              placeholder="Append AI-reasoned content to this note…"
              rows={4}
              disabled={!activeId}
            />
            <Button
              onClick={() => void handleAppend()}
              disabled={!activeId || !appendDraft.trim() || busy}
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