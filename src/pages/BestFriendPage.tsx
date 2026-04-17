import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Brain, Search, Shield, Loader2, FileKey, Activity, Coins } from "lucide-react";
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
  if (typeof window !== "undefined") {
    (window as any).supabase = supabase;
  }
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const client_id = user.id;

    console.log(`Identity Resolved: ${client_id}`);
    try {
      // 1. DYNAMIC IDENTITY GRAB (Crucial for the 30% payout)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("platform_guid")
        .eq("user_id", user?.id)
        .single();

      const activeGuid = profile?.platform_guid;
      if (!activeGuid) throw new Error("Identity resolution failure: No platform_guid.");

      // 2. WAREHOUSE GRAB
      const { data: healthData } = await supabase
        .from("staged_health_data")
        .select("*")
        .eq("user_id", user?.id) // Direct identity link
        .eq("reward_calculated", true); // Only pull data that has been paid for

      const realPipelineData = healthData || [];

      // 3. THE MINTING (Passing the GUID to unlock the 30% split)
      let liabilityTokenHash = null;
      if (marketplaceMode && realPipelineData.length > 0) {
        const { data: tokenResult, error: tokenError } = await supabase.functions.invoke("synapse-controller", {
          body: {
            aca_record_ids: realPipelineData.map((d) => d.aca_hash_key),
            platform_guid: activeGuid,
            query_complexity: 1.0,
          },
        });

        if (tokenError) throw new Error(`Synapse Error: ${tokenError.message}`);

        liabilityTokenHash = tokenResult?.liability_token_hash ?? null;
      }

      // 4. THE AI CALL
      const { data: chatResponse } = await supabase.functions.invoke("best-friend-ai", {
        body: {
          message: currentMessage,
          context: {
            isMarketplaceMode: marketplaceMode,
            platformGuid: activeGuid,
            marketplace: marketplaceMode
              ? {
                  // Changed from 'health' to 'healthRecords'
                  healthRecords: realPipelineData,
                  liabilityTokenHash: liabilityTokenHash,
                }
              : null,
          },
          history: conversation.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      // 5. UPDATE UI
      setConversation((prev) => [
        ...prev,
        { role: "user", content: currentMessage },
        {
          role: "assistant",
          content: chatResponse?.response || "Analysis complete.",
          liabilityTokenHash: liabilityTokenHash,
          creditDeducted: !!liabilityTokenHash,
        },
      ]);
      setCurrentMessage("");
      await refreshBalance();
    } catch (error: any) {
      toast.error(error.message);
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
            <h1 className="text-xl font-bold">Welcome to Best Friend AI</h1>
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
                  {msg.role === "assistant" && msg.liabilityTokenHash && (
                    <div className="flex items-center gap-2 flex-wrap mt-2 animate-in fade-in slide-in-from-top-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] gap-1.5 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-mono border border-purple-100 bg-purple-50/30 rounded-full"
                        onClick={() => navigate(`/egress-logs?search=${msg.liabilityTokenHash}`)}
                      >
                        <FileKey size={12} className="text-purple-500" />
                        {truncateHash(msg.liabilityTokenHash)}
                      </Button>
                      <Badge
                        variant="outline"
                        className="h-5 text-[9px] border-emerald-200 text-emerald-700 bg-emerald-50 font-black tracking-tighter"
                      >
                        <Shield size={10} className="mr-1" /> SHIELD_VERIFIED
                      </Badge>
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
                  Best Friend AI is auditing the pipeline...
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
