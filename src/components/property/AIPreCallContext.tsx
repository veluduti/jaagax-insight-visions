import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Send, Loader2, User, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface AIPreCallContextProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  onContextSaved?: (contextId: string) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const AIPreCallContext = ({ open, onClose, propertyId, propertyTitle }: AIPreCallContextProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [propertyData, setPropertyData] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load property data when opened
  useEffect(() => {
    if (open && propertyId) {
      loadPropertyData();
    }
    if (open && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Hi! I'm your AI property expert for **${propertyTitle}**. Ask me anything about this property — pricing, location, amenities, investment potential, neighborhood, or comparisons. I'll give you detailed insights! 🏠`
      }]);
    }
  }, [open, propertyId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadPropertyData = async () => {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();
    setPropertyData(data);
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    const newMessages: ChatMessage[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-property-expert', {
        body: {
          question: userMsg,
          propertyId,
          propertyData,
          conversationHistory: newMessages.slice(-10),
        },
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: "assistant", content: data.answer || "Sorry, I couldn't process that. Please try again." }]);
    } catch (err) {
      console.error('AI Expert error:', err);
      setMessages(prev => [...prev, { role: "assistant", content: "I'm having trouble connecting right now. Please try again in a moment." }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    "What's the price per sq.ft?",
    "Is this a good investment?",
    "Tell me about the neighborhood",
    "What amenities are nearby?",
    "Compare with similar properties",
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Property Expert
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Asking about: <span className="font-medium text-foreground">{propertyTitle}</span>
          </p>
        </DialogHeader>

        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-1 [&>ul]:mb-1 [&>ol]:mb-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>

          {/* Suggested Questions */}
          {messages.length <= 1 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((q) => (
                  <button key={q} onClick={() => { setInput(q); }}
                    className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about this property..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={loading || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIPreCallContext;
