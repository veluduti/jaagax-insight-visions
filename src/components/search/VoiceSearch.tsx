import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Loader2, Sparkles, X, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface VoiceSearchProps {
  onSearchResult: (query: string, filters?: ParsedFilters) => void;
  className?: string;
}

interface ParsedFilters {
  city?: string;
  locality?: string;
  propertyType?: string;
  bhk?: number;
  minBudget?: number;
  maxBudget?: number;
  amenities?: string[];
}

const VoiceSearch = ({ onSearchResult, className }: VoiceSearchProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedFilters, setParsedFilters] = useState<ParsedFilters | null>(null);
  const [showModal, setShowModal] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-IN";

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            setTranscript(transcript);
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          processVoiceQuery(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        toast.error("Voice recognition failed. Please try again.");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Simulate audio level animation
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [isListening]);

  const processVoiceQuery = async (query: string) => {
    setIsProcessing(true);
    
    // Simple NLP parsing - in production, this would call an AI service
    const filters: ParsedFilters = {};
    const lowerQuery = query.toLowerCase();

    // Extract BHK
    const bhkMatch = lowerQuery.match(/(\d)\s*bhk/);
    if (bhkMatch) filters.bhk = parseInt(bhkMatch[1]);

    // Extract city/locality
    const cities = ["hyderabad", "bangalore", "mumbai", "delhi", "pune", "chennai"];
    const localities = ["gachibowli", "hitech city", "kondapur", "jubilee hills", "banjara hills", "madhapur"];
    
    cities.forEach(city => {
      if (lowerQuery.includes(city)) filters.city = city.charAt(0).toUpperCase() + city.slice(1);
    });
    
    localities.forEach(locality => {
      if (lowerQuery.includes(locality)) filters.locality = locality.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    });

    // Extract budget
    const croreMatch = lowerQuery.match(/(\d+(?:\.\d+)?)\s*(?:crore|cr)/);
    const lakhMatch = lowerQuery.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|l)/);
    
    if (croreMatch) {
      const amount = parseFloat(croreMatch[1]) * 10000000;
      if (lowerQuery.includes("under") || lowerQuery.includes("below") || lowerQuery.includes("less than")) {
        filters.maxBudget = amount;
      } else if (lowerQuery.includes("above") || lowerQuery.includes("more than")) {
        filters.minBudget = amount;
      } else {
        filters.maxBudget = amount;
      }
    }
    
    if (lakhMatch) {
      const amount = parseFloat(lakhMatch[1]) * 100000;
      if (lowerQuery.includes("under") || lowerQuery.includes("below")) {
        filters.maxBudget = amount;
      } else {
        filters.maxBudget = amount;
      }
    }

    // Extract property type
    if (lowerQuery.includes("apartment") || lowerQuery.includes("flat")) {
      filters.propertyType = "Apartment";
    } else if (lowerQuery.includes("villa") || lowerQuery.includes("house")) {
      filters.propertyType = "Villa";
    } else if (lowerQuery.includes("plot") || lowerQuery.includes("land")) {
      filters.propertyType = "Plot";
    }

    // Extract amenities
    const amenities: string[] = [];
    if (lowerQuery.includes("gym")) amenities.push("Gym");
    if (lowerQuery.includes("pool") || lowerQuery.includes("swimming")) amenities.push("Swimming Pool");
    if (lowerQuery.includes("parking")) amenities.push("Parking");
    if (lowerQuery.includes("garden")) amenities.push("Garden");
    if (amenities.length > 0) filters.amenities = amenities;

    setParsedFilters(filters);
    setIsProcessing(false);
    
    // Auto-search after parsing
    setTimeout(() => {
      onSearchResult(query, filters);
      setShowModal(false);
    }, 1500);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Voice search is not supported in your browser");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      setParsedFilters(null);
      recognitionRef.current.start();
      setIsListening(true);
      setShowModal(true);
    }
  };

  return (
    <>
      {/* Voice Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleListening}
        className={cn(
          "relative rounded-full transition-all",
          isListening && "bg-primary text-primary-foreground animate-pulse",
          className
        )}
      >
        {isListening ? (
          <MicOff className="h-5 w-5" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/30"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </Button>

      {/* Voice Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => {
              if (!isListening && !isProcessing) {
                setShowModal(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-[400px] p-6 relative overflow-hidden">
                {/* Close Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    if (isListening) recognitionRef.current?.stop();
                    setShowModal(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="text-center space-y-6">
                  {/* Animated Microphone */}
                  <div className="relative w-24 h-24 mx-auto">
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary/10"
                      animate={isListening ? {
                        scale: [1, 1.2 + (audioLevel / 200), 1],
                      } : {}}
                      transition={{ duration: 0.2 }}
                    />
                    <motion.div
                      className="absolute inset-2 rounded-full bg-primary/20"
                      animate={isListening ? {
                        scale: [1, 1.1 + (audioLevel / 300), 1],
                      } : {}}
                      transition={{ duration: 0.15 }}
                    />
                    <div 
                      className={cn(
                        "absolute inset-4 rounded-full flex items-center justify-center",
                        isListening ? "bg-primary" : "bg-muted"
                      )}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-8 w-8 text-primary-foreground animate-spin" />
                      ) : (
                        <Mic className={cn(
                          "h-8 w-8",
                          isListening ? "text-primary-foreground" : "text-muted-foreground"
                        )} />
                      )}
                    </div>
                  </div>

                  {/* Status Text */}
                  <div>
                    {isListening && !transcript && (
                      <p className="text-lg font-medium animate-pulse">
                        Listening...
                      </p>
                    )}
                    {isProcessing && (
                      <p className="text-lg font-medium flex items-center justify-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Understanding your search...
                      </p>
                    )}
                  </div>

                  {/* Transcript */}
                  {transcript && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg bg-muted"
                    >
                      <p className="text-sm text-muted-foreground mb-1">You said:</p>
                      <p className="font-medium">"{transcript}"</p>
                    </motion.div>
                  )}

                  {/* Parsed Filters */}
                  {parsedFilters && Object.keys(parsedFilters).length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-2"
                    >
                      <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        Detected filters:
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {parsedFilters.city && (
                          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                            📍 {parsedFilters.city}
                          </span>
                        )}
                        {parsedFilters.locality && (
                          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                            🏘️ {parsedFilters.locality}
                          </span>
                        )}
                        {parsedFilters.bhk && (
                          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                            🛏️ {parsedFilters.bhk} BHK
                          </span>
                        )}
                        {parsedFilters.maxBudget && (
                          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                            💰 Under ₹{(parsedFilters.maxBudget / 10000000).toFixed(1)} Cr
                          </span>
                        )}
                        {parsedFilters.propertyType && (
                          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
                            🏠 {parsedFilters.propertyType}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Example Prompts */}
                  {!transcript && isListening && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Try saying:</p>
                      <div className="flex flex-wrap gap-2 justify-center text-xs">
                        <span className="px-2 py-1 rounded bg-muted">"3 BHK in Gachibowli under 2 crore"</span>
                        <span className="px-2 py-1 rounded bg-muted">"Villa with pool in Jubilee Hills"</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceSearch;
