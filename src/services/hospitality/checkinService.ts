import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

export const checkinSchema = z.object({
  id_type: z.enum(["aadhaar", "passport"]),
  eta: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/),
  requests: z.string().trim().max(1000),
});
export function validateCheckinImage(file: Pick<File, "type" | "size">) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Upload a JPG, PNG or WebP image only";
  if (!file.size || file.size > 5 * 1024 * 1024) return "Image must be 5 MB or smaller";
  return null;
}
export async function saveCheckinImage(bookingId: string, values: unknown, image: File | null) {
  const parsed = checkinSchema.safeParse(values);
  if (!parsed.success) throw new Error("Check the document type, arrival time and special requests (maximum 1,000 characters)");
  if (image) { const error = validateCheckinImage(image); if (error) throw new Error(error); }
  const form = new FormData();
  form.set("booking_id", bookingId);
  Object.entries(parsed.data).forEach(([k, v]) => form.set(k, v));
  if (image) form.set("image", image);
  const { data, error } = await supabase.functions.invoke("hotel-checkin-image", { body: form });
  if (error) {
    let message = "Could not save check-in details. Please try again";
    try { message = (await error.context?.json())?.error || message; } catch { /* retain safe error */ }
    throw new Error(message);
  }
  return data.checkin;
}