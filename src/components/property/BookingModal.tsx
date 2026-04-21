import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VisitOptionsModal } from "@/components/booking/VisitOptionsModal";
import { VisitStayPlanner } from "@/components/booking/VisitStayPlanner";
import { QuickVisitWizard } from "@/components/booking/QuickVisitWizard";

interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle: string;
  propertyCity?: string;
  propertyLocality?: string;
}

const BookingModal = ({
  open,
  onClose,
  propertyId,
  propertyTitle,
  propertyCity = "Bangalore",
  propertyLocality = "",
}: BookingModalProps) => {
  const [showVisitStay, setShowVisitStay] = useState(false);
  const [showQuickVisit, setShowQuickVisit] = useState(false);
  const [propertyPrice, setPropertyPrice] = useState<number>(0);

  useEffect(() => {
    if (!open || !propertyId) return;
    supabase.from("properties").select("price").eq("id", propertyId).maybeSingle()
      .then(({ data }) => setPropertyPrice(Number(data?.price) || 0));
  }, [open, propertyId]);

  const handleQuickVisit = () => {
    onClose();
    setShowQuickVisit(true);
  };

  const handleVisitStay = () => {
    onClose();
    setShowVisitStay(true);
  };

  return (
    <>
      <VisitOptionsModal
        open={open}
        onClose={onClose}
        onSelectQuickVisit={handleQuickVisit}
        onSelectVisitStay={handleVisitStay}
        propertyTitle={propertyTitle}
        propertyCity={propertyCity}
      />

      <QuickVisitWizard
        open={showQuickVisit}
        onClose={() => setShowQuickVisit(false)}
        propertyId={propertyId}
        propertyTitle={propertyTitle}
        propertyCity={propertyCity}
        propertyLocality={propertyLocality}
        propertyPrice={propertyPrice}
      />

      <VisitStayPlanner
        open={showVisitStay}
        onClose={() => setShowVisitStay(false)}
        propertyId={propertyId}
        propertyTitle={propertyTitle}
        propertyCity={propertyCity}
        propertyLocality={propertyLocality}
        mode="visit_stay"
      />
    </>
  );
};

export default BookingModal;
