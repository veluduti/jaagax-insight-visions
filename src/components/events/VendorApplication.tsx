import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Store, Construction } from "lucide-react";

interface VendorApplicationProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Stub component - event_vendors table not yet created
export function VendorApplication({ eventId, open, onOpenChange }: VendorApplicationProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Vendor Application
          </DialogTitle>
          <DialogDescription>
            Apply to participate as a vendor at this event
          </DialogDescription>
        </DialogHeader>

        <div className="text-center py-8">
          <Construction className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Vendor application feature is being set up. Check back soon!
          </p>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
