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
import { Activity, CreditCard, Key, Copy, Terminal, Trash2, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SynapsePurchaseModal from "@/components/billing/SynapsePurchaseModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import { recordActivity } from "@/lib/activity-history";

interface FranchiseKey {
  id: string;
  name: string;
  key_prefix: string;
  status: string;
  created_at: string;
  last_used_at: string | null;
}

const UtilitiesIngestionPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { balanceData, refreshBalance } = useSynapseCredits();
  const [isSettleOpen, setIsSettleOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const availableCredits = Number(balanceData?.available_credits ?? 0);
  const canCoverBalance = availableCredits >= unpaidBalance;
  const [unpaidBalance, setUnpaidBalance] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [issuedKeyName, setIssuedKeyName] = useState("");
  const [keys, setKeys] = useState<FranchiseKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);

  

  const gatewayStatus = useMemo(() => {
    if (isLoadingKeys) return { label: "Checking…", tone: "muted" as const };
    const active = keys.filter((k) => k.status === "active");
    if (active.length === 0) return { label: "No Keys", tone: "muted" as const };
    const stamps = active.map((k) => (k.last_used_at ? new Date(k.last_used_at).getTime() : 0)).filter(Boolean);
    if (stamps.length === 0) return { label: "Awaiting First Call", tone: "warn" as const };
    const last = Math.max(...stamps);
    const mins = Math.floor((Date.now() - last) / 60000);
    const ago =
      mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
    return { label: `API Active · last call ${ago}`, tone: "live" as const };
  }, [isLoadingKeys, keys]);

  const ingestionEndpoint = useMemo(() => {
    const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
    return `${base}/functions/v1/surveillance-api-intake`;
  }, []);

  const gatewayKey = useMemo(
    () =>
      ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ??
        (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
        "<your_supabase_anon_key>"),
    [],
  );

  const payloadSample = useMemo(
    () =>
      `{
  "infractions": [
    {
      "license_plate": "ABC1234",
      "timestamp": "2026-09-15T14:30:00Z"
    }
  ]
}`,
    [],
  );

  const headersSample = useMemo(
    () =>
      `Authorization: Bearer ${gatewayKey}\nx-api-key: ${apiKey ?? "<your franchise key>"}\nContent-Type: application/json`,
    [apiKey, gatewayKey],
  );

  const curlSample = useMemo(
    () =>
      `curl -X POST "${ingestionEndpoint}" \\
  -H "Authorization: Bearer ${gatewayKey}" \\
  -H "x-api-key: ${apiKey ?? "<your franchise key>"}" \\
  -H "Content-Type: application/json" \\
  -d '${payloadSample.replace(/\n\s*/g, " ")}'`,
    [ingestionEndpoint, apiKey, gatewayKey, payloadSample],
  );


  const fetchBalance = useCallback(async () => {
    if (!user?.user_id) return;
    console.log(`[FETCH_LIDD_BALANCE_START] Retrieving unpaid extraction events for ${user.user_id}`);
    try {
      const { data, error } = await supabase
        .from("lidd_extraction_events")
        .select("synapse_credit_cost")
        .eq("extractor_id", user.user_id)
        .eq("payment_status", "unpaid");

      if (error) {
        console.error(`[FETCH_LIDD_BALANCE_QUERY_ERROR] Failed to query events. Error: ${error.message}`);
        throw error;
      }

      const rows = data ?? [];
      const total = rows.reduce(
        (sum, row: { synapse_credit_cost: number | string }) => sum + Number(row.synapse_credit_cost),
        0,
      );
      setUnpaidBalance(total);
      setEventCount(rows.length);
      console.log(`[FETCH_LIDD_BALANCE_SUCCESS] Found ${rows.length} events totaling ${total} credits.`);
    } catch (err) {
      console.error(`[FETCH_LIDD_BALANCE_FAULT] Caught exception: ${err instanceof Error ? err.stack : String(err)}`);
    } finally {
      setIsLoading(false);
      console.log(`[FETCH_LIDD_BALANCE_END] Process terminated.`);
    }
  }, [user?.user_id]);

  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  const settleWithCredits = useCallback(async () => {
    if (!user?.user_id) return;
    console.log(`[PHASE_START: LIDD_SETTLE] Settling utility balance with Synapse Credits.`);
    setIsSettling(true);
    try {
      const { data, error } = await supabase.functions.invoke("settle-utility-balance", { body: {} });
      if (error) {
        console.error(`[LIDD_SETTLE_INVOKE_ERROR] ${error.message}`);
        throw error;
      }
      if (data?.error === "INSUFFICIENT_CREDITS") {
        console.warn(`[LIDD_SETTLE_INSUFFICIENT] shortfall=${data.shortfall}`);
        toast({
          title: "Not enough credits",
          description: `You need ${Number(data.shortfall ?? 0).toFixed(2)} more CR to settle this balance.`,
          variant: "destructive",
        });
        return;
      }
      if (data?.error) throw new Error(String(data.error));

      const charged = Number(data?.amount_charged ?? 0);
      console.log(`[LIDD_SETTLE_SUCCESS] charged=${charged} reference=${data?.reference_id}`);
      toast({
        title: "Balance settled",
        description: `${charged.toFixed(2)} CR deducted for ${data?.events_settled ?? 0} identity matches.`,
      });

      if (data?.reference_id) {
        void recordActivity({
          source: "marketplace",
          action: "LIDD_UTILITY_SETTLEMENT",
          title: `Utility balance settled — ${charged.toFixed(2)} CR`,
          input: { events_settled: data?.events_settled ?? 0 },
          result: { reference_id: data.reference_id, amount_charged: charged },
          recordsConsumed: Number(data?.events_settled ?? 0),
          synapseCreditCost: charged,
          synapseLedgerEntryId: data?.ledger_entry_id ?? null,
          referenceId: data.reference_id,
          idempotencyKey: String(data.reference_id),
        });
      }

      setIsSettleOpen(false);
      await Promise.all([fetchBalance(), refreshBalance()]);
    } catch (err) {
      console.error(`[LIDD_SETTLE_FAULT] ${err instanceof Error ? err.stack : String(err)}`);
      toast({
        title: "Settlement failed",
        description: "The balance could not be settled. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSettling(false);
      console.log(`[PHASE_END: LIDD_SETTLE] Process terminated.`);
    }
  }, [user?.user_id, fetchBalance, refreshBalance, toast]);

  const handleSettlementComplete = useCallback(async () => {
    console.log(`[PHASE_START: LIDD_TOPUP_COMPLETE] Credits purchased — returning to settlement step.`);
    await refreshBalance();
    setIsCheckoutOpen(false);
    setIsSettleOpen(true);
    console.log(`[PHASE_END: LIDD_TOPUP_COMPLETE] Settlement dialog reopened.`);
  }, [refreshBalance]);

  const fetchKeys = useCallback(async () => {
    console.log(`[API_KEY_LIST_START] Retrieving franchise key history.`);
    try {
      const { data, error } = await supabase.functions.invoke("issue-extractor-key", {
        body: { action: "list" },
      });
      if (error) {
        console.error(`[API_KEY_LIST_QUERY_ERROR] ${error.message}`);
        throw error;
      }
      setKeys((data?.keys ?? []) as FranchiseKey[]);
      console.log(`[API_KEY_LIST_SUCCESS] ${data?.keys?.length ?? 0} keys retrieved.`);
    } catch (err) {
      console.error(`[API_KEY_LIST_FAULT] ${err instanceof Error ? err.stack : String(err)}`);
    } finally {
      setIsLoadingKeys(false);
      console.log(`[API_KEY_LIST_END] Process terminated.`);
    }
  }, []);

  useEffect(() => {
    if (!user?.user_id) return;
    void fetchKeys();
  }, [user?.user_id, fetchKeys]);

  const handleKeyAction = async (keyId: string, action: "revoke" | "delete") => {
    console.log(`[API_KEY_${action.toUpperCase()}_START] Key ${keyId}`);
    setBusyKeyId(keyId);
    try {
      const { error } = await supabase.functions.invoke("issue-extractor-key", {
        body: { action, key_id: keyId },
      });
      if (error) {
        console.error(`[API_KEY_${action.toUpperCase()}_QUERY_ERROR] ${error.message}`);
        throw error;
      }
      toast({
        title: action === "revoke" ? "Key revoked" : "Key deleted",
        description: action === "revoke" ? "This key can no longer authenticate." : "The key record was removed.",
      });
      await fetchKeys();
    } catch (err) {
      console.error(`[API_KEY_${action.toUpperCase()}_FAULT] ${err instanceof Error ? err.stack : String(err)}`);
      toast({ title: "Action failed", description: `Could not ${action} the key.`, variant: "destructive" });
    } finally {
      setBusyKeyId(null);
      console.log(`[API_KEY_${action.toUpperCase()}_END] Process terminated.`);
    }
  };

  const handleGenerateKey = async () => {
    console.log(`[API_KEY_GEN_START] Initiating commercial franchise API key generation.`);
    setIsGenerating(true);
    try {
      console.log(`[API_KEY_GEN_FETCH_START] Requesting new key from edge function.`);
      const { data, error } = await supabase.functions.invoke("issue-extractor-key", {
        body: { action: "create", name: keyName.trim() || "LIDD Franchise Key" },
      });
      console.log(`[API_KEY_GEN_FETCH_END] Issuer responded.`);
      if (error) {
        console.error(`[API_KEY_GEN_QUERY_ERROR] ${error.message}`);
        throw error;
      }
      if (!data?.key) throw new Error("No key returned by the issuer.");
      setIssuedKeyName(keyName.trim() || "LIDD Franchise Key");
      setApiKey(data.key as string);
      setKeyName("");
      console.log(`[API_KEY_GEN_SUCCESS] Key generated successfully.`);
      toast({
        title: "Franchise Key Issued",
        description: "Store this securely. It will not be shown again.",
      });
      await fetchKeys();
    } catch (error) {
      console.error(
        `[API_KEY_GEN_ERROR] Failed to generate key: ${error instanceof Error ? error.stack : String(error)}`,
      );
      toast({
        title: "Key generation failed",
        description: "The credential could not be issued. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      console.log(`[API_KEY_GEN_END] Process terminated.`);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    console.log(`[COPY_TO_CLIPBOARD_START] Copying ${label} to clipboard.`);
    try {
      void navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard", description: `${label} has been copied.` });
    } catch (err) {
      console.error(`[COPY_TO_CLIPBOARD_ERROR] ${err instanceof Error ? err.stack : String(err)}`);
      toast({ title: "Copy failed", description: `Could not copy ${label}.`, variant: "destructive" });
    } finally {
      console.log(`[COPY_TO_CLIPBOARD_END] Copy routine finished.`);
    }
  };

  const CodeBlock = ({ value, label }: { value: string; label: string }) => (
    <div className="flex items-start gap-2">
      <pre className="min-w-0 flex-1 overflow-x-auto rounded-md border bg-muted/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-foreground">
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
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Utility Intake Gateway</h2>
          <p className="text-sm text-muted-foreground">
            Manage your commercial surveillance franchise connections and balances.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            gatewayStatus.tone === "live"
              ? "w-fit gap-1.5 border-emerald-500/40 text-emerald-600"
              : gatewayStatus.tone === "warn"
                ? "w-fit gap-1.5 border-amber-500/40 text-amber-600"
                : "w-fit gap-1.5 border-border text-muted-foreground"
          }
        >
          <Activity className="h-3.5 w-3.5" />
          {gatewayStatus.label}
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pending Data Dividend Balance</CardTitle>
          <CardDescription>Total un-settled Synapse Credits from staged API extraction events.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {isLoading ? "..." : unpaidBalance.toFixed(2)} Credits
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Across {eventCount} specific identity infractions</p>
          </div>
          <Button
            onClick={() => setIsSettleOpen(true)}
            disabled={isLoading || unpaidBalance === 0}
            className="w-full gap-2 sm:w-auto"
          >
            <CreditCard className="h-4 w-4" />
            Settle Balance
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            Commercial Ingestion Integration
          </CardTitle>
          <CardDescription>
            Use these credentials and endpoints to transmit Utility batch data to the clearinghouse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">1. Franchise API Keys</h3>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Key label (e.g. Louisville Utility fleet)"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="sm:flex-1"
              />
              <Button onClick={handleGenerateKey} disabled={isGenerating} className="shrink-0">
                {isGenerating ? "Provisioning..." : "Generate New Key"}
              </Button>
            </div>

            <div className="space-y-2">
              {isLoadingKeys ? (
                <p className="text-xs text-muted-foreground">Loading key history...</p>
              ) : keys.length === 0 ? (
                <p className="text-xs text-muted-foreground">No franchise keys issued yet.</p>
              ) : (
                keys.map((k) => (
                  <div
                    key={k.id}
                    className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{k.name}</span>
                        <Badge variant={k.status === "active" ? "outline" : "secondary"} className="text-[10px]">
                          {k.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {k.key_prefix}••••••••••••••••
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Created {new Date(k.created_at).toLocaleDateString()} • Last used{" "}
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {k.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          disabled={busyKeyId === k.id}
                          onClick={() => void handleKeyAction(k.id, "revoke")}
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Revoke
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        disabled={busyKeyId === k.id}
                        onClick={() => void handleKeyAction(k.id, "delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">2. Ingestion Endpoint</h3>
            <CodeBlock value={`POST ${ingestionEndpoint}`} label="Endpoint URL" />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">3. Required Headers</h3>
            <CodeBlock value={headersSample} label="Headers" />
            <p className="text-[11px] text-muted-foreground">
              The Authorization bearer carries the public gateway key so the request can route through the API
              gateway. Your private franchise key travels in its own x-api-key header, and your identity is resolved
              from its cryptographic hash — never send identifying values in the body.
            </p>

          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">4. JSON Payload Schema</h3>
            <CodeBlock value={payloadSample} label="JSON payload" />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">5. Ready-to-run Example</h3>
            <CodeBlock value={curlSample} label="curl example" />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">6. Response &amp; Errors</h3>
            <CodeBlock
              value={`200 OK
{
  "status": "success",
  "records_processed": 120,
  "matches_found": 14,
  "debt_staged": 35.00
}`}
              label="Success response"
            />
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>
                <span className="font-mono text-foreground">401</span> — missing, unknown or revoked franchise key.
              </li>
              <li>
                <span className="font-mono text-foreground">403</span> — extractor_id in the body does not match the key
                owner.
              </li>
              <li>
                <span className="font-mono text-foreground">400</span> — empty or malformed infractions array.
              </li>
              <li>
                <span className="font-mono text-foreground">500</span> — clearinghouse fault; retry the batch.
              </li>
            </ul>
          </section>
        </CardContent>
      </Card>

      <Dialog open={!!apiKey}>
        <DialogContent
          hideCloseButton
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="left-4 right-4 w-auto max-w-none translate-x-0 overflow-hidden p-4 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:p-6"
        >
          <DialogHeader className="items-center text-center sm:items-start sm:text-left">
            <DialogTitle>Franchise Key Issued</DialogTitle>
            <DialogDescription>Copy this key now — it will not be shown again once dismissed.</DialogDescription>
          </DialogHeader>
          <div className="w-full min-w-0 space-y-3">
            <div className="text-center sm:text-left">
              <p className="text-xs text-muted-foreground">Key label</p>
              <p className="break-words text-sm font-medium text-foreground">{issuedKeyName}</p>
            </div>
            <div className="flex min-w-0 flex-col items-center gap-2 sm:flex-row">
              <div className="flex w-full min-w-0 items-center justify-center gap-2 rounded-md border bg-muted/30 px-3 py-2 sm:flex-1 sm:justify-start">
                <Key className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 break-all text-center font-mono text-xs text-foreground sm:text-left">{apiKey}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Copy API key"
                onClick={() => apiKey && copyToClipboard(apiKey, "API key")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter className="items-center sm:items-end">
            <Button className="w-full sm:w-auto" onClick={() => setApiKey(null)}>
              Dismiss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettleOpen} onOpenChange={(open) => !isSettling && setIsSettleOpen(open)}>
        <DialogContent className="left-4 right-4 w-auto max-w-none translate-x-0 sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2">
          <DialogHeader>
            <DialogTitle>Settle Utility Balance</DialogTitle>
            <DialogDescription>
              Pay the outstanding extraction balance with your Synapse Credits.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Amount due</span>
              <span className="font-semibold text-foreground">{unpaidBalance.toFixed(2)} CR</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Your balance</span>
              <span className="font-semibold text-foreground">{availableCredits.toFixed(2)} CR</span>
            </div>
            <div className="flex items-center justify-between gap-3 border-t pt-2">
              <span className="text-muted-foreground">{canCoverBalance ? "Balance after paying" : "Short by"}</span>
              <span className={`font-semibold ${canCoverBalance ? "text-foreground" : "text-destructive"}`}>
                {canCoverBalance
                  ? `${(availableCredits - unpaidBalance).toFixed(2)} CR`
                  : `${(unpaidBalance - availableCredits).toFixed(2)} CR`}
              </span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {canCoverBalance ? (
              <Button className="w-full gap-2 sm:w-auto" disabled={isSettling} onClick={() => void settleWithCredits()}>
                <CreditCard className="h-4 w-4" />
                {isSettling ? "Processing…" : `Pay ${unpaidBalance.toFixed(2)} CR`}
              </Button>
            ) : (
              <Button
                className="w-full gap-2 sm:w-auto"
                onClick={() => {
                  setIsSettleOpen(false);
                  setIsCheckoutOpen(true);
                }}
              >
                <CreditCard className="h-4 w-4" />
                Buy Credits
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isCheckoutOpen && (
        <SynapsePurchaseModal
          defaultOpen
          onOpenChange={(open) => setIsCheckoutOpen(open)}
          prefillUsdc={unpaidBalance}
          onPurchaseComplete={() => void handleSettlementComplete()}
        />
      )}
    </div>
  );
};

export default UtilitiesIngestionPanel;
