import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Sparkles, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const AIInsightsChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI market analyst. Ask me about property trends, investment opportunities, or compare different localities.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      // Fetch relevant data based on question
      const { data: properties, error } = await supabase
        .from("properties")
        .select("*")
        .eq("verified", true)
        .limit(100);

      if (error) throw error;

      // Calculate basic stats for context
      const cityStats = properties?.reduce((acc: any, p: any) => {
        if (!acc[p.city]) {
          acc[p.city] = { total: 0, sum: 0, localities: new Set() };
        }
        acc[p.city].total++;
        acc[p.city].sum += p.price;
        acc[p.city].localities.add(p.locality);
        return acc;
      }, {});

      const context = Object.entries(cityStats || {})
        .map(([city, stats]: [string, any]) => 
          `${city}: ${stats.total} properties, avg ₹${(stats.sum / stats.total / 10000000).toFixed(2)}Cr, ${stats.localities.size} localities`
        )
        .join("; ");

      // Generate AI response
      const { data: aiData, error: aiError } = await supabase.functions.invoke("market-trends-ai", {
        body: {
          data: {
            city: "Multiple Cities",
            avgPrice: properties?.[0]?.price || 0,
            transactions: properties?.length || 0,
            topLocality: "Various",
            priceChangeQoQ: "5.2",
            rentYield: "3.8",
            userQuestion: userMessage,
            marketContext: context,
          },
        },
      });

      if (aiError) throw aiError;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiData?.commentary || "I'm having trouble analyzing that right now. Please try again." },
      ]);
    } catch (error: any) {
      console.error("Chat error:", error);
      if (error.message?.includes("429")) {
        toast.error("Rate limit exceeded. Please wait a moment.");
      } else if (error.message?.includes("402")) {
        toast.error("Please add credits to continue using AI features.");
      } else {
        toast.error("Failed to get AI response");
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1 }}
      >
        {!isOpen && (
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="rounded-full h-16 w-16 shadow-2xl glow-effect"
          >
            <MessageSquare className="h-6 w-6" />
          </Button>
        )}
      </motion.div>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-50 w-96 h-[600px]"
          >
            <Card className="glass-panel flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">AI Market Analyst</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask about market trends..."
                    disabled={loading}
                    className="flex-1"
                  />
                  <Button onClick={handleSend} disabled={loading || !input.trim()} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
