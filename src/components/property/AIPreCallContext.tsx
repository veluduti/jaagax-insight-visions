import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Brain, Construction } from "lucide-react";

interface AIPreCallContextProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  onContextSaved: (contextId: string) => void;
}

// Stub component - agent_call_context table not yet created
const AIPreCallContext = ({ open, onClose, propertyId, propertyTitle, onContextSaved }: AIPreCallContextProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Talk to AI Expert
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          For: <span className="font-medium text-foreground">{propertyTitle}</span>
        </p>

        <div className="text-center py-8">
          <Construction className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground text-sm mb-4">
            AI-powered pre-call context feature is being set up. Check back soon!
          </p>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIPreCallContext;
