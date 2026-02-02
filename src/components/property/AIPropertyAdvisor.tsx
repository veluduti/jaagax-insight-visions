import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, Send, Loader2, MessageCircle, 
  ChevronDown, ChevronUp, Bot, User
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: ActionButton[];
}

interface ActionButton {
  label: string;
  action: string;
  data?: any;
}

interface AIPropertyAdvisorProps {
  property: any;
  propertyId: string;
}

export default function AIPropertyAdvisor({ property, propertyId }: AIPropertyAdvisorProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFullChat, setShowFullChat] = useState(false);
  const [initialSummary, setInitialSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialSummary();
  }, [propertyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadInitialSummary = async () => {
    try {
      setLoadingSummary(true);
      const { data, error } = await supabase.functions.invoke("ai-property-advisor", {
        body: {
          propertyContext: {
            title: property?.title,
            price: property?.price,
            area: property?.area_sqft,
            location: `${property?.locality || ''}, ${property?.city || ''}`,
            bhk: property?.bhk,
            trustScore: property?.trust_score,
            verified: property?.verified,
            type: property?.property_type,
          },
          query: "Provide a brief 2-3 sentence summary of why this property is a good investment.",
          propertyId
        }
      });

      if (error) throw error;

      if (data?.answer) {
        setInitialSummary(data.answer);
      } else {
        setInitialSummary(
          `This ${property?.bhk || ''}BHK property in ${property?.locality || 'this area'} offers excellent value. ` +
          `With a trust score of ${property?.trust_score || 'N/A'}/100, ` +
          `it's a great option in a prime location.`
        );
      }
    } catch (error) {
      console.error("Error loading summary:", error);
      setInitialSummary("Ask me anything about this property to get AI-powered insights.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase.functions.invoke("ai-property-advisor", {
        body: {
          propertyContext: {
            title: property?.title,
            price: property?.price,
            area: property?.area_sqft,
            location: `${property?.locality || ''}, ${property?.city || ''}`,
            bhk: property?.bhk,
            trustScore: property?.trust_score,
            verified: property?.verified,
            type: property?.property_type,
            description: property?.description
          },
          query: userMessage.content,
          propertyId,
          userId: user?.id
        }
      });

      if (error) throw error;

      const actionButtons: ActionButton[] = [];
      
      if (data?.answer?.toLowerCase().includes("visit")) {
        actionButtons.push({ label: "Schedule Visit", action: "schedule", data: { propertyId } });
      }
      if (data?.answer?.toLowerCase().includes("similar")) {
        actionButtons.push({ label: "Show Similar Properties", action: "similar", data: { city: property?.city, bhk: property?.bhk } });
      }
      actionButtons.push({ label: "Add to Watchlist", action: "watchlist", data: { propertyId } });

      const assistantMessage: Message = {
        role: "assistant",
        content: data?.answer || "I'm unable to provide an answer at this time. Please try again.",
        timestamp: new Date(),
        actions: actionButtons
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to get AI response. Please try again.");

      const errorMessage: Message = {
        role: "assistant",
        content: "I'm experiencing technical difficulties. Please try asking your question again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: string, data?: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    switch (action) {
      case "schedule":
        if (!user) {
          toast.error("Please login to schedule a visit");
          return;
        }
        navigate(`/visit/schedule/${propertyId}`);
        break;
      case "similar":
        navigate(`/map?city=${data?.city}&bhk=${data?.bhk}`);
        break;
      case "watchlist":
        if (!user) {
          toast.error("Please login to add to watchlist");
          return;
        }
        try {
          await supabase.from("favorites").insert({
            user_id: user.id,
            property_id: propertyId
          });
          toast.success("Added to watchlist!");
        } catch (error) {
          toast.error("Failed to add to watchlist");
        }
        break;
    }
  };

  const suggestedQuestions = [
    "Is this property a good investment?",
    "What's the rental yield potential?",
    "How's the connectivity and infrastructure?",
    "What are the property tax estimates?"
  ];

  return (
    <Card className="glass-panel sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Property Advisor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Initial Summary */}
        <div className="glass-panel rounded-lg p-4 border border-primary/20">
          {loadingSummary ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analyzing property...</span>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">{initialSummary}</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                onClick={() => setShowFullChat(!showFullChat)}
              >
                {showFullChat ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Hide Chat
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Ask Questions
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        {/* Expandable Chat Interface */}
        <AnimatePresence>
          {showFullChat && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-4"
            >
              <Separator />

              {/* Messages */}
              <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                {messages.length === 0 && (
                  <div className="text-center py-6">
                    <Bot className="h-12 w-12 mx-auto mb-3 text-primary/50" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Ask me anything about this property!
                    </p>
                    <div className="space-y-2">
                      {suggestedQuestions.map((question, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="w-full text-left justify-start text-xs"
                          onClick={() => {
                            setInputValue(question);
                            setTimeout(() => handleSendMessage(), 100);
                          }}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "glass-panel"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      {message.actions && message.actions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {message.actions.map((action, actionIdx) => (
                            <Button
                              key={actionIdx}
                              variant="outline"
                              size="sm"
                              onClick={() => handleAction(action.action, action.data)}
                              className="text-xs"
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs opacity-60 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {message.role === "user" && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="glass-panel rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask about this property..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputValue.trim()}
                  size="icon"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Powered by AI • Responses may vary
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}