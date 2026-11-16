export const ID_TYPES = ["aadhaar", "passport", "driving_licence", "voter_id", "pan_card"] as const;
export const ID_LABELS: Record<string, string> = { aadhaar: "Aadhaar", passport: "Passport", driving_licence: "Driving Licence", voter_id: "Voter ID Card", pan_card: "PAN Card" };
export function bookingGuestCount(booking: { num_guests?: unknown; adults?: unknown; children?: unknown }) {
  return Math.max(1, Number(booking.num_guests) || 0, (Number(booking.adults) || 0) + (Number(booking.children) || 0));
}
export function guestDocumentsComplete(booking: any, info: any) {
  const count = bookingGuestCount(booking);
  if (!Array.isArray(info?.guests)) return count === 1 && !!info?.id_document_path && ID_TYPES.includes(info.id_type);
  return info.guests.length === count && info.guests.every((g: any, i: number) => g.guest_index === i && ID_TYPES.includes(g.id_type) && !!g.id_document_path && g.room_number >= 1 && g.room_number <= Math.max(1, Number(booking.num_rooms) || 1));
}