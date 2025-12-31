import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";

interface PropertyWhyLinkProps {
  propertyId: number;
  verified?: boolean;
  trustScore?: number;
  locality?: string;
}

const PropertyWhyLink = ({
  propertyId,
  verified,
  trustScore,
  locality,
}: PropertyWhyLinkProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate explanation based on available data
  const generateExplanation = () => {
    const reasons: string[] = [];

    if (verified) {
      reasons.push("This property is verified by JaagaX with all documents checked");
    }

    if (trustScore && trustScore >= 80) {
      reasons.push(`High trust score of ${trustScore}% indicates reliable listing`);
    } else if (trustScore && trustScore >= 60) {
      reasons.push(`Trust score of ${trustScore}% - standard verification complete`);
    }

    if (locality) {
      reasons.push(`Located in ${locality}, a popular area for property seekers`);
    }

    if (reasons.length === 0) {
      reasons.push("This property matches general search criteria in your area");
    }

    return reasons;
  };

  const explanations = generateExplanation();

  return (
    <div className="mt-2 border-t border-border/30 pt-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors w-full"
      >
        <Sparkles className="h-3 w-3" />
        <span className="font-medium">Why this property?</span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 ml-auto" />
        ) : (
          <ChevronDown className="h-3 w-3 ml-auto" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-1.5">
              {explanations.map((reason, index) => (
                <div
                  key={index}
                  className="flex items-start gap-1.5 text-xs text-muted-foreground"
                >
                  <span className="text-primary/60 mt-0.5">•</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PropertyWhyLink;
