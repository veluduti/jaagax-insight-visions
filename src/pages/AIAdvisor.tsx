import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import SavedSearches, { saveSearch } from "@/components/ai/SavedSearches";
import { useVoiceSynthesis } from "@/hooks/useVoiceSynthesis";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Mic, Send, MapPin, Home, TrendingUp, 
  Shield, MessageSquare, Loader2, ArrowRight, Star, Volume2, VolumeX, Bookmark
} from "lucide-react";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
  filters?: any;
  properties?: any[];
  communityInsights?: any;
}

export default function AIAdvisor() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversationContext, setConversationContext] = useState<any>(null);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [searchName, setSearchName] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isSupported: voiceSupported, isEnabled: voiceEnabled, isSpeaking, speak, stop, toggle: toggleVoice } = useVoiceSynthesis();

  useEffect(() => {
    fetchUser();
    // Add welcome message
    setMessages([
      {
        role: "assistant",
        content: "👋 Welcome to JaagaX AI Property Advisor! I'm here to help you find your perfect home. Tell me what you're looking for, or try: \"3BHK near Gachibowli under ₹1 crore\" or \"verified villas in Bangalore with high trust score\"",
      },
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error("Voice input not supported in this browser");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Listening... Speak your requirements");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      toast.error("Voice input failed. Please try again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSubmit = async () => {
    if (!query.trim() || isLoading) return;

    const userMessage: AIMessage = { role: "user", content: query };
    setMessages(prev => [...prev, userMessage]);
    const currentQuery = query;
    setQuery("");
    setIsLoading(true);

    try {
      // Send full conversation history so AI has memory like ChatGPT
      const contextMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('ai-property-advisor', {
        body: { 
          query: currentQuery, 
          userId,
          conversationContext: contextMessages.length > 0 ? contextMessages : null,
          previousFilters: conversationContext
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Failed to process query");
      }

      // Update conversation context
      setConversationContext(data.filters);

      const assistantMessage: AIMessage = {
        role: "assistant",
        content: data.aiSummary,
        filters: data.filters,
        properties: data.properties,
        communityInsights: data.communityInsights,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Speak the response if voice is enabled
      if (voiceEnabled && data.aiSummary) {
        speak(data.aiSummary);
      }

      // If properties found, offer to view results
      if (data.properties && data.properties.length > 0) {
        setTimeout(() => {
          const followUpMsg = `Found ${data.totalResults} properties! Would you like to view them on the map?`;
          setMessages(prev => [...prev, {
            role: "assistant",
            content: followUpMsg,
          }]);
          if (voiceEnabled) {
            speak(followUpMsg);
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error("AI Advisor error:", error);
      toast.error(error.message || "Failed to get AI response");
      const errorMsg = "I'm having trouble processing that request. Could you try rephrasing it?";
      setMessages(prev => [...prev, {
        role: "assistant",
        content: errorMsg,
      }]);
      if (voiceEnabled) {
        speak(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSearch = async () => {
    if (!searchName.trim()) {
      toast.error("Please enter a name for this search");
      return;
    }

    if (!conversationContext || messages.length === 0) {
      toast.error("No search to save yet. Try asking for properties first!");
      return;
    }

    const lastUserQuery = messages.filter(m => m.role === "user").pop()?.content || "";
    
    const success = await saveSearch({
      query: lastUserQuery,
      filters: conversationContext,
      name: searchName
    });

    if (success) {
      setSearchName("");
    }
  };

  const handleSelectSavedSearch = (search: any) => {
    setQuery(search.query);
    setShowSavedSearches(false);
    toast.success(`Loaded: ${search.name}`);
  };

  const handleViewResults = (properties: any[], filters: any) => {
    navigate('/ai-advisor/results', { 
      state: { properties, filters }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
            <Sparkles className="h-4 w-4 text-primary" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            AI Property Advisor
          </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your intelligent real estate assistant powered by AI. Find your perfect home with natural conversation.
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto"
        >
          <Card className="p-4 text-center glass-panel hover:shadow-lg transition-shadow">
            <Home className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">10K+</p>
            <p className="text-sm text-muted-foreground">Properties</p>
          </Card>
          <Card className="p-4 text-center glass-panel hover:shadow-lg transition-shadow">
            <MapPin className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">50+</p>
            <p className="text-sm text-muted-foreground">Cities</p>
          </Card>
          <Card className="p-4 text-center glass-panel hover:shadow-lg transition-shadow">
            <Shield className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">95%</p>
            <p className="text-sm text-muted-foreground">Verified</p>
          </Card>
          <Card className="p-4 text-center glass-panel hover:shadow-lg transition-shadow">
            <Star className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">4.8</p>
            <p className="text-sm text-muted-foreground">AI Rating</p>
          </Card>
        </motion.div>

        {/* Chat Interface */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <Card className="glass-panel p-6 min-h-[500px] flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 max-h-[400px]">
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-xs font-semibold text-primary">AI Advisor</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      
                      {message.properties && message.properties.length > 0 && (
                        <div className="mt-4">
                          <Button
                            onClick={() => handleViewResults(message.properties!, message.filters)}
                            size="sm"
                            className="w-full"
                          >
                            <MapPin className="h-4 w-4 mr-2" />
                            View {message.properties.length} Properties on Map
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      )}

                      {message.communityInsights && (
                        <div className="mt-3 p-3 bg-background/50 rounded-lg text-sm">
                          <p className="font-semibold mb-1 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            Community Insights
                          </p>
                          <div className="space-y-1 text-muted-foreground">
                            <p>AI Rating: {message.communityInsights.ai_rating}/10</p>
                            <p>Appreciation: {message.communityInsights.appreciation_rate}% YoY</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-muted p-4 rounded-2xl flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t pt-4 space-y-3">
              {/* Save Search Section */}
              {conversationContext && (
                <div className="flex gap-2">
                  <Input
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Save this search..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSaveSearch}
                    variant="outline"
                    size="icon"
                    title="Save search"
                  >
                    <Bookmark className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                  placeholder={conversationContext 
                    ? "Ask a follow-up... (e.g., 'show me cheaper options' or 'what about 4BHK?')"
                    : "Type your requirements... (e.g., '3BHK near Gachibowli under ₹1 crore')"
                  }
                  className="flex-1 min-h-[60px] resize-none"
                  disabled={isLoading}
                />
                <div className="flex flex-col gap-2">
                  {voiceSupported && (
                    <Button
                      onClick={toggleVoice}
                      variant={voiceEnabled ? "default" : "outline"}
                      size="icon"
                      title={voiceEnabled ? "Voice responses enabled" : "Voice responses disabled"}
                      className={isSpeaking ? 'animate-pulse' : ''}
                    >
                      {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button
                    onClick={handleVoiceInput}
                    variant="outline"
                    size="icon"
                    className={`${isListening ? 'animate-pulse bg-primary text-primary-foreground' : ''}`}
                    disabled={isLoading}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    size="icon"
                    disabled={isLoading || !query.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Press Enter to send • Shift + Enter for new line • {conversationContext && "Ask follow-ups like 'show cheaper options' • "}Click mic for voice input
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Saved Searches & Examples */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-4xl mx-auto mt-6 space-y-4"
        >
          {/* Saved Searches Toggle */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => setShowSavedSearches(!showSavedSearches)}
            >
              <Bookmark className="h-4 w-4 mr-2" />
              {showSavedSearches ? "Hide" : "Show"} Saved Searches
            </Button>
          </div>

          {showSavedSearches && (
            <SavedSearches onSelectSearch={handleSelectSavedSearch} />
          )}

          {!showSavedSearches && (
            <>
              <p className="text-sm text-muted-foreground mb-3 text-center">Try these example queries:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "3BHK in Gachibowli under ₹1 crore",
                  "Verified villas in Bangalore",
                  "High trust score apartments in Mumbai",
                  "Properties near Whitefield with good appreciation"
                ].map((example, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => setQuery(example)}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {example}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}