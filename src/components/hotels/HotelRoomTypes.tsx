// Legacy wrapper — real, DB-driven room list lives in HotelRoomList.tsx.
// Kept so existing imports keep working.
import HotelRoomList from "./HotelRoomList";

interface Props {
  hotelId: string;
  hotelName: string;
  basePrice?: number;
  discount?: number;
  checkIn?: string;
  checkOut?: string;
  adults?: number;
  children?: number;
  roomsWanted?: number;
  hotelCity?: string;
  onNightlyRoomsChange?: (hasNightlyRooms: boolean) => void;
}

export default function HotelRoomTypes({
  hotelId, hotelName, hotelCity, checkIn, checkOut, adults, children, roomsWanted,
  onNightlyRoomsChange,
}: Props) {
  return (
    <HotelRoomList
      hotelId={hotelId}
      hotelName={hotelName}
      hotelCity={hotelCity}
      checkIn={checkIn}
      checkOut={checkOut}
      adults={adults}
      children={children}
      roomsWanted={roomsWanted}
      onNightlyRoomsChange={onNightlyRoomsChange}
    />
  );
}
