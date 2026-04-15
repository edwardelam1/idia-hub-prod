import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Bot, Brain, Coins, ShieldCheck, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";
import BestFriendAvatar from "./BestFriendAvatar";

interface BestFriendChatProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface ChatMessage {
  role: string;
  content: string;
  tokenSpend?: number;
  tokenHash?: string;
}

const BestFriendChat = ({ isOpen: externalOpen, onClose }: BestFriendChatProps = {}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onClose
    ? (value: boolean) => {
        if (!value) onClose();
      }
    : setInternalOpen;
  const [conversation, setConversation] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emotion, setEmotion] = useState<"excited" | "calm" | "sad" | "neutral">("neutral");

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    setIsLoading(true);
    setEmotion("excited");
    const userMessage = currentMessage;
    setCurrentMessage("");
    setConversation((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      const data = await fetchApi("/api/v1/best-friend/chat", {
        method: "POST",
        body: JSON.stringify({
          message: userMessage,
          context: { currentPage: "super-admin-dashboard", timestamp: new Date().toISOString() },
        }),
      });

      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.response,
          tokenSpend: data.tokenSpend,
          tokenHash: data.tokenHash,
        },
      ]);
      setEmotion("calm");
    } catch (error) {
      console.error("Best Friend AI Error:", error);
      toast.error("Failed to connect to Best Friend AI");
      setEmotion("sad");
      setConversation((prev) => [
        ...prev,
        { role: "error", content: "Sorry, I encountered an issue. Please try again." },
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Brain className="h-6 w-6 text-purple-600" />
            <span>Best Friend AI - Super Admin Assistant</span>
          </DialogTitle>
          <DialogDescription>
            Your trusted AI colleague orchestrating the agent army for seamless operations
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4">
          <ScrollArea className="flex-1 h-96 border rounded-lg p-4">
            {conversation.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                <p className="font-medium">Hey there! I'm Best Friend, your AI assistant.</p>
                <p className="text-sm mt-2">I'm here to help you manage the platform. Just tell me what you need!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {conversation.map((message, index) => (
                  <div key={index} className="flex flex-col">
                    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`flex items-start space-x-2 max-w-[80%] ${message.role === "user" ? "flex-row-reverse space-x-reverse" : ""}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${message.role === "user" ? "bg-blue-100 text-blue-600" : message.role === "error" ? "bg-red-100 text-red-600" : "bg-purple-100 text-purple-600"}`}
                        >
                          {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                        </div>
                        <div
                          className={`rounded-lg px-4 py-2 ${message.role === "user" ? "bg-blue-600 text-white" : message.role === "error" ? "bg-red-50 text-red-900 border border-red-200" : "bg-muted text-foreground"}`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        </div>
                      </div>
                    </div>

                    {/* Token Spend & Egress Hash Indicator */}
                    {message.role === "assistant" && message.tokenHash && (
                      <div className="flex items-center space-x-3 mt-1 ml-11 text-[11px] text-muted-foreground bg-gray-50/50 w-max px-2 py-1 rounded-md border border-gray-100">
                        <div className="flex items-center text-emerald-600 font-medium" title="Tokens Spent">
                          <Coins className="w-3 h-3 mr-1" />
                          <span>{message.tokenSpend} Tokens</span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <a
                          href={`/audit?search=${message.tokenHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center hover:text-purple-600 transition-colors"
                          title="View in Egress Logs"
                        >
                          <ShieldCheck className="w-3 h-3 mr-1 text-purple-500" />
                          <span className="font-mono">{message.tokenHash.substring(0, 12)}...</span>
                          <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-purple-100 text-purple-600">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
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

          <div className="flex space-x-2">
            <Input
              placeholder="Ask Best Friend to help with platform management..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !currentMessage.trim()}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-md disabled:opacity-50 transition-all duration-200"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BestFriendChat;
