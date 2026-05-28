import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Brain, Search, Shield, Loader2, FileKey, Activity, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";

// ERROR BOUNDARY WRAPPER
const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError)
    return (
      <div className="flex h-screen items-center justify-center p-4 text-destructive">
        <AlertCircle className="mr-2" /> Error in rendering components. Check console.
      </div>
    );
  try {
    return <>{children}</>;
  } catch (e) {
    setHasError(true);
    return null;
  }
};

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  liabilityTokenHash?: string | null;
  creditDeducted?: boolean;
}

async function generateDigiRampAnchor(liabilityTokenHash: string) {
  if (!liabilityTokenHash) return null;
  const timestamp = new Date().toISOString();
  const payload = new TextEncoder().encode(`${liabilityTokenHash}|${timestamp}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", payload);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return "0x" + hashHex;
}

const BestFriendPage = () => {
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [marketplaceMode, setMarketplaceMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { refreshBalance } = useSynapseCredits();
  const navigate = useNavigate();
  const isProcessing = useRef(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [conversation, isLoading]);

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading || isProcessing.current) return;

    isProcessing.current = true;
    setIsLoading(true);

    setConversation((prev) => [...prev, { role: "user", content: currentMessage }]);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Authentication failure.");

      console.info(`[BEGIN: UI.BestFriend.ProfileFetch] Fetching profile context for user ${user.id}`);
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("platform_guid, location")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profile?.platform_guid) {
        console.info(`[BEGIN: UI.BestFriend.ProfileFetch.Stall] Failed to resolve identity.`);
        throw new Error("Identity resolution failure.");
      }
      console.info(
        `[END: UI.BestFriend.ProfileFetch] Resolved platform_guid: ${profile.platform_guid}, location: ${profile.location}`,
      );

      let realPipelineData: any[] = [];
      if (marketplaceMode) {
        const { data: healthData, error: healthError } = await supabase
          .from("staged_health_data")
          .select("*")
          .eq("user_id", user.id)
          .limit(1000); // Truncated for safety
        if (healthError) throw healthError;
        realPipelineData = healthData || [];
      }

      const { data: chatResponse, error: aiError } = await supabase.functions.invoke("best-friend-ai", {
        body: {
          message: currentMessage,
          context: {
            isMarketplaceMode: marketplaceMode,
            platformGuid: profile.platform_guid,
            userId: user.id,
            location_string: profile.location,
            marketplace: marketplaceMode ? { healthRecords: realPipelineData, lifestyleRecords: [] } : null,
          },
          history: conversation.slice(-5).map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (aiError) throw aiError;

      const rawTokenHash = chatResponse?.liability_token || null;
      let digiRampAnchorId = null;
      if (rawTokenHash) digiRampAnchorId = await generateDigiRampAnchor(rawTokenHash);

      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: chatResponse?.response || "Analysis complete.",
          liabilityTokenHash: digiRampAnchorId,
          creditDeducted: marketplaceMode,
        },
      ]);

      if (marketplaceMode) await refreshBalance();
      setCurrentMessage("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
      isProcessing.current = false;
    }
  };

  const truncateHash = (hash: string) => (hash ? `${hash.substring(0, 8)}...` : "—");

  return (
    <ErrorBoundary>
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
                    {msg.role === "assistant" && msg.liabilityTokenHash && (
                      <div className="flex items-center gap-2 flex-wrap mt-2 animate-in fade-in slide-in-from-top-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] gap-1.5 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-mono border border-amber-200 bg-amber-50/50 rounded-full"
                          onClick={() => navigate(`/egress-logs?search=${msg.liabilityTokenHash}`)}
                        >
                          <FileKey size={12} className="text-amber-500" />
                          {truncateHash(msg.liabilityTokenHash)}
                        </Button>
                        <Badge
                          variant="outline"
                          className="h-5 text-[9px] border-emerald-200 text-emerald-700 bg-emerald-50 font-black tracking-tighter"
                        >
                          <Shield size={10} className="mr-1" /> SHIELD VERIFIED
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
              placeholder={marketplaceMode ? "Marketplace Active: Exposing Data Pipeline..." : "Message Best Friend..."}
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
            <button
              onClick={() => setMarketplaceMode(!marketplaceMode)}
              className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-full border transition-all ${marketplaceMode ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}
            >
              <Search size={14} /> Marketplace Mode {marketplaceMode ? "(ENABLED)" : "(DISABLED)"}
            </button>
            <div className="text-[9px] text-muted-foreground font-mono font-bold uppercase opacity-50">
              Tell Your Best Friend Everything...
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default BestFriendPage;
