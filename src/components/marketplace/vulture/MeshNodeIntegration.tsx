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
import { Copy, Key, Terminal, Ban, RefreshCw, Loader2, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MeshKey {
  id: string;
  node_id: string;
  label: string;
  ip_allowlist: string[];
  key_prefix: string;
  status: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string;
  cjis_isolated: boolean;
  revoked_at: string | null;
}

const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

export default function MeshNodeIntegration() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<MeshKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [ipList, setIpList] = useState("");
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [issuedKeyName, setIssuedKeyName] = useState("");
  const [cjisNode, setCjisNode] = useState(true);
  const [editing, setEditing] = useState<MeshKey | null>(null);
  const [editIps, setEditIps] = useState("");

  // All node traffic goes through the FIPS 140-3 AWS API Gateway proxy.
  const endpoint = useMemo(() => MESH_INTAKE_URL, []);

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
  -H "Authorization: Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "<anon key>"}" \\
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
      const { data, error } = await (supabase as any)
        .from("mesh_nodes")
        .select("id,node_id,label,ip_allowlist,key_prefix,status,created_at,last_used_at,expires_at,cjis_isolated,revoked_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setKeys((data ?? []) as MeshKey[]);
      console.info(`[END: Mesh.KeyList] ${data?.length ?? 0} nodes returned.`);
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
      const ip_allowlist = ipList.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean);
      const { data, error } = await invokeWithSession("mesh-nodes", { action: "create", label: name, ip_allowlist, cjis_isolated: cjisNode });
      if (error) throw error;
      setIssuedKey(data.key as string);
      setIssuedKeyName(name);
      setKeyName("");
      setIpList("");
      await fetchKeys();
      console.info("[END: Mesh.KeyCreate] Credential minted.");
    } catch (err) {
      console.error(`[ERROR: Mesh.KeyCreate.Stall] ${err instanceof Error ? err.stack : String(err)}`);
      toast({ title: "Key not issued", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // All lifecycle changes go through the mesh-nodes function, which audits operator + IP.
  // Keys are never deleted so historical ledger attribution stays intact.
  const mutateKey = async (action: "revoke" | "rotate" | "update_allowlist", key: MeshKey, ips?: string[]) => {
    console.info(`[BEGIN: Mesh.Key.${action}] ${key.node_id}`);
    setBusyKeyId(key.id);
    try {
      const body: Record<string, unknown> = { action, id: key.id };
      if (action === "update_allowlist") body.ip_allowlist = ips ?? [];
      const { data, error } = await invokeWithSession("mesh-nodes", body);
      if (error) throw error;
      if (action === "rotate" && data?.key) {
        setIssuedKey(data.key as string);
        setIssuedKeyName(key.label);
      }
      if (action === "update_allowlist") setEditing(null);
      await fetchKeys();
      console.info(`[END: Mesh.Key.${action}] Complete.`);
    } catch (err) {
      console.error(`[ERROR: Mesh.Key.${action}.Stall] ${err instanceof Error ? err.stack : String(err)}`);
      toast({ title: "Action failed", description: "Please try again.", variant: "destructive" });
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
              placeholder="Node label (e.g. Louisville East Cluster)"
            />
            <Input
              value={ipList}
              onChange={(e) => setIpList(e.target.value)}
              placeholder="Allowed IPs (optional, comma separated)"
            />
            <div className="flex items-center gap-2 rounded-md border px-3 sm:shrink-0">
              <Switch id="mesh-cjis" checked={cjisNode} onCheckedChange={setCjisNode} />
              <Label htmlFor="mesh-cjis" className="whitespace-nowrap text-xs">CJIS isolated</Label>
            </div>
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
              keys.map((k) => {
                const left = daysLeft(k.expires_at);
                const live = k.status === "active" && left > 0;
                return (
                <div key={k.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{k.label} <span className="font-mono text-[10px] text-muted-foreground">{k.node_id}</span></p>
                    <p className="truncate font-mono text-[10px] text-muted-foreground">
                      {k.key_prefix}… · {k.ip_allowlist?.length ? `IPs ${k.ip_allowlist.join(", ")} · ` : ""}{k.last_used_at ? `last call ${new Date(k.last_used_at).toLocaleString()}` : "never used"}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {k.status === "revoked"
                        ? `Revoked ${k.revoked_at ? new Date(k.revoked_at).toLocaleDateString() : ""}`
                        : left > 0 ? `Expires in ${left} day${left === 1 ? "" : "s"}` : "Expired — rotate to continue"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {k.cjis_isolated && <Badge variant="secondary" className="text-[10px]">CJIS</Badge>}
                    <Badge variant="outline" className="text-[10px]">
                      {live ? "active" : k.status === "active" ? "expired" : k.status}
                    </Badge>
                    {k.status !== "revoked" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Rotate key"
                        disabled={busyKeyId === k.id} onClick={() => mutateKey("rotate", k)}>
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    {live && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit allowed IPs"
                        disabled={busyKeyId === k.id} onClick={() => { setEditing(k); setEditIps((k.ip_allowlist ?? []).join(", ")); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {k.status === "active" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Revoke key"
                        disabled={busyKeyId === k.id} onClick={() => mutateKey("revoke", k)}>
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2 · Ingest Endpoint</p>
          <SpecBlock label="Endpoint" value={`POST ${endpoint}`} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">3 · Required Headers</p>
          <SpecBlock label="Headers" value={`Authorization: Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "<anon key>"}\nx-api-key: <your mesh node key>\nContent-Type: application/json`} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">4 · Payload Schema</p>
          <SpecBlock label="Payload" value={payloadSample} />
          <p className="text-[11px] text-muted-foreground">
            Up to 500 events per batch. Identifying fields (including officer, badge, ORI, case, incident, VIN, driver's licence,
            date of birth and subject name) are hashed before storage. Add <code className="font-mono">"cjis_isolated": true</code> to keep a
            batch out of analytics and Marketplace bundles; CJIS nodes do this automatically.
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
            value={`200 { "status": "staged_for_notarization", "ledger_id": "…", "trace_id": "…", "events_committed": 1, "raw_hash": "…", "sanitized_hash": "…" }
401 Missing, invalid, revoked or expired (90-day) node key, or origin IP not on the node allowlist
413 Payload over 5 MB
422 { "status": "quarantined", "reason_code": "MALFORMED_JSON", "raw_hash": "…" }
503 Mesh gateway is sealed — ingest refused
500 Internal error (see gateway logs)`}
          />
        </div>
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>Allowed IPs</DialogTitle>
            <DialogDescription>Comma-separated addresses or CIDR ranges. Leave empty to allow any origin.</DialogDescription>
          </DialogHeader>
          <Input value={editIps} onChange={(e) => setEditIps(e.target.value)} placeholder="203.0.113.10, 198.51.100.0/24" />
          <DialogFooter>
            <Button
              disabled={!editing || busyKeyId === editing?.id}
              onClick={() => editing && mutateKey("update_allowlist", editing, editIps.split(/[\s,]+/).map((v) => v.trim()).filter(Boolean))}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!issuedKey} onOpenChange={(open) => !open && setIssuedKey(null)}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Mesh node registered</DialogTitle>
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
