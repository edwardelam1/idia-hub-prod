import { invokeWithSession } from "@/lib/invoke-with-session";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Copy, Key, Terminal, Ban, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MeshKey {
  id: string;
  name: string;
  key_prefix: string;
  status: string;
  created_at: string;
  last_used_at: string | null;
}

export default function MeshNodeIntegration() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<MeshKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [issuedKeyName, setIssuedKeyName] = useState("");

  const endpoint = useMemo(() => {
    const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
    return `${base}/functions/v1/mesh-telemetry-intake`;
  }, []);

  const payloadSample = `{
  "node_id": "edge-node-0421",
  "events": [
    {
      "event_type": "LORA_TELEMETRY",
      "latitude": 38.2527,
      "longitude": -85.7585,
      "battery_voltage": 3.94,
      "hdop": 1.2,
      "timestamp": "2026-09-15T14:30:00Z"
    }
  ]
}`;

  const curlSample = `curl -X POST "${endpoint}" \\
  -H "x-api-key: <your mesh node key>" \\
  -H "Content-Type: application/json" \\
  -d '${payloadSample.replace(/\n\s*/g, " ")}'`;

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied` });
    } catch (err) {
      console.error(`[ERROR: Mesh.Copy] ${err instanceof Error ? err.stack : String(err)}`);
    }
  };

  const fetchKeys = useCallback(async () => {
    console.info("[BEGIN: Mesh.KeyList] Listing mesh node credentials.");
    setIsLoadingKeys(true);
    try {
      const { data, error } = await invokeWithSession("issue-extractor-key", { action: "list", environment: "mesh" });
      if (error) throw error;
      setKeys((data?.keys ?? []) as MeshKey[]);
      console.info(`[END: Mesh.KeyList] ${data?.keys?.length ?? 0} credentials returned.`);
    } catch (err) {
      console.error(`[ERROR: Mesh.KeyList.Stall] ${err instanceof Error ? err.stack : String(err)}`);
    } finally {
      setIsLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    void fetchKeys();
  }, [fetchKeys]);

  const generateKey = async () => {
    console.info("[BEGIN: Mesh.KeyCreate] Minting mesh node credential.");
    setIsGenerating(true);
    try {
      const name = keyName.trim() || "Mesh Node Key";
      const { data, error } = await invokeWithSession("issue-extractor-key", { action: "create", environment: "mesh", name });
      if (error) throw error;
      setIssuedKey(data.key as string);
      setIssuedKeyName(name);
      setKeyName("");
      await fetchKeys();
      console.info("[END: Mesh.KeyCreate] Credential minted.");
    } catch (err) {
      console.error(`[ERROR: Mesh.KeyCreate.Stall] ${err instanceof Error ? err.stack : String(err)}`);
      toast({ title: "Key not issued", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const mutateKey = async (action: "revoke" | "delete", keyId: string) => {
    console.info(`[BEGIN: Mesh.Key${action}] Applying ${action} to ${keyId}.`);
    setBusyKeyId(keyId);
    try {
      const { error } = await invokeWithSession("issue-extractor-key", { action, key_id: keyId, environment: "mesh" });
      if (error) throw error;
      await fetchKeys();
      console.info(`[END: Mesh.Key${action}] Complete.`);
    } catch (err) {
      console.error(`[ERROR: Mesh.Key${action}.Stall] ${err instanceof Error ? err.stack : String(err)}`);
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setBusyKeyId(null);
    }
  };

  const SpecBlock = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start gap-2 rounded-md border bg-muted/40 p-3">
      <pre className="flex-1 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-foreground">
        {value}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        aria-label={`Copy ${label}`}
        onClick={() => copyToClipboard(value, label)}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          Mesh Node Integration
        </CardTitle>
        <CardDescription>
          Credentials and endpoint specification for autonomous edge nodes transmitting into the gateway.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">1 · Node Key</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key label (e.g. Louisville East Cluster)"
            />
            <Button onClick={generateKey} disabled={isGenerating} className="gap-2 sm:w-auto">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              Generate Node Key
            </Button>
          </div>

          <div className="space-y-2 pt-1">
            {isLoadingKeys ? (
              <p className="text-xs text-muted-foreground">Loading keys…</p>
            ) : keys.length === 0 ? (
              <p className="text-xs text-muted-foreground">No mesh node keys issued yet.</p>
            ) : (
              keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{k.name}</p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      {k.key_prefix}… · {k.last_used_at ? `last call ${new Date(k.last_used_at).toLocaleString()}` : "never used"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      {k.status}
                    </Badge>
                    {k.status === "active" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Revoke key"
                        disabled={busyKeyId === k.id}
                        onClick={() => mutateKey("revoke", k.id)}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      aria-label="Delete key"
                      disabled={busyKeyId === k.id}
                      onClick={() => mutateKey("delete", k.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2 · Ingest Endpoint</p>
          <SpecBlock label="Endpoint" value={`POST ${endpoint}`} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">3 · Required Headers</p>
          <SpecBlock label="Headers" value={"x-api-key: <your mesh node key>\nContent-Type: application/json"} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">4 · Payload Schema</p>
          <SpecBlock label="Payload" value={payloadSample} />
          <p className="text-[11px] text-muted-foreground">
            Up to 500 events per batch. Identifying fields are hashed before storage and never persisted in the clear.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">5 · Example Call</p>
          <SpecBlock label="Example" value={curlSample} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">6 · Responses</p>
          <SpecBlock
            label="Responses"
            value={`200 { "status": "success", "events_received": 1, "events_committed": 1, "batch_hash": "…" }
401 Missing, invalid or revoked mesh key
400 Missing 'events' array or batch over 500 events
503 Mesh gateway is sealed — ingest refused
500 Internal error (see gateway logs)`}
          />
        </div>
      </CardContent>

      <Dialog open={!!issuedKey} onOpenChange={(open) => !open && setIssuedKey(null)}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Mesh node key issued</DialogTitle>
            <DialogDescription>
              Copy it now — it is shown once and cannot be retrieved again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input value={issuedKeyName} readOnly />
            <div className="flex items-center gap-2">
              <Input value={issuedKey ?? ""} readOnly className="font-mono text-xs" />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Copy key"
                onClick={() => copyToClipboard(issuedKey ?? "", "Key")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIssuedKey(null)}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
