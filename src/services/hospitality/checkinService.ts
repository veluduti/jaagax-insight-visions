import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { ID_TYPES } from "../../../supabase/functions/hotel-checkin-image/guestRules";
export { ID_LABELS, bookingGuestCount, guestDocumentsComplete } from "../../../supabase/functions/hotel-checkin-image/guestRules";

export const checkinSchema = z.object({
  guests: z.array(z.object({ guest_index: z.number().int().min(0), room_number: z.number().int().min(1), id_type: z.enum(ID_TYPES) })).min(1),
  eta: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/),
  requests: z.string().trim().max(1000),
});
export function validateCheckinImage(file: Pick<File, "type" | "size">) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Upload a JPG, PNG or WebP image only";
  if (!file.size || file.size > 5 * 1024 * 1024) return "Image must be 5 MB or smaller";
  return null;
}
export async function saveCheckinImage(bookingId: string, values: unknown, images: Record<number, File>) {
  const parsed = checkinSchema.safeParse(values);
  if (!parsed.success) throw new Error("Check the document type, arrival time and special requests (maximum 1,000 characters)");
  for (const image of Object.values(images)) { const error = validateCheckinImage(image); if (error) throw new Error(error); }
  const form = new FormData();
  form.set("booking_id", bookingId);
  form.set("guests", JSON.stringify(parsed.data.guests));
  form.set("eta", parsed.data.eta);
  form.set("requests", parsed.data.requests);
  Object.entries(images).forEach(([index, image]) => form.set(`image_${index}`, image));
  const { data, error } = await supabase.functions.invoke("hotel-checkin-image", { body: form });
  if (error) {
    let message = "Could not save check-in details. Please try again";
    try { message = (await error.context?.json())?.error || message; } catch { /* retain safe error */ }
    throw new Error(message);
  }
  return data.checkin;
}