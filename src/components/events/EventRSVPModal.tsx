import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Construction } from "lucide-react";

interface EventRSVPModalProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Stub component - event_rsvps and event_logs tables not yet created
export function EventRSVPModal({ event, open, onOpenChange, onSuccess }: EventRSVPModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>RSVP for {event?.title || "Event"}</DialogTitle>
          <DialogDescription>
            Register for this event
          </DialogDescription>
        </DialogHeader>

        <div className="text-center py-8">
          <Construction className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Event registration feature is being set up. Check back soon!
          </p>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
