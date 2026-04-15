import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Brain, Search, Shield, Loader2, FileKey, Activity } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";

const BestFriendPage = () => {
  const [conversation, setConversation] = useState<any[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [marketplaceMode, setMarketplaceMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { balanceData, refreshBalance } = useSynapseCredits();

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

    setCurrentMessage("");
    setConversation((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      // 1. Resolve Master Platform GUID (The local Person Anchor)
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

      let realPipelineData = [];
      let realLifestyleData = [];
      let queryEgressToken = null;

      if (doMarketplace) {
        // 2. Hybrid Query: Map platform_guid to pseudo_user_id
        const [health, lifestyle, aca] = await Promise.all([
          supabase
            .from("staged_health_data")
            .select("*")
            .eq("pseudo_user_id", platformGuid)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("staged_lifestyle_data")
            .select("*")
            .eq("pseudo_user_id", platformGuid)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("user_aca_records")
            .select("aca_hash_key")
            .eq("platform_guid", platformGuid)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        realPipelineData = health.data || [];
        realLifestyleData = lifestyle.data || [];

        await supabase.functions.invoke("deduct-synapse-credit", { body: { amount: 1 } });
        await refreshBalance();

        if (aca?.data?.aca_hash_key) {
          const { data: egress } = await supabase.functions.invoke("process-delt-transfer", {
            body: { aca_hash: aca.data.aca_hash_key, egress_type: "ai_query_context", client_id: "BEST_FRIEND_UI" },
          });
          queryEgressToken = egress;
        }
      }

      const chatResponse = await fetchApi("/api/v1/best-friend/chat", {
        method: "POST",
        body: JSON.stringify({
          message: userMessage.replace(/@search\s+marketplace/i, "").trim(),
          context: { realPipelineData, realLifestyleData, isMarketplaceMode: doMarketplace },
        }),
      });

      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: chatResponse.response,
          queryEgressToken,
          creditDeducted: doMarketplace,
        },
      ]);
    } catch (error: any) {
      toast.error(error.message);
      setConversation((prev) => [...prev, { role: "assistant", content: `⚠️ System Alert: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 bg-slate-50/30">
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

      <ScrollArea className="flex-1 py-4 pr-4">
        <div className="space-y-6 max-w-3xl mx-auto">
          {conversation.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary text-white" : "bg-white border shadow-sm text-primary"}`}
                >
                  {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className="space-y-2">
                  <div
                    className={`rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${msg.role === "user" ? "bg-primary text-white" : "bg-white border text-slate-800"}`}
                  >
                    {msg.content}
                  </div>
                  {msg.queryEgressToken && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-7 text-[10px] gap-2 px-3 bg-slate-100 text-slate-700 hover:bg-slate-200 border-none font-mono"
                    >
                      <FileKey size={12} className="text-emerald-600" />
                      RECEIPT: {msg.queryEgressToken.liability_token_hash.substring(0, 12).toUpperCase()}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} className="h-2" />
        </div>
      </ScrollArea>

      <div className="pt-4 border-t border-slate-200 max-w-3xl mx-auto w-full space-y-4">
        <div className="flex gap-2 relative">
          <Input
            placeholder={marketplaceMode ? "Querying Pipeline via Person Anchor..." : "Message Synapse..."}
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
            className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full border transition-all ${marketplaceMode ? "bg-primary text-white border-primary" : "bg-white text-slate-500 border-slate-200 hover:border-primary/40"}`}
          >
            <Search size={14} /> Marketplace Mode (1 CR)
          </button>
        </div>
      </div>
    </div>
  );
};

export default BestFriendPage;
