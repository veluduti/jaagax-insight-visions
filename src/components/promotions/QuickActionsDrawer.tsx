import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Calendar, Phone, MessageCircle, MapPin, 
  Bell, Download, ExternalLink, Video, Mic,
  Calculator, FileText, Share2, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface QuickActionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  adTitle: string;
  adId: string;
}

const QuickActionsDrawer = ({ isOpen, onClose, adTitle, adId }: QuickActionsDrawerProps) => {
  const actions = [
    { 
      icon: Calendar, 
      label: "Schedule Visit", 
      color: "bg-blue-500",
      action: () => toast.success("Visit scheduling coming soon!")
    },
    { 
      icon: Video, 
      label: "Virtual Tour", 
      color: "bg-purple-500",
      action: () => toast.info("360° tour loading...")
    },
    { 
      icon: Phone, 
      label: "Call Now", 
      color: "bg-green-500",
      action: () => toast.success("Connecting you to the agent...")
    },
    { 
      icon: MessageCircle, 
      label: "WhatsApp", 
      color: "bg-emerald-500",
      action: () => window.open('https://wa.me/?text=' + encodeURIComponent(`I'm interested in: ${adTitle}`))
    },
    { 
      icon: Bell, 
      label: "Price Alerts", 
      color: "bg-amber-500",
      action: () => toast.success("You'll be notified of price changes!")
    },
    { 
      icon: Calculator, 
      label: "EMI Calculator", 
      color: "bg-indigo-500",
      action: () => toast.info("EMI calculator opening...")
    },
    { 
      icon: MapPin, 
      label: "Get Directions", 
      color: "bg-red-500",
      action: () => toast.info("Opening maps...")
    },
    { 
      icon: FileText, 
      label: "Brochure", 
      color: "bg-orange-500",
      action: () => toast.success("Brochure download started!")
    },
    { 
      icon: Mic, 
      label: "AI Voice Info", 
      color: "bg-pink-500",
      action: () => toast.info("AI assistant starting...")
    },
    { 
      icon: Share2, 
      label: "Share", 
      color: "bg-cyan-500",
      action: () => {
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied!");
      }
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl max-h-[70vh] overflow-hidden"
          >
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4">
              <div>
                <h3 className="text-lg font-semibold">Quick Actions</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">{adTitle}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Actions Grid */}
            <div className="px-6 pb-8 overflow-y-auto">
              <div className="grid grid-cols-5 gap-4">
                {actions.map((action, index) => (
                  <motion.button
                    key={action.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => {
                      action.action();
                      onClose();
                    }}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className={`${action.color} p-3 rounded-2xl`}>
                      <action.icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs text-center leading-tight">
                      {action.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default QuickActionsDrawer;
