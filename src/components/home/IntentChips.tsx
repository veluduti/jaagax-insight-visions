import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useBuyerContext } from "@/hooks/useBuyerContext";

const intentOptions = [
  { id: "price_fall", label: "Price may fall", icon: "📉" },
  { id: "project_delay", label: "Project delay worry", icon: "⏰" },
  { id: "job_insecurity", label: "Job insecurity", icon: "💼" },
  { id: "exploring", label: "Just exploring", icon: "🔍" },
];

const IntentChips = () => {
  const { user, role } = useAuth();
  const { buyerContext, upsertBuyerContext } = useBuyerContext();
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);

  // Initialize from buyer context if available
  useEffect(() => {
    if (buyerContext?.primary_fear) {
      setSelectedIntents(buyerContext.primary_fear);
    }
  }, [buyerContext]);

  const toggleIntent = async (intentId: string) => {
    const newSelection = selectedIntents.includes(intentId)
      ? selectedIntents.filter((id) => id !== intentId)
      : [...selectedIntents, intentId];

    setSelectedIntents(newSelection);

    // Sync with buyer_context if logged in as buyer (non-blocking)
    if (user && role === "buyer") {
      upsertBuyerContext({ primary_fear: newSelection }).catch(() => {
        // Silent fail - don't block UX
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="w-full py-3 px-4 bg-secondary/30 backdrop-blur-sm border-b border-border/30"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground mr-2 hidden sm:inline">
            What's on your mind?
          </span>
          {intentOptions.map((option) => {
            const isSelected = selectedIntents.includes(option.id);
            return (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleIntent(option.id)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                  transition-all duration-200 border
                  ${
                    isSelected
                      ? "bg-primary/15 border-primary/40 text-primary shadow-sm"
                      : "bg-background/60 border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }
                `}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default IntentChips;
