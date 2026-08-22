import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Copy, Eye, EyeOff, Key, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

// 1. STRICT TYPING: Aligned with exact Supabase schema (user_id instead of created_by)
interface APIKeyRecord {
  id: string;
  user_id: string; // FIXED SCHEMA MAPPING
  name: string;
  key_prefix: string;
  key_hash: string;
  environment: string;
  status: "active" | "revoked";
  created_at: string;
  last_used_at: string | null;
}

function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "idia_";
  for (let i = 0; i < 32; i++) key += chars[Math.floor(Math.random() * chars.length)];
  return key;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const APIKeyManagement = () => {
  const { user } = useAuth();
  const userId = user?.user_id;
  const queryClient = useQueryClient();
  
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null);

  // 2. HYDRATED STATE: Typed Query Fetching
  const { data: apiKeys = [], isLoading } = useQuery<APIKeyRecord[]>({
    queryKey: ["api-keys", userId],
    queryFn: async () => {
      console.log("[APIKeyManagement][FetchQuery] START: Retrieving ledger keys for user.");
      if (!userId) {
        console.warn("[APIKeyManagement][FetchQuery] WARN: Execution halted. User ID missing.");
        return [];
      }
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (error) {
        console.error("[APIKeyManagement][FetchQuery] FATAL:", error.message);
        throw error;
      }
      
      console.log(`[APIKeyManagement][FetchQuery] END: Successfully retrieved ${data?.length || 0} keys.`);
      return data as APIKeyRecord[];
    },
    enabled: !!userId,
  });

  // 3. SECURE MUTATION: Generation & Hashing
  const createKey = useMutation({
    mutationFn: async (keyName: string) => {
      console.log("🚀 [APIKeyManagement][createKey] START: Generating new cryptographic key.");
      if (!userId) throw new Error("Not authenticated");
      
      const fullKey = generateApiKey();
      const keyHash = await hashKey(fullKey);
      const keyPrefix = fullKey.slice(0, 13);

      console.log(`[APIKeyManagement][createKey] INFO: Hashing complete. Injecting prefix ${keyPrefix} into ledger.`);

      const { error } = await supabase.from("api_keys").insert([
        {
          user_id: userId, // FIXED SCHEMA MAPPING
          name: keyName,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          environment: "production",
        },
      ]);

      if (error) {
        console.error("[APIKeyManagement][createKey] FATAL: Ledger insertion rejected.", error.message);
        throw error;
      }
      
      console.log("[APIKeyManagement][createKey] END: Key officially registered.");
      return fullKey;
    },
    onSuccess: (fullKey) => {
      setJustCreatedKey(fullKey);
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key generated — copy it now, it won't be shown again");
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  // 4. REVOCATION PROTOCOL
  const revokeKey = useMutation({
    mutationFn: async (keyId: string) => {
      console.log(`🚀 [APIKeyManagement][revokeKey] START: Commencing revocation for key ${keyId}.`);
      const { error } = await supabase.from("api_keys").update({ status: "revoked" }).eq("id", keyId);
      if (error) {
         console.error("[APIKeyManagement][revokeKey] FATAL: Status update failed.", error.message);
         throw error;
      }
      console.log(`[APIKeyManagement][revokeKey] END: Key ${keyId} successfully revoked.`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("API key revoked");
    },
  });

  const handleCreate = () => {
    if (!newKeyName.trim()) {
      toast.error("Enter a key name");
      return;
    }
    createKey.mutate(newKeyName.trim());
    setNewKeyName("");
    setShowCreateDialog(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="space-y-4 min-w-0">
      {justCreatedKey && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary">🔑 New API Key — Copy Now (shown only once)</p>
                <code className="text-xs bg-background p-2 rounded block break-all">{justCreatedKey}</code>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => copyToClipboard(justCreatedKey, "API Key")}>
                  <Copy className="h-4 w-4 mr-1" /> Copy
                </Button>
                <Button size="sm" variant="outline" onClick={() => setJustCreatedKey(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                API Key Management
              </CardTitle>
              <CardDescription>Secure cryptographic keys for API authentication</CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto">
                  <Plus className="h-4 w-4" /> Generate New Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate New API Key</DialogTitle>
                  <DialogDescription>Give your key a descriptive name for easy identification.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Key Name</Label>
                    <Input
                      placeholder="e.g. Production Trading System"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleCreate} disabled={createKey.isPending} className="w-full">
                    {createKey.isPending ? "Generating..." : "Generate Key"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No API keys yet. Generate your first key to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((keyData: APIKeyRecord) => {
                const isVisible = visibleKeys[keyData.id] ?? false;
                return (
                  <div key={keyData.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-semibold text-foreground break-words">{keyData.name}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground break-words">
                          Created: {new Date(keyData.created_at).toLocaleDateString()} • Last used:{" "}
                          {keyData.last_used_at ? new Date(keyData.last_used_at).toLocaleString() : "Never"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          keyData.status === "active"
                            ? "bg-green-500/10 text-green-500 border-green-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                        }
                      >
                        {keyData.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <Input
                        type={isVisible ? "text" : "password"}
                        value={keyData.key_prefix + "•••••••••••••••••••••••"}
                        readOnly
                        className="font-mono text-xs sm:text-sm min-w-0"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => setVisibleKeys((v) => ({ ...v, [keyData.id]: !isVisible }))}
                      >
                        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => copyToClipboard(keyData.key_prefix, keyData.name)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                      <div className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">API Status:</span> {keyData.status}
                      </div>
                      <div className="flex gap-2">
                        {keyData.status === "active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-destructive hover:text-destructive"
                            onClick={() => revokeKey.mutate(keyData.id)}
                            disabled={revokeKey.isPending}
                          >
                            <Trash2 className="h-4 w-4" /> Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};