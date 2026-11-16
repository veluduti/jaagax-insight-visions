import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { imageExtension, MAX_ID_IMAGE_BYTES } from "./imageRules.ts";
import { ID_TYPES, bookingGuestCount } from "./guestRules.ts";

const schema = z.object({ booking_id: z.string().uuid(), guests: z.array(z.object({ guest_index: z.number().int().min(0), room_number: z.number().int().min(1), id_type: z.enum(ID_TYPES) })).min(1), eta: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/), requests: z.string().trim().max(1000) });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return reply(401, { error: "Please sign in to upload your ID image" });
  const { data: { user }, error: authError } = await db.auth.getUser(jwt);
  if (authError || !user) return reply(401, { error: "Please sign in again" });
  const uploadedPaths: string[] = [];
  let saved = false;
  try {
    const form = await req.formData();
    const parsed = schema.safeParse({ booking_id: form.get("booking_id"), guests: JSON.parse(String(form.get("guests") || "[]")), eta: form.get("eta") || "", requests: form.get("requests") || "" });
    if (!parsed.success) return reply(400, { error: "Check the document type, arrival time and special requests" });
    const info = parsed.data;
    const { data: booking } = await db.from("hotel_bookings").select("id,user_id,hotel_id,status,checkin_info,num_guests,num_rooms,adults,children").eq("id", info.booking_id).maybeSingle();
    if (!booking || booking.user_id !== user.id) return reply(403, { error: "You can only update your own booking" });
    if (!["confirmed", "checked_in"].includes(booking.status)) return reply(400, { error: "This booking is not eligible for check-in" });
    const count = bookingGuestCount(booking);
    if (info.guests.length !== count || info.guests.some((g, i) => g.guest_index !== i || g.room_number > Math.max(1, Number(booking.num_rooms) || 1))) return reply(400, { error: "Provide ID images and a valid room for every booked guest" });
    const oldGuests = Array.isArray(booking.checkin_info?.guests) ? booking.checkin_info.guests : [{ guest_index: 0, id_type: booking.checkin_info?.id_type, id_document_path: booking.checkin_info?.id_document_path }];
    const prepared: { guest: typeof info.guests[number]; path: string; bytes?: Uint8Array; ext?: string }[] = [];
    for (const guest of info.guests) {
      const file = form.get(`image_${guest.guest_index}`);
      const previous = oldGuests.find((g: any) => g.guest_index === guest.guest_index);
      if (!(file instanceof File)) {
        if (!previous?.id_document_path || previous.id_type !== guest.id_type) return reply(400, { error: `Please upload an ID image for Guest ${guest.guest_index + 1}` });
        prepared.push({ guest, path: previous.id_document_path });
        continue;
      }
      if (!file.size || file.size > MAX_ID_IMAGE_BYTES) return reply(400, { error: "Each image must be 5 MB or smaller" });
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ext = imageExtension(bytes);
      if (!ext || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return reply(400, { error: "Upload a JPG, PNG or WebP image only" });
      prepared.push({ guest, bytes, ext, path: `${booking.id}/${guest.guest_index}-${crypto.randomUUID()}.${ext}` });
    }
    for (const item of prepared) {
      if (!item.bytes) continue;
      const { error } = await db.storage.from("hotel-checkin-documents").upload(item.path, item.bytes, { contentType: item.ext === "jpg" ? "image/jpeg" : `image/${item.ext}` });
      if (error) throw new Error("upload failed");
      uploadedPaths.push(item.path);
    }
    const checkin = { guests: prepared.map(item => ({ ...item.guest, id_document_path: item.path })), eta: info.eta, requests: info.requests };
    const { error } = await db.rpc("save_hotel_checkin_image", { p_booking_id: booking.id, p_info: checkin });
    if (error) throw new Error("save failed");
    saved = true;
    const replaced = oldGuests.map((g: any) => g.id_document_path).filter((path: string) => path && !prepared.some(item => item.path === path));
    if (replaced.length) await db.storage.from("hotel-checkin-documents").remove(replaced);
    return reply(200, { checkin });
  } catch {
    if (!saved && uploadedPaths.length) await db.storage.from("hotel-checkin-documents").remove(uploadedPaths);
    return reply(400, { error: "Could not process the image. Please try again" });
  }
});