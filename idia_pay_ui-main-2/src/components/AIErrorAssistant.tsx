import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { subscribeAIError } from "@/lib/ai-error-bus";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-error-assistant`;

async function streamChat({
  messages,
  errorContext,
  onDelta,
  onDone,
  signal,
}: {
  messages: Msg[];
  errorContext?: string;
  onDelta: (t: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, errorContext }),
    signal,
  });
  if (!resp.ok || !resp.body) throw new Error("Stream failed");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: rd, value } = await reader.read();
    if (rd) break;
    buf += decoder.decode(value, { stream: true });
    let ni: number;
    while ((ni = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, ni);
      buf = buf.slice(ni + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const p = JSON.parse(json);
        const c = p.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch { buf = line + "\n" + buf; break; }
    }
  }
  onDone();
}

export const AIErrorAssistant = () => {
  const [visible, setVisible] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorCtx, setErrorCtx] = useState("");
  const [pulse, setPulse] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen for errors
  useEffect(() => {
    const unsubscribe = subscribeAIError((err) => {
      setErrorCtx(err);
      setVisible(true);
      setPulse(true);
      const userMsg: Msg = { role: "user", content: `I got this error: ${err}` };
      setMessages([userMsg]);
      setChatOpen(true);
      streamResponse([userMsg], err);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (pulse) {
      const t = setTimeout(() => setPulse(false), 3000);
      return () => clearTimeout(t);
    }
  }, [pulse]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamResponse = useCallback(async (msgs: Msg[], ctx?: string) => {
    setLoading(true);
    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };
    try {
      await streamChat({
        messages: msgs,
        errorContext: ctx || errorCtx,
        onDelta: upsert,
        onDone: () => setLoading(false),
      });
    } catch {
      setLoading(false);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't connect. Please try again." }]);
    }
  }, [errorCtx]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    await streamResponse(updated);
  };

  if (!visible) return null;

  return (
    <>
      {/* Floating Coin Button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full",
            "bg-gradient-to-br from-warning via-warning to-warning/80",
            "shadow-glow hover:shadow-[0_0_30px_hsl(var(--warning)/0.7)]",
            "flex items-center justify-center transition-all duration-300",
            "hover:scale-110 active:scale-95",
            "border-2 border-warning/50",
            pulse && "animate-bounce"
          )}
          title="AI Assistant"
        >
          <Sparkles className="w-6 h-6 text-warning-foreground" />
          <div className="absolute inset-0 rounded-full border-2 border-warning/30 animate-ping pointer-events-none" />
        </button>
      )}

      {/* Chat Panel */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 z-[100] w-96 h-[28rem] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-warning to-warning/80 text-warning-foreground">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-warning-foreground/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-sm">IDIA AI Assistant</div>
                <div className="text-xs opacity-80">Here to help</div>
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-warning-foreground hover:bg-warning-foreground/10" onClick={() => setChatOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-4 py-3">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  )}>
                    {m.content}
                    
                    {loading && i === messages.length - 1 && m.role === "assistant" && (
                      <span className="inline-block w-1.5 h-4 bg-foreground/60 animate-pulse ml-0.5 align-middle" />
                    )}
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="px-3 py-2 border-t flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask me anything..."
              className="text-sm h-9"
              disabled={loading}
            />
            <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
