import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Brain, Search, Coins } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSynapseCredits } from "@/contexts/SynapseCreditsContext";

interface ChatMessage {
  role: string;
  content: string;
  creditDeducted?: boolean;
}

const MARKETPLACE_TRIGGER = /@search\s+marketplace/i;

const BestFriendPage = () => {
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [marketplaceMode, setMarketplaceMode] = useState(false);
  const location = useLocation();
  const { balanceData, refreshBalance } = useSynapseCredits();

  const isMarketplaceSearch = (msg: string) => {
    return marketplaceMode || MARKETPLACE_TRIGGER.test(msg);
  };

  const deductCredit = async (searchId: string) => {
    // 1. Get the session explicitly
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("You must be logged in to search the marketplace.");
    }

    const { data, error } = await supabase.functions.invoke("deduct-synapse-credit", {
      body: {
        amount: 1,
        description: "Marketplace Search Query",
        referenceId: searchId,
      },
      // 2. Explicitly pass the token to override any client defaults
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) {
      throw new Error(`Edge Function Network Error: ${error.message || JSON.stringify(error)}`);
    }

    if (data?.error) {
      throw new Error(`Billing Logic Error: ${data.error}`);
    }

    await refreshBalance();
  };

  const queryMarketplace = async (query: string) => {
    const { data, error } = await supabase
      .from("marketplace_bundles")
      .select("title, category, description, price, tier, contacts_count, data_points, features, bundle_id")
      .eq("is_active", true)
      .limit(20);

    // Force database errors to surface
    if (error) {
      throw new Error(`Database Query Error: ${error.message}`);
    }

    return data || [];
  };

  // 1. Add this guard at the very top of handleSendMessage
const handleSendMessage = async () => {
  if (!currentMessage.trim() || isLoading) return; // Prevent double-trigger

  setIsLoading(true);
  const userMessage = currentMessage;
  const doMarketplace = isMarketplaceSearch(userMessage);
  setCurrentMessage("");
  setConversation((prev) => [...prev, { role: "user", content: userMessage }]);

  try {
    let marketplaceResults: any[] | undefined;
    let realPipelineData: any[] | undefined; // Container for REAL data

    if (doMarketplace) {
      const available = balanceData?.available_credits ?? 0;
      if (available < 1) {
        toast.error("Insufficient Synapse Credits");
        setConversation((prev) => [...prev, { role: "error", content: "Insufficient Credits." }]);
        setIsLoading(false);
        return;
      }

      const searchId = `SEARCH-${crypto.randomUUID().slice(0, 8)}`;
      
      // FETCH REAL DATA FROM THE PIPELINE
      const { data: healthData } = await supabase
        .from('staged_health_data')
        .select('steps_count, average_heartrate, blood_oxygen_saturation, activity_type')
        .limit(50);
      
      realPipelineData = healthData || [];
      marketplaceResults = await queryMarketplace(userMessage);
      await deductCredit(searchId);
    }

    const cleanedMessage = userMessage.replace(MARKETPLACE_TRIGGER, "").trim() || userMessage;

    const data = await fetchApi("/api/v1/best-friend/chat", {
      method: "POST",
      body: JSON.stringify({
        message: cleanedMessage,
        history: conversation.slice(-6).map(m => ({ role: m.role, content: m.content })),
        context: {
          currentPage: location.pathname,
          timestamp: new Date().toISOString(),
          isMarketplaceMode: doMarketplace,
          realPipelineData, // PASS REAL DATA TO THE AI
        },
        ...(marketplaceResults ? { marketplaceResults } : {}),
      }),
    });

    setConversation((prev) => [
      ...prev,
      { role: "assistant", content: data.response, creditDeducted: doMarketplace },
    ]);
  } catch (error: any) {
    console.error("AI Error:", error);
    toast.error(`Failed: ${error.message}`);
    setConversation(prev => [...prev, { role: 'error', content: `⚠️ Alert: ${error.message}` }]);
  } finally {
    setIsLoading(false);
  }
};

        const searchId = `SEARCH-${crypto.randomUUID().slice(0, 8)}`;
        marketplaceResults = await queryMarketplace(userMessage);
        await deductCredit(searchId);
      }

      const cleanedMessage = userMessage.replace(MARKETPLACE_TRIGGER, "").trim() || userMessage;

      const data = await fetchApi("/api/v1/best-friend/chat", {
        method: "POST",
        body: JSON.stringify({
          message: cleanedMessage,
          history: conversation.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          context: {
            currentPage: location.pathname,
            timestamp: new Date().toISOString(),
            isMarketplaceMode: doMarketplace,
          },
          ...(marketplaceResults ? { marketplaceResults } : {}),
        }),
      });

      // NEW: Check for internal errors returned with 200 status
      if (data?.error) {
        throw new Error(`AI System Error: ${data.error}`);
      }

      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response || "The AI returned an empty response. Please try again.",
          creditDeducted: doMarketplace,
        },
      ]);

      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          creditDeducted: doMarketplace,
        },
      ]);
    } catch (error: any) {
      console.error("Best Friend AI Execution Error:", error);

      // Safely extract the error string no matter how deeply nested it is
      const errorMessage =
        error?.message ||
        error?.error?.message ||
        error?.data?.error ||
        (typeof error === "string" ? error : "An unknown execution error occurred.");

      toast.error(`Failed: ${errorMessage}`);
      setConversation((prev) => [
        ...prev,
        {
          role: "error",
          content: `⚠️ System Alert: ${errorMessage}\n\nPlease check your console for more details.`,
        },
      ]);
    } finally {
      setIsLoading(false);
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
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-border flex-shrink-0">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Best Friend AI</h1>
          <p className="text-xs text-muted-foreground">
            Your AI-powered assistant for data discovery and platform navigation
          </p>
        </div>
      </div>

      {/* Chat Area */}
      <ScrollArea className="flex-1 py-4">
        {conversation.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <p className="font-medium text-foreground text-lg">Hey there! I'm Best Friend AI.</p>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
              I can help you navigate the platform, discover data bundles, analyze trends, and manage your workspace.
              Just ask!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-lg">
              {[
                "Show me the latest marketplace bundles",
                "What is my current credit balance?",
                "Help me understand my pipeline status",
                "@search marketplace health data",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setCurrentMessage(suggestion);
                  }}
                  className="text-left text-sm px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {conversation.map((message, index) => (
              <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`flex items-start gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === "user"
                        ? "bg-primary/10 text-primary"
                        : message.role === "error"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-primary/10 text-primary"
                    }`}
                  >
                    {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div>
                    <div
                      className={`rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : message.role === "error"
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : "bg-muted text-foreground"
                      }`}
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
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="pt-4 border-t border-border flex-shrink-0 max-w-3xl mx-auto w-full space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder={marketplaceMode ? "Search the data marketplace..." : "Ask Best Friend AI anything..."}
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
                : "bg-muted/50 text-muted-foreground border-border hover:text-foreground hover:border-muted-foreground/50"
            }`}
          >
            <Search className="h-3 w-3" />
            Marketplace Search
            {marketplaceMode && <span className="text-[10px] opacity-75">(1 CR/search)</span>}
          </button>
          {!marketplaceMode && (
            <span className="text-[10px] text-muted-foreground">
              or type <code className="bg-muted px-1 py-0.5 rounded text-[10px]">@search marketplace</code>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BestFriendPage;
