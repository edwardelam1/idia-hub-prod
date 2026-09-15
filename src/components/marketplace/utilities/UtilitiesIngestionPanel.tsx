import { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, CreditCard, Key, Copy } from "lucide-react";
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
      const { data, error } = await supabase.functions.invoke("issue-extractor-key", {
        body: { action: "create", name: "LIDD Franchise Key" },
      });
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

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast({ title: "API Key Copied", description: "Store this securely. It will not be shown again." });
    }
  };

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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pending Data Dividend Balance</CardTitle>
            <CardDescription>Total un-settled Synapse Credits from staged API extraction events.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              className="w-full gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Settle Balance
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Commercial Ingestion Credentials</CardTitle>
            <CardDescription>
              Generate the API keys required to connect ALPR arrays to the clearinghouse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <Key className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-xs text-foreground">
                {apiKey ? apiKey : "••••••••••••••••••••••••••••"}
              </span>
            </div>
            {apiKey ? (
              <Button variant="outline" onClick={copyToClipboard} className="w-full gap-2">
                <Copy className="h-4 w-4" />
                Copy Key
              </Button>
            ) : (
              <Button onClick={handleGenerateKey} disabled={isGenerating} className="w-full">
                {isGenerating ? "Provisioning..." : "Generate Franchise Key"}
              </Button>
            )}
            {apiKey && (
              <p className="text-[11px] text-muted-foreground">
                Store this securely — it will not be shown again.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {isCheckoutOpen && (
        <SynapsePurchaseModal
          defaultOpen
          onOpenChange={(open) => setIsCheckoutOpen(open)}
          prefillUsd={unpaidBalance}
          onPurchaseComplete={() => void handleSettlementComplete()}
        />
      )}
    </div>
  );
};

export default UtilitiesIngestionPanel;
