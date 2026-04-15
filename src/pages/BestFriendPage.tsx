import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Brain, Search, Coins, Shield, Loader2, FileKey, Activity } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";

interface ChatMessage {
  role: string;
  content: string;
  creditDeducted?: boolean;
  queryEgressToken?: {
    liability_token_hash: string;
  };
  liabilityToken?: {
    liability_token_hash: string;
    digiramp_anchor_id: string;
    egress_log_id: string;
    egress_fee_charged: number;
  };
}

const MARKETPLACE_TRIGGER = /@search\s+marketplace/i;

const BestFriendPage = () => {
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [marketplaceMode, setMarketplaceMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { balanceData, refreshBalance } = useSynapseCredits();
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);

  const isMarketplaceSearch = (msg: string) => marketplaceMode || MARKETPLACE_TRIGGER.test(msg);

  const deductCredit = async (searchId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error("Authentication required.");

    const { data, error } = await supabase.functions.invoke("deduct-synapse-credit", {
      body: { amount: 1, description: "Marketplace Search Query", referenceId: searchId },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) throw new Error(`Network Error: ${error.message}`);
    if (data?.error) throw new Error(`Billing Error: ${data.error}`);

    await refreshBalance();
  };

  const queryMarketplace = async () => {
    const { data, error } = await supabase
      .from("marketplace_bundles")
      .select("title, category, participant_count, tier, price, features")
      .eq("is_active", true)
      .limit(10);
    if (error) throw error;
    return data || [];
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage = currentMessage;
    const doMarketplace = isMarketplaceSearch(userMessage);

    setCurrentMessage("");
    setConversation((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      let marketplaceResults: any[] | undefined;
      let realPipelineData: any[] | undefined;
      let realLifestyleData: any[] | undefined;
      let queryEgressToken: any = undefined;

      // 1. RESOLVE HASH IDENTITY (The Anchor)
      const { data: acaResult } = await supabase
        .from("user_aca_records")
        .select("aca_hash_key, platform_guid")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!acaResult?.aca_hash_key) {
        throw new Error("DELT Protocol Error: No active ACA Hash found. Connect a data source to generate an anchor.");
      }

      const activeAcaHash = acaResult.aca_hash_key;

      if (doMarketplace) {
        const available = balanceData?.available_credits ?? 0;
        if (available < 1) {
          toast.error("Insufficient Synapse Credits");
          setConversation((prev) => [
            ...prev,
            { role: "error", content: "Insufficient Synapse Credits (1 CR required)." },
          ]);
          setIsLoading(false);
          return;
        }

        const searchId = `SEARCH-${crypto.randomUUID().slice(0, 8)}`;

        // 2. FETCH DATA VIA PSEUDONYM (Hash-linked GUID)
        const [healthResult, lifestyleResult] = await Promise.all([
          supabase
            .from("staged_health_data")
            .select("*")
            .eq("pseudo_user_id", acaResult.platform_guid)
            .order("processed_at", { ascending: false })
            .limit(100),
          supabase
            .from("staged_lifestyle_data")
            .select("*")
            .eq("pseudo_user_id", acaResult.platform_guid)
            .order("processed_at", { ascending: false })
            .limit(100),
        ]);

        realPipelineData = healthResult.data || [];
        realLifestyleData = lifestyleResult.data || [];

        marketplaceResults = await queryMarketplace();
        await deductCredit(searchId);

        // 3. LOG EGRESS
        const { data: sessionData } = await supabase.auth.getSession();
        const { data: egressData } = await supabase.functions.invoke("process-delt-transfer", {
          body: {
            client_id: `HUB-AI-${searchId}`,
            aca_hash: activeAcaHash,
            egress_type: "ai_query_context",
            data_summary: { source: "best_friend_chat", query: userMessage },
          },
          headers: { Authorization: `Bearer ${sessionData?.session?.access_token}` },
        });

        if (egressData?.liability_token_hash) {
          queryEgressToken = { liability_token_hash: egressData.liability_token_hash };
        }
      }

      const cleanedMessage = userMessage.replace(MARKETPLACE_TRIGGER, "").trim() || userMessage;

      // 4. AI FULFILLMENT
      const data = await fetchApi("/api/v1/best-friend/chat", {
        method: "POST",
        body: JSON.stringify({
          message: cleanedMessage,
          aca_hash: activeAcaHash, // Passing Hash as the context key
          history: conversation.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          context: {
            isMarketplaceMode: doMarketplace,
            realPipelineData,
            realLifestyleData,
          },
          marketplaceResults,
        }),
      });

      if (data?.error) throw new Error(data.error);

      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response || "Synapse Orchestrator returned no data.",
          creditDeducted: doMarketplace,
          queryEgressToken: queryEgressToken,
        },
      ]);
    } catch (error: any) {
      toast.error(`Provenance Error: ${error.message}`);
      setConversation((prev) => [...prev, { role: "error", content: `⚠️ System Alert: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecureExport = async (messageIndex: number) => {
    setExportingIndex(messageIndex);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const { data: acaResult } = await supabase
        .from("user_aca_records")
        .select("aca_hash_key")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!acaResult?.aca_hash_key) throw new Error("No active ACA Hash found.");

      const { data, error } = await supabase.functions.invoke("process-delt-transfer", {
        body: {
          client_id: `ENT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          aca_hash: acaResult.aca_hash_key,
          egress_type: "secure_export",
          data_summary: { source: "best_friend_chat_export", query_index: messageIndex },
        },
        headers: { Authorization: `Bearer ${sessionData?.session?.access_token}` },
      });

      if (error || data?.error) throw new Error(error?.message || data?.error);

      setConversation((prev) =>
        prev.map((msg, i) =>
          i === messageIndex
            ? {
                ...msg,
                liabilityToken: {
                  liability_token_hash: data.liability_token_hash,
                  digiramp_anchor_id: data.digiramp_anchor_id,
                  egress_log_id: data.egress_log_id,
                  egress_fee_charged: data.egress_fee_charged,
                },
              }
            : msg,
        ),
      );

      await refreshBalance();
      toast.success("Liability Shield Active: Export Secure");
    } catch (err: any) {
      toast.error(`Export Error: ${err.message}`);
    } finally {
      setExportingIndex(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Best Friend AI</h1>
          <p className="text-xs text-muted-foreground font-mono">Liability Shield Terminal</p>
        </div>
      </div>

      <ScrollArea className="flex-1 py-4">
        {conversation.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Activity className="h-8 w-8 text-primary" />
            </div>
            <p className="font-medium text-foreground text-lg">Connected to Synapse Pipeline.</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Use <code className="bg-muted px-1">@search marketplace</code> to anchor your query with a cryptographic
              ACA hash for real-time truth verification.
            </p>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto">
            {conversation.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`flex items-start gap-3 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === "user" ? "bg-primary" : "bg-muted border border-border"}`}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2 group">
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border text-foreground"}`}
                    >
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>

                    {/* ACA HASH & RECEIPT DISPLAY */}
                    <div
                      className={`flex items-center gap-2 flex-wrap ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.queryEgressToken && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-[10px] gap-1.5 px-3 bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all font-mono"
                            onClick={() => navigate("/trading")}
                          >
                            <FileKey className="h-3 w-3" />
                            HASH: {message.queryEgressToken.liability_token_hash.substring(0, 12)}...
                          </Button>
                          <Badge
                            variant="outline"
                            className="h-7 text-[10px] font-mono border-emerald-100 text-emerald-600 bg-emerald-50/50"
                          >
                            ACA_VERIFIED
                          </Badge>
                        </div>
                      )}

                      {message.creditDeducted && !message.liabilityToken && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] gap-1.5 px-3 border border-border hover:bg-muted"
                          disabled={exportingIndex === index}
                          onClick={() => handleSecureExport(index)}
                        >
                          {exportingIndex === index ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Shield className="h-3 w-3" />
                          )}
                          Secure Export (250 CRD)
                        </Button>
                      )}
                    </div>

                    {/* LIABILITY SHIELD TOKEN */}
                    {message.liabilityToken && (
                      <div className="mt-1 animate-in fade-in slide-in-from-top-2">
                        <div
                          className="p-3 bg-emerald-600 rounded-xl border border-emerald-400 text-[11px] font-mono text-white shadow-lg cursor-pointer hover:bg-emerald-700 transition-colors"
                          onClick={() => navigate("/trading")}
                        >
                          <div className="flex items-center justify-between mb-2 border-b border-emerald-400/30 pb-1">
                            <span className="flex items-center gap-1 font-bold">
                              <Shield className="h-3 w-3" /> LIABILITY_SHIELD_ACTIVE
                            </span>
                            <span>{message.liabilityToken.egress_fee_charged} CRD Paid</span>
                          </div>
                          <p className="opacity-80">TOKEN: {message.liabilityToken.liability_token_hash}</p>
                          <p className="opacity-80 mt-0.5">ANCHOR: {message.liabilityToken.digiramp_anchor_id}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* FOOTER INPUT */}
      <div className="pt-4 border-t border-border flex-shrink-0 max-w-3xl mx-auto w-full space-y-3">
        <div className="flex gap-2 relative">
          <Input
            placeholder={
              marketplaceMode ? "Querying IDIA Pipeline via ACA Anchor..." : "Ask Best Friend AI anything..."
            }
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            disabled={isLoading}
            className="flex-1 rounded-2xl pr-12 focus-visible:ring-primary h-12"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !currentMessage.trim()}
            className="absolute right-1 top-1 h-10 w-10 rounded-xl p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setMarketplaceMode(!marketplaceMode)}
            className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold px-4 py-2 rounded-full border transition-all ${marketplaceMode ? "bg-primary text-white border-primary" : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"}`}
          >
            <Search className="h-3 w-3" />
            Marketplace Analytics (1 CR)
          </button>
          <div className="flex gap-2 items-center text-[10px] text-muted-foreground font-mono">
            <Activity className="h-3 w-3 text-emerald-500" /> SYNC_PIPELINE: ACTIVE
          </div>
        </div>
      </div>
    </div>
  );
};

export default BestFriendPage;
