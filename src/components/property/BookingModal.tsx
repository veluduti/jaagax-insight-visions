import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { VisitOptionsModal } from "@/components/booking/VisitOptionsModal";
import { VisitStayPlanner } from "@/components/booking/VisitStayPlanner";

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
  propertyLocality = ""
}: BookingModalProps) => {
  const navigate = useNavigate();
  const [showVisitStay, setShowVisitStay] = useState(false);

  const handleQuickVisit = () => {
    onClose();
    navigate(`/visit/schedule/${propertyId}`);
  };

  const handleVisitStay = () => {
    onClose();
    setShowVisitStay(true);
  };

  const handleCloseVisitStay = () => {
    setShowVisitStay(false);
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

      <VisitStayPlanner
        open={showVisitStay}
        onClose={handleCloseVisitStay}
        propertyId={parseInt(propertyId)}
        propertyTitle={propertyTitle}
        propertyCity={propertyCity}
        propertyLocality={propertyLocality}
        mode="visit_stay"
      />
    </>
  );
};

export default BookingModal;
