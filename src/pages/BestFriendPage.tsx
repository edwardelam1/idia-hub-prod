import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Bot, User, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { useLocation } from 'react-router-dom';

const BestFriendPage = () => {
  const [conversation, setConversation] = useState<Array<{ role: string; content: string }>>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    setIsLoading(true);
    const userMessage = currentMessage;
    setCurrentMessage('');
    setConversation(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const data = await fetchApi('/api/v1/best-friend/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: userMessage,
          context: { currentPage: location.pathname, timestamp: new Date().toISOString() },
        }),
      });
      setConversation(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Best Friend AI Error:', error);
      toast.error('Failed to connect to Best Friend AI');
      setConversation(prev => [...prev, { role: 'error', content: 'Sorry, I encountered an issue. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
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
          <p className="text-xs text-muted-foreground">Your AI-powered assistant for data discovery and platform navigation</p>
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
              I can help you navigate the platform, discover data bundles, analyze trends, and manage your workspace. Just ask!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 max-w-lg">
              {[
                'Show me the latest marketplace bundles',
                'What is my current credit balance?',
                'Help me understand my pipeline status',
                'What security events happened today?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setCurrentMessage(suggestion); }}
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
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex items-start gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-primary/10 text-primary'
                      : message.role === 'error'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary/10 text-primary'
                  }`}>
                    {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.role === 'error'
                        ? 'bg-destructive/10 text-destructive border border-destructive/20'
                        : 'bg-muted text-foreground'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="flex gap-2 pt-4 border-t border-border flex-shrink-0 max-w-3xl mx-auto w-full">
        <Input
          placeholder="Ask Best Friend AI anything..."
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          onClick={handleSendMessage}
          disabled={isLoading || !currentMessage.trim()}
          className="px-4"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default BestFriendPage;
