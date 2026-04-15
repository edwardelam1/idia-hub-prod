import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Brain, Search, Activity, FileKey, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  isMarketplaceResponse?: boolean;
  egressToken?: string;
  creditDeducted?: boolean;
}

const BestFriendChat = () => {
  const [conversation, setConversation] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [marketplaceMode, setMarketplaceMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { refreshBalance } = useSynapseCredits();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation, isLoading]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage = currentMessage;
    const isModeActive = marketplaceMode || /@search\s+marketplace/i.test(userMessage);

    setCurrentMessage("");
    setConversation((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      let marketplaceData = [];
      let liabilityToken = null;

      if (isModeActive) {
        // 1. CONSUMPTION: Fetch Marketplace Data (The Creator's Payloads)
        // We pull recent staged data to provide context to the AI
        const [health, lifestyle] = await Promise.all([
          supabase.from("staged_health_data").select("*").order("created_at", { ascending: false }).limit(10),
          supabase.from("staged_lifestyle_data").select("*").order("created_at", { ascending: false }).limit(10),
        ]);

        marketplaceData = [...(health.data || []), ...(lifestyle.data || [])];

        // 2. LINEAGE: Extract the Creator's cryptographic anchor (ACA Hash)
        const sourceAcaHash = marketplaceData.find((row: any) => row.aca_hash_key)?.aca_hash_key;

        if (sourceAcaHash) {
          const { data: deltResponse, error: deltError } = await supabase.functions.invoke("process-delt-transfer", {
            body: {
              aca_hash: sourceAcaHash,
              egress_type: "ai_query_context",
              client_id: "BEST_FRIEND_HUB_UI",
              // Aligning with the schema's 'data_payload_summary' field
              metadata: {
                query: userMessage,
                context: "Marketplace AI Search",
              },
            },
          });

          if (!deltError && deltResponse?.liability_token_hash) {
            liabilityToken = deltResponse.liability_token_hash;
          } else {
            console.error("Liability Token Transfer Error:", deltError);
          }
        }

        // 4. SETTLEMENT: Deduct Synapse Credit from Buyer
        await supabase.functions.invoke("deduct-synapse-credit", { body: { amount: 1 } });
        await refreshBalance();
      }

      // 5. INFERENCE: Hit the Synapse AI Engine
      const chatResponse = await fetchApi("/api/v1/best-friend/chat", {
        method: "POST",
        body: JSON.stringify({
          message: userMessage.replace(/@search\s+marketplace/i, "").trim(),
          context: {
            marketplaceData,
            isMarketplaceMode: isModeActive,
          },
        }),
      });

      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: chatResponse.response,
          isMarketplaceResponse: isModeActive,
          egressToken: liabilityToken,
          creditDeducted: isModeActive,
        },
      ]);
    } catch (error: any) {
      console.error("Chat Error:", error);
      toast.error(error.message || "Failed to process query");
      setConversation((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ System Alert: The Synapse link was interrupted." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 bg-slate-50/30">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Best Friend AI</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold font-mono">
              Liability Shield Terminal
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="h-6 text-[10px] gap-1 px-2 border-emerald-200 text-emerald-700 bg-emerald-50"
        >
          <Activity className="h-3 w-3" /> PIPELINE_LIVE
        </Badge>
      </div>

      {/* Chat Space */}
      <ScrollArea className="flex-1 py-4 pr-4">
        <div className="space-y-6 max-w-3xl mx-auto">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    msg.role === "user" ? "bg-primary text-white" : "bg-white border shadow-sm text-primary"
                  }`}
                >
                  {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="space-y-2">
                  <div
                    className={`rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                      msg.role === "user" ? "bg-primary text-white" : "bg-white border text-slate-800"
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Receipt Display (Egress Logs Link) */}
                  {msg.role === "assistant" && msg.creditDeducted && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Badge
                        variant="outline"
                        className="h-5 text-[9px] gap-1 px-2 border-amber-200 text-amber-700 bg-amber-50 font-mono"
                      >
                        <Activity className="h-2.5 w-2.5" />
                        -1 CRD SPENT
                      </Badge>

                      {msg.egressToken && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/compliance?search=${msg.egressToken}`)}
                          className="h-5 text-[9px] gap-1.5 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-mono transition-colors border border-indigo-100"
                        >
                          <FileKey size={10} />
                          RECEIPT: {msg.egressToken.substring(0, 12).toUpperCase()}...
                        </Button>
                      )}

                      <Badge
                        variant="outline"
                        className="h-5 text-[9px] gap-1 px-2 border-slate-200 text-slate-500 bg-slate-50 font-mono"
                      >
                        <ShieldCheck className="h-2.5 w-2.5 text-emerald-500" />
                        LIABILITY_SHIELD_ACTIVE
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center flex-shrink-0 text-primary">
                  <Bot size={16} />
                </div>
                <div className="bg-white border rounded-2xl px-5 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-mono">Processing DELT Transfer...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} className="h-2" />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="pt-4 border-t border-slate-200 max-w-3xl mx-auto w-full space-y-4">
        <div className="flex gap-2 relative">
          <Input
            placeholder={marketplaceMode ? "Querying marketplace with lineage..." : "Ask Synapse anything..."}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            disabled={isLoading}
            className="h-14 rounded-2xl pr-14 bg-white shadow-sm border-slate-200 focus-visible:ring-primary"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !currentMessage.trim()}
            className="absolute right-2 top-2 h-10 w-10 rounded-xl p-0"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </Button>
        </div>
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setMarketplaceMode(!marketplaceMode)}
            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full border transition-all ${
              marketplaceMode
                ? "bg-primary text-white border-primary shadow-md"
                : "bg-white text-slate-500 border-slate-200 hover:border-primary/40"
            }`}
          >
            <Search size={14} />
            {marketplaceMode ? "Marketplace Access: ON" : "Toggle Marketplace (1 CR)"}
          </button>

          {marketplaceMode && (
            <span className="text-[9px] font-mono text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              ACA Gating Enabled
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BestFriendChat;
