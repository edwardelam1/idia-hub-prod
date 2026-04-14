import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Brain, Search, Coins, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";

interface ChatMessage {
  role: string;
  content: string;
  creditDeducted?: boolean;
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
  const { balanceData, refreshBalance } = useSynapseCredits();
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);

  const isMarketplaceSearch = (msg: string) => {
    return marketplaceMode || MARKETPLACE_TRIGGER.test(msg);
  };

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

  const queryMarketplace = async (query: string) => {
    const { data, error } = await supabase
      .from("marketplace_bundles")
      .select("title, category, contacts_count, features")
      .eq("is_active", true)
      .limit(5);
    if (error) throw error;
    return data || [];
  };

  const handleSendMessage = async () => {
    // GUARD: Prevents blank messages and double-firing from rapid clicks
    if (!currentMessage.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage = currentMessage;
    const doMarketplace = isMarketplaceSearch(userMessage);

    setCurrentMessage(""); // Clear input immediately for UX
    setConversation((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      let marketplaceResults: any[] | undefined;
      let realPipelineData: any[] | undefined;

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

        // 1. Fetch Real Data Summary from the Pipeline
        const { data: healthData } = await supabase
          .from("staged_health_data")
          .select("steps_count, average_heartrate, blood_oxygen_saturation, activity_type")
          .limit(10);

        realPipelineData = healthData || [];
        marketplaceResults = await queryMarketplace(userMessage);

        // 2. Securely deduct the credit
        await deductCredit(searchId);
      }

      const cleanedMessage = userMessage.replace(MARKETPLACE_TRIGGER, "").trim() || userMessage;

      // 3. Ask Best Friend AI
      const data = await fetchApi("/api/v1/best-friend/chat", {
        method: "POST",
        body: JSON.stringify({
          message: cleanedMessage,
          history: conversation.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          context: {
            currentPage: location.pathname,
            isMarketplaceMode: doMarketplace,
            realPipelineData, // GROUND TRUTH INJECTION
          },
          marketplaceResults,
        }),
      });

      if (data?.error) throw new Error(data.error);

      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response || "The pipeline returned no data for this query.",
          creditDeducted: doMarketplace,
        },
      ]);
    } catch (error: any) {
      console.error("Best Friend AI Execution Error:", error);
      const errorMessage = error?.message || "An unknown execution error occurred.";
      toast.error(`Error: ${errorMessage}`);
      setConversation((prev) => [...prev, { role: "error", content: `⚠️ System Alert: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSecureExport = async (messageIndex: number) => {
    setExportingIndex(messageIndex);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        throw new Error("Authentication required");
      }

      const acaRecordIds = Array.from({ length: 5 }, () =>
        `ACA-${Array.from({ length: 16 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')}`
      );

      const { data, error } = await supabase.functions.invoke("process-delt-transfer", {
        body: {
          client_id: `ENT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          aca_record_ids: acaRecordIds,
          country_of_origin: "US",
          egress_type: "secure_export",
          data_summary: { source: "best_friend_chat", query_index: messageIndex },
        },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setConversation(prev => prev.map((msg, i) =>
        i === messageIndex ? {
          ...msg,
          liabilityToken: {
            liability_token_hash: data.liability_token_hash,
            digiramp_anchor_id: data.digiramp_anchor_id,
            egress_log_id: data.egress_log_id,
            egress_fee_charged: data.egress_fee_charged,
          }
        } : msg
      ));

      await refreshBalance();
      toast.success(`Liability Shield: ${data.egress_fee_charged} CRD egress fee charged`);
    } catch (err: any) {
      toast.error(`Secure Export Error: ${err.message}`);
    } finally {
      setExportingIndex(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
          <p className="text-xs text-muted-foreground">IDIA Life Data Pipeline Terminal</p>
        </div>
      </div>

      <ScrollArea className="flex-1 py-4">
        {conversation.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <p className="font-medium text-foreground text-lg">Connected to IDIA Pipeline.</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              Toggle Marketplace Search to authorize deep-query access to staged health and lifestyle data.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {conversation.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`flex items-start gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === "user" ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary"}`}
                  >
                    {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div>
                    <div
                      className={`rounded-lg px-4 py-3 ${message.role === "user" ? "bg-primary text-primary-foreground" : message.role === "error" ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-muted text-foreground"}`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.creditDeducted && (
                      <div className="mt-1 flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0.5">
                          <Coins className="h-2.5 w-2.5" />1 CR deducted
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="pt-4 border-t border-border flex-shrink-0 max-w-3xl mx-auto w-full space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder={marketplaceMode ? "Querying IDIA Life Pipeline..." : "Ask Best Friend AI anything..."}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !currentMessage.trim()} className="px-4">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMarketplaceMode(!marketplaceMode)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              marketplaceMode
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <Search className="h-3 w-3" />
            Marketplace Search (1 CR/search)
          </button>
        </div>
      </div>
    </div>
  );
};

export default BestFriendPage;
