import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Activity, CreditCard, Key, Copy, Terminal, Trash2, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SynapsePurchaseModal from "@/components/billing/SynapsePurchaseModal";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const UtilitiesIngestionPanel = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [unpaidBalance, setUnpaidBalance] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [keys, setKeys] = useState<FranchiseKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [busyKeyId, setBusyKeyId] = useState<string | null>(null);

  const extractorId = user?.user_id ?? "YOUR_EXTRACTOR_UUID";

  const ingestionEndpoint = useMemo(() => {
    const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, "") ?? "";
    return `${base}/functions/v1/surveillance-api-intake`;
  }, []);

  const payloadSample = useMemo(
    () =>
      `{
  "extractor_id": "${extractorId}",
  "infractions": [
    {
      "license_plate": "ABC1234",
      "timestamp": "2026-09-15T14:30:00Z"
    }
  ]
}`,
    [extractorId],
  );

  const headersSample = useMemo(
    () => `x-api-key: ${apiKey ?? "<your franchise key>"}\nContent-Type: application/json`,
    [apiKey],
  );

  const curlSample = useMemo(
    () =>
      `curl -X POST "${ingestionEndpoint}" \\
  -H "x-api-key: ${apiKey ?? "<your franchise key>"}" \\
  -H "Content-Type: application/json" \\
  -d '${payloadSample.replace(/\n\s*/g, " ")}'`,
    [ingestionEndpoint, apiKey, payloadSample],
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
      const total = rows.reduce((sum, row: { synapse_credit_cost: number | string }) => sum + Number(row.synapse_credit_cost), 0);
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

  const handleSettlementComplete = useCallback(async () => {
    if (!user?.user_id) return;
    console.log(`[LIDD_SETTLE_START] Marking staged extraction events as paid for ${user.user_id}`);
    try {
      const { error } = await supabase
        .from("lidd_extraction_events")
        .update({ payment_status: "paid" })
        .eq("extractor_id", user.user_id)
        .eq("payment_status", "unpaid");
      if (error) {
        console.error(`[LIDD_SETTLE_QUERY_ERROR] ${error.message}`);
        throw error;
      }
      console.log(`[LIDD_SETTLE_SUCCESS] Staged events settled.`);
      await fetchBalance();
    } catch (err) {
      console.error(`[LIDD_SETTLE_FAULT] ${err instanceof Error ? err.stack : String(err)}`);
    } finally {
      console.log(`[LIDD_SETTLE_END] Process terminated.`);
    }
  }, [user?.user_id, fetchBalance]);

  const handleGenerateKey = async () => {
    console.log(`[API_KEY_GEN_START] Initiating commercial franchise API key generation.`);
    setIsGenerating(true);
    try {
      console.log(`[API_KEY_GEN_FETCH_START] Requesting new key from edge function.`);
      const { data, error } = await supabase.functions.invoke("issue-extractor-key", {
        body: { action: "create", name: "LIDD Franchise Key" },
      });
      console.log(`[API_KEY_GEN_FETCH_END] Issuer responded.`);
      if (error) {
        console.error(`[API_KEY_GEN_QUERY_ERROR] ${error.message}`);
        throw error;
      }
      if (!data?.key) throw new Error("No key returned by the issuer.");
      setApiKey(data.key as string);
      console.log(`[API_KEY_GEN_SUCCESS] Key generated successfully.`);
      toast({
        title: "Franchise Key Issued",
        description: "Store this securely. It will not be shown again.",
      });
    } catch (error) {
      console.error(`[API_KEY_GEN_ERROR] Failed to generate key: ${error instanceof Error ? error.stack : String(error)}`);
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
        <Badge variant="outline" className="w-fit gap-1.5 border-primary/40 text-primary">
          <Activity className="h-3.5 w-3.5" />
          API Active
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
            <p className="mt-1 text-xs text-muted-foreground">
              Across {eventCount} specific identity infractions
            </p>
          </div>
          <Button
            onClick={() => setIsCheckoutOpen(true)}
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
            Use these credentials and endpoints to transmit ALPR batch data to the clearinghouse.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">1. Franchise API Key</h3>
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                <Key className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-mono text-xs text-foreground">
                  {apiKey ?? "••••••••••••••••••••••••••••"}
                </span>
              </div>
              {apiKey ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-label="Copy API key"
                  onClick={() => copyToClipboard(apiKey, "API key")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleGenerateKey} disabled={isGenerating} className="shrink-0">
                  {isGenerating ? "Provisioning..." : "Generate Key"}
                </Button>
              )}
            </div>
            {apiKey && (
              <p className="text-[11px] text-muted-foreground">
                Store this securely — it will not be shown again.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">2. Ingestion Endpoint</h3>
            <CodeBlock value={`POST ${ingestionEndpoint}`} label="Endpoint URL" />
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">3. Required Headers</h3>
            <CodeBlock value={headersSample} label="Headers" />
            <p className="text-[11px] text-muted-foreground">
              The gateway authenticates on the franchise key alone — no user login is required.
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
                <span className="font-mono text-foreground">403</span> — extractor_id in the body does not match the key owner.
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
