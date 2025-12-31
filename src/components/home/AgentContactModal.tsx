import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Shield, MessageSquare } from "lucide-react";

interface AgentContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName?: string;
  propertyTitle?: string;
  onConfirm: () => void;
}

const AgentContactModal = ({
  open,
  onOpenChange,
  agentName = "the agent",
  propertyTitle,
  onConfirm,
}: AgentContactModalProps) => {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (confirmed) {
      onConfirm();
      onOpenChange(false);
      setConfirmed(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">Before you connect</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-3 pt-2">
            <p className="text-sm text-foreground/80">
              You're about to connect with {agentName}
              {propertyTitle && ` regarding "${propertyTitle}"`}.
            </p>
            
            <div className="bg-secondary/50 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2 text-xs">
                <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  This agent is verified by JaagaX and bound by our fair-practice policy.
                </span>
              </div>
              <div className="flex items-start gap-2 text-xs">
                <MessageSquare className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground">
                  The agent will receive your inquiry and can see your browsing preferences to serve you better.
                </span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 py-4 border-t border-border/50">
          <Checkbox
            id="confirm-interest"
            checked={confirmed}
            onCheckedChange={(checked) => setConfirmed(checked as boolean)}
          />
          <label
            htmlFor="confirm-interest"
            className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
          >
            I understand and want to proceed with contacting this agent.
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            Not now
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!confirmed}
            className="glow-effect"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Yes, connect me
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AgentContactModal;
