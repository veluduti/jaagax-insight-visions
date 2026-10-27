export function hasHotelMapCoordinates(hotel: { latitude?: number | null; longitude?: number | null }): boolean {
  return hotel.latitude != null && hotel.longitude != null && Number.isFinite(Number(hotel.latitude)) && Number.isFinite(Number(hotel.longitude)) && Math.abs(Number(hotel.latitude)) <= 90 && Math.abs(Number(hotel.longitude)) <= 180;
}