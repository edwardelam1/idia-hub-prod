import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Brain, Search, Activity, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

const BestFriendPage = () => {
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [marketplaceMode, setMarketplaceMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { refreshBalance } = useSynapseCredits();

  const isProcessing = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation, isLoading]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading || isProcessing.current) return;

    console.info("[BEGIN: handleSendMessage] Initiating AI interaction cycle.");
    isProcessing.current = true;
    setIsLoading(true);

    // Optimistically push the user's message
    setConversation((prev) => [...prev, { role: "user", content: currentMessage }]);

    try {
      // 1. IDENTITY RESOLUTION
      console.info("[EXEC: Identity Resolution] Authenticating current user session.");
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user?.id) throw new Error("Identity resolution failure: Not authenticated.");
      console.info(`[SUCCESS: Identity Resolution] User verified: ${user.id}`);

      console.info("[EXEC: Profile Resolution] Fetching platform_guid from profiles.");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("platform_guid")
        .eq("user_id", user.id)
        .single();

      if (profileError) throw profileError;
      const activeGuid = profile?.platform_guid;
      if (!activeGuid) throw new Error("Profile resolution failure: No platform_guid found.");
      console.info(`[SUCCESS: Profile Resolution] Platform GUID resolved: ${activeGuid}`);

      // 2. WAREHOUSE FETCH
      let realPipelineData: any[] = [];
      if (marketplaceMode) {
        console.info("[EXEC: Warehouse Fetch] Marketplace mode active. Retrieving staged health data.");
        const { data: healthData, error: healthError } = await supabase
          .from("staged_health_data")
          .select("*")
          .eq("user_id", user.id)
          .limit(1000000000);

        if (healthError) throw healthError;
        realPipelineData = healthData || [];
        console.info(`[SUCCESS: Warehouse Fetch] Retrieved ${realPipelineData.length} records.`);
      }

      // 3. ORCHESTRATION INVOCATION
      console.info("[EXEC: AI Orchestration] Invoking best-friend-ai edge function.");
      const { data: chatResponse, error: aiError } = await supabase.functions.invoke("best-friend-ai", {
        body: {
          message: currentMessage,
          context: {
            isMarketplaceMode: marketplaceMode,
            platformGuid: activeGuid,
            userId: user.id,
            marketplace: marketplaceMode ? { healthRecords: realPipelineData, lifestyleRecords: [] } : null,
          },
          history: conversation.slice(-5).map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (aiError) throw aiError;
      console.info("[SUCCESS: AI Orchestration] Edge function returned valid payload.");

      // 4. UPDATE CONVERSATION
      console.info("[EXEC: UI Update] Appending assistant response to conversation state.");
      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: chatResponse?.response || "Analysis complete.",
        },
      ]);

      // Refresh the "Synapse Gas" gauge if a credit was burned
      if (marketplaceMode) {
        console.info("[EXEC: Credit Settlement] Refreshing Synapse balance after Marketplace use.");
        await refreshBalance();
        console.info("[SUCCESS: Credit Settlement] Balance sync complete.");
      }

      setCurrentMessage("");
      console.info("[END: handleSendMessage] Cycle fully complete and successful.");
    } catch (error: any) {
      console.error(`🚨 [FATAL STALL: handleSendMessage]: Critical failure during execution. Reason: ${error.message}`, error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
      isProcessing.current = false;
      console.info("[CLEANUP: handleSendMessage] Processing flags reset.");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 bg-slate-50/30 font-sans">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Best Friend AI</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold font-mono">
              Agentic Orchestration Layer
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="h-6 text-[10px] gap-1 px-2 border-emerald-200 text-emerald-700 bg-emerald-50"
        >
          <Activity className="h-3 w-3" /> PIPELINE LIVE
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
                  Best Friend AI is querying the data pipeline...
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
            placeholder={marketplaceMode ? "Querying Pipeline via Person Anchor..." : "Message Best Friend..."}
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
            disabled={isLoading}
            className="h-14 rounded-2xl pr-14 bg-card shadow-sm border-border"
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !currentMessage.trim()}
            className="absolute right-2 top-2 h-10 w-10 rounded-xl p-0"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </Button>
        </div>
        <div className="flex items-center justify-between px-1 gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMarketplaceMode(!marketplaceMode)}
              className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full border transition-all ${marketplaceMode ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}
            >
              <Search size={14} /> Marketplace Mode (1 CR)
            </button>
          </div>
          <div className="text-[9px] text-muted-foreground font-mono font-bold uppercase opacity-50">
            Tell Your Best Friend Everything...
          </div>
        </div>
      </div>
    </div>
  );
};

export default BestFriendPage;