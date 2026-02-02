import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Hotel, Construction } from "lucide-react";

interface VisitStayPlannerProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  propertyCity: string;
  propertyLocality: string;
  mode?: 'visit_stay' | 'hotel_only';
  preSelectedHotel?: any;
  preSelectedPackage?: any;
}

// Stub component - partner_hotels, visit_packages, visit_stay_bookings tables not yet created
export const VisitStayPlanner = ({ 
  open, 
  onClose, 
  propertyTitle, 
  propertyLocality,
  mode = 'visit_stay'
}: VisitStayPlannerProps) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            {mode === 'visit_stay' ? 'Plan Your Visit + Stay' : 'Book Partner Hotel'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'visit_stay' 
              ? `Visiting ${propertyTitle}? Book a nearby stay with exclusive discounts.`
              : `Find comfortable accommodation near ${propertyLocality}`}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Construction className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                The Visit + Stay booking feature with partner hotels is being set up. 
                Check back soon for exclusive accommodation packages!
              </p>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
