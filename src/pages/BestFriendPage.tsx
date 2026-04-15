import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Brain, Search, Shield, Loader2, FileKey, Activity, CheckCircle, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  liabilityTokenHash?: string | null;
  creditDeducted?: boolean;
  tokenSpend?: number;
}

const BestFriendPage = () => {
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [marketplaceMode, setMarketplaceMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { balanceData, refreshBalance } = useSynapseCredits();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation, isLoading]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    setIsLoading(true);
    const userMessage = currentMessage;
    const doMarketplace = marketplaceMode || /@search\s+marketplace/i.test(userMessage);
    const conversationHistory = [...conversation, { role: "user" as const, content: userMessage }];

    setCurrentMessage("");
    setConversation((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("platform_guid")
        .eq("user_id", user?.id)
        .single();

      const platformGuid = profile?.platform_guid;
      if (!platformGuid) throw new Error("Platform Identity not found.");

      const { data: pseudoData } = await supabase.rpc("generate_pseudonym", {
        input_text: user!.id,
      });
      const pseudoUserId = pseudoData as string | null;

      let realPipelineData: any[] = [];
      let liabilityTokenHash: string | null = null;

      if (doMarketplace) {
        if (!pseudoUserId) throw new Error("Identity resolution failure.");

        // 1. Resolve Auditable Lineage (Multi-Identity Check)
        const [healthResult, sourceArtifacts] = await Promise.all([
          supabase.from("staged_health_data").select("*").eq("pseudo_user_id", pseudoUserId).limit(50),
          supabase.from("user_aca_records").select("aca_hash_key").eq("platform_guid", platformGuid),
        ]);

        realPipelineData = healthResult.data || [];
        const acaHashes = Array.from(
          new Set([
            ...realPipelineData.map((r: any) => r.aca_hash_key),
            ...(sourceArtifacts.data?.map((a) => a.aca_hash_key) || []),
          ]),
        ).filter((h) => h && String(h).trim() !== "");

        if (acaHashes.length === 0) {
          throw new Error("No auditable lineage found for this request.");
        }

        // 2. DELT Protocol Execution
        const { data: transferResult, error: transferError } = await supabase.functions.invoke(
          "process-delt-transfer",
          {
            body: {
              client_id: "chief_researcher_ui",
              aca_record_ids: acaHashes,
              egress_type: "biometric_audit",
            },
          },
        );

        if (transferError) throw new Error(transferError.message);
        liabilityTokenHash = transferResult?.liability_token_hash;

        // 3. Synapse Settlement
        await supabase.functions.invoke("deduct-synapse-credit", { body: { amount: 1 } });
        await refreshBalance();
        queryClient.invalidateQueries({ queryKey: ["egress-logs"] });
      }

      // 4. Agentic Orchestration (Chief Researcher)
      const { data: chatResponse, error: chatError } = await supabase.functions.invoke("best-friend-ai", {
        body: {
          message: userMessage,
          context: {
            isMarketplaceMode: doMarketplace,
            platformGuid,
            userId: user?.id,
            marketplace: doMarketplace
              ? {
                  health: realPipelineData,
                  tokenHash: liabilityTokenHash,
                }
              : null,
          },
          history: conversationHistory.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (chatError) throw new Error("Orchestrator timeout.");

      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: chatResponse?.response || "Analysis finalized.",
          liabilityTokenHash: chatResponse?.tokenHash || liabilityTokenHash,
          creditDeducted: doMarketplace && !!liabilityTokenHash,
          tokenSpend: chatResponse?.tokenSpend,
        },
      ]);
    } catch (error: any) {
      toast.error(error.message);
      setConversation((prev) => [...prev, { role: "assistant", content: `⚠️ System Alert: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const truncateHash = (hash: string) => (hash ? `${hash.substring(0, 8)}...` : "—");

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 bg-slate-50/30 font-sans">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Chief Researcher</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold font-mono">
              Agentic Orchestration Layer
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

      <ScrollArea className="flex-1 py-4 pr-4">
        <div className="space-y-6 max-w-3xl mx-auto">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border shadow-sm text-primary"}`}
                >
                  {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="space-y-2">
                  <div
                    className={`rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border text-foreground"}`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {msg.liabilityTokenHash && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[9px] gap-1 px-1.5 text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-mono p-0"
                          // 🚨 FIXED LINK: Points to egress-logs with search filter
                          onClick={() => navigate(`/egress-logs?search=${msg.liabilityTokenHash}`)}
                        >
                          <FileKey size={10} /> {truncateHash(msg.liabilityTokenHash)}
                        </Button>
                      )}
                      {msg.creditDeducted && (
                        <Badge
                          variant="outline"
                          className="h-5 text-[9px] gap-1 px-1.5 border-emerald-200 text-emerald-700 bg-emerald-50 font-mono"
                        >
                          <CheckCircle size={10} /> SHIELD_ACTIVE
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-card border shadow-sm text-primary">
                  <Bot size={16} />
                </div>
                <div className="rounded-2xl px-5 py-3 text-sm bg-card border text-muted-foreground italic">
                  Chief Researcher is auditing the pipeline...
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} className="h-2" />
        </div>
      </ScrollArea>

      <div className="pt-4 border-t border-border max-w-3xl mx-auto w-full space-y-4">
        <div className="flex gap-2 relative">
          <Input
            placeholder={marketplaceMode ? "Querying Pipeline via Person Anchor..." : "Message Synapse..."}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            disabled={isLoading}
            className="h-14 rounded-2xl pr-14 bg-card shadow-sm border-border focus-visible:ring-primary"
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
            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full border transition-all ${marketplaceMode ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}
          >
            <Search size={14} /> Marketplace Mode (1 CR)
          </button>
        </div>
      </div>
    </div>
  );
};

export default BestFriendPage;
