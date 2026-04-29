import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Brain, Search, Shield, Loader2, FileKey, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  liabilityTokenHash?: string | null;
  creditDeducted?: boolean;
}

type ComplianceRail = "fiat" | "on-chain";

// NATIVE CRYPTO GENERATOR FOR THE DIGIRAMP ANCHOR
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
  const [complianceRail, setComplianceRail] = useState<ComplianceRail | null>(null);
  const [railPickerOpen, setRailPickerOpen] = useState(false);
  const [pendingSendAfterRail, setPendingSendAfterRail] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { refreshBalance } = useSynapseCredits();
  const navigate = useNavigate();

  const isProcessing = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation, isLoading]);

  // Hydrate compliance_rail from profiles on mount
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;
      const { data } = await supabase.from("profiles").select("compliance_rail").eq("user_id", user.id).maybeSingle();
      const rail = (data as any)?.compliance_rail;
      if (rail === "fiat" || rail === "on-chain") setComplianceRail(rail);
    })();
  }, []);

  const persistRail = async (rail: ComplianceRail) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) throw new Error("Not authenticated");
    const { error } = await supabase
      .from("profiles")
      .update({ compliance_rail: rail } as any)
      .eq("user_id", user.id);
    if (error) throw error;
    setComplianceRail(rail);
  };

  const handleRailChoice = async (rail: ComplianceRail) => {
    try {
      await persistRail(rail);
      toast.success(`Settlement rail locked: ${rail.toUpperCase()}`);
      setRailPickerOpen(false);
      if (pendingSendAfterRail) {
        setPendingSendAfterRail(false);
        // Re-trigger send now that rail exists
        setTimeout(() => handleSendMessage(rail), 0);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSendMessage = async (overrideRail?: ComplianceRail) => {
    if (!currentMessage.trim() || isLoading || isProcessing.current) return;

    const activeRail = overrideRail ?? complianceRail;

    // Marketplace Mode requires a locked compliance rail (Like-for-Like / MTL).
    if (marketplaceMode && activeRail !== "fiat" && activeRail !== "on-chain") {
      setPendingSendAfterRail(true);
      setRailPickerOpen(true);
      return;
    }

    isProcessing.current = true;
    setIsLoading(true);

    // Optimistically push the user's message
    setConversation((prev) => [...prev, { role: "user", content: currentMessage }]);

    try {
      // 1. IDENTITY RESOLUTION
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated.");

      const { data: profile } = await supabase.from("profiles").select("platform_guid").eq("user_id", user.id).single();
      const activeGuid = profile?.platform_guid;
      if (!activeGuid) throw new Error("Identity resolution failure: No platform_guid.");

      // 2. WAREHOUSE FETCH (The Truth from DB)
      let realPipelineData: any[] = [];
      if (marketplaceMode) {
        // Fetch fresh staged data to ensure the AI has the actual pipeline state
        const { data: healthData } = await supabase
          .from("staged_health_data")
          .select("*")
          .eq("user_id", user.id)
          .limit(100);
        realPipelineData = healthData || [];
      }

      // 3. ORCHESTRATION INVOCATION
      const { data: chatResponse, error: aiError } = await supabase.functions.invoke("best-friend-ai", {
        body: {
          message: currentMessage,
          // Top-level: best-friend-ai forwards this to synapse-controller → cashier
          routing: activeRail,
          context: {
            isMarketplaceMode: marketplaceMode,
            platformGuid: activeGuid,
            userId: user.id,
            routing: activeRail,
            marketplace: marketplaceMode ? { healthRecords: realPipelineData, lifestyleRecords: [] } : null,
          },
          history: conversation.slice(-5).map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (aiError) throw aiError;

      // 4. DIGIRAMP ANCHOR GENERATION
      const rawTokenHash = chatResponse?.liability_token || null;
      let digiRampAnchorId = null;

      if (rawTokenHash) {
        digiRampAnchorId = await generateDigiRampAnchor(rawTokenHash);
      }

      // 5. UPDATE CONVERSATION WITH THE AI RESPONSE AND ANCHOR
      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: chatResponse?.response || "Analysis complete.",
          liabilityTokenHash: digiRampAnchorId, // The 0x Address
          creditDeducted: !!digiRampAnchorId,
        },
      ]);

      // Refresh the "Synapse Gas" gauge if a credit was burned
      if (digiRampAnchorId) {
        await refreshBalance();
      }

      setCurrentMessage("");
    } catch (error: any) {
      console.error("[BEST_FRIEND_UI_ERROR]:", error.message);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
      isProcessing.current = false;
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
            <button
              onClick={() => setRailPickerOpen(true)}
              title="Compliance settlement rail (Like-for-Like / MTL)"
              className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2.5 rounded-full border transition-all ${
                complianceRail === "on-chain"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : complianceRail === "fiat"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <Shield size={12} />
              {complianceRail ? `RAIL: ${complianceRail.toUpperCase()}` : "RAIL: NOT SET"}
            </button>
          </div>
          <div className="text-[9px] text-muted-foreground font-mono font-bold uppercase opacity-50">
            Tell Your Best Friend Everything...
          </div>
        </div>
      </div>

      <Dialog
        open={railPickerOpen}
        onOpenChange={(open) => {
          setRailPickerOpen(open);
          if (!open) setPendingSendAfterRail(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Your Settlement Rail</DialogTitle>
            <DialogDescription>
              Federal Like-for-Like compliance: the rail you fund credits with is the rail used to settle earnings. This
              cannot convert between fiat and crypto. Pick the rail that matches how you topped up.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <button
              onClick={() => handleRailChoice("fiat")}
              className="flex flex-col items-start gap-1 p-4 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-all text-left"
            >
              <span className="text-xs font-black uppercase tracking-widest text-blue-700">Fiat (Worldpay)</span>
              <span className="text-[10px] text-blue-700/80">USD ledger only. No blockchain.</span>
            </button>
            <button
              onClick={() => handleRailChoice("on-chain")}
              className="flex flex-col items-start gap-1 p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-all text-left"
            >
              <span className="text-xs font-black uppercase tracking-widest text-emerald-700">USDC (On-Chain)</span>
              <span className="text-[10px] text-emerald-700/80">Base network. Settles via smart contract.</span>
            </button>
          </div>
          <DialogFooter>
            <p className="text-[10px] text-muted-foreground">You can change this later from this same pill.</p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BestFriendPage;
