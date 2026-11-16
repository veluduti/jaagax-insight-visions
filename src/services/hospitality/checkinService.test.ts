import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { checkinSchema, validateCheckinImage } from "./checkinService";
import { imageExtension } from "../../../supabase/functions/hotel-checkin-image/imageRules";
import { bookingGuestCount, guestDocumentsComplete } from "./checkinService";
describe("check-in ID images", () => {
  for (const id_type of ["aadhaar", "passport", "driving_licence", "voter_id", "pan_card"]) it(`accepts ${id_type} images`, () => {
    expect(checkinSchema.safeParse({ guests: [{ guest_index: 0, room_number: 1, id_type }], eta: "", requests: "" }).success).toBe(true);
    expect(checkinSchema.safeParse({ guests: [{ guest_index: 0, room_number: 1, id_type: "other" }], eta: "", requests: "" }).success).toBe(false);
  });
  for (const count of [1,2,3]) it(`requires separate ID images for ${count} guests in one room`, () => {
    const booking = { num_guests: count, num_rooms: 1 };
    expect(bookingGuestCount(booking)).toBe(count);
    const guests = Array.from({ length: count }, (_, guest_index) => ({ guest_index, room_number: 1, id_type: "aadhaar", id_document_path: `booking/${guest_index}.jpg` }));
    expect(guestDocumentsComplete(booking, { guests })).toBe(true);
    guests[count - 1].id_document_path = "";
    expect(guestDocumentsComplete(booking, { guests })).toBe(false);
  });
  it("rejects non-image files and accepts image types", () => {
    expect(validateCheckinImage({ type: "application/pdf", size: 100 })).toBeTruthy();
    for (const type of ["image/jpeg", "image/png", "image/webp"]) expect(validateCheckinImage({ type, size: 100 })).toBeNull();
  });
  it("rejects renamed text files on the server", () => {
    expect(imageExtension(new TextEncoder().encode("123456789012"))).toBeNull();
    expect(imageExtension(new Uint8Array([255,216,255,0]))).toBe("jpg");
  });
  it("limits images to 5 MB", () => {
    expect(validateCheckinImage({ type: "image/jpeg", size: 5 * 1024 * 1024 })).toBeNull();
    expect(validateCheckinImage({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).toBeTruthy();
  });
});