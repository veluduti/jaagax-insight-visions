import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Hotel } from "lucide-react";
import HotelBookingModal from "./HotelBookingModal";

interface PartnerHotel {
  id: string;
  name: string;
  city: string;
  locality: string;
  address: string | null;
  star_rating: number | null;
  price_per_night: number;
  discount_percentage: number | null;
  amenities: string[] | null;
  images: string[] | null;
}

interface HotelOnlyBookingProps {
  open: boolean;
  onClose: () => void;
  hotel: PartnerHotel;
  initialCheckIn?: Date;
  initialCheckOut?: Date;
  initialGuests?: number;
  initialRooms?: number;
}

export const HotelOnlyBooking = ({
  open,
  onClose,
  hotel,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  initialRooms,
}: HotelOnlyBookingProps) => {
  return (
    <HotelBookingModal
      open={open}
      onClose={onClose}
      hotel={hotel}
      bookingType="hotel_only"
      initialCheckIn={initialCheckIn}
      initialCheckOut={initialCheckOut}
      initialGuests={initialGuests}
      initialRooms={initialRooms}
    />
  );
};

export default HotelOnlyBooking;
