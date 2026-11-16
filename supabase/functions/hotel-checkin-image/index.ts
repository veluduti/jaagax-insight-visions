import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { imageExtension, MAX_ID_IMAGE_BYTES } from "./imageRules.ts";

const schema = z.object({ booking_id: z.string().uuid(), id_type: z.enum(["aadhaar", "passport"]), eta: z.string().regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/), requests: z.string().trim().max(1000) });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method !== "POST") return reply(405, { error: "Method not allowed" });
  const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return reply(401, { error: "Please sign in to upload your ID image" });
  const { data: { user }, error: authError } = await db.auth.getUser(jwt);
  if (authError || !user) return reply(401, { error: "Please sign in again" });
  try {
    if (Number(req.headers.get("content-length") || 0) > MAX_ID_IMAGE_BYTES + 20000) return reply(400, { error: "Image must be 5 MB or smaller" });
    const form = await req.formData();
    const parsed = schema.safeParse(Object.fromEntries(["booking_id", "id_type", "eta", "requests"].map(k => [k, form.get(k) ?? ""])));
    if (!parsed.success) return reply(400, { error: "Check the document type, arrival time and special requests" });
    const info = parsed.data;
    const { data: booking } = await db.from("hotel_bookings").select("id,user_id,hotel_id,status,checkin_info").eq("id", info.booking_id).maybeSingle();
    if (!booking || booking.user_id !== user.id) return reply(403, { error: "You can only update your own booking" });
    if (!["confirmed", "checked_in"].includes(booking.status)) return reply(400, { error: "This booking is not eligible for check-in" });
    const file = form.get("image");
    let path = booking.checkin_info?.id_document_path;
    let uploaded = false;
    if (file instanceof File) {
      if (!file.size || file.size > MAX_ID_IMAGE_BYTES) return reply(400, { error: "Image must be 5 MB or smaller" });
      const bytes = new Uint8Array(await file.arrayBuffer());
      const ext = imageExtension(bytes);
      if (!ext || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return reply(400, { error: "Upload a JPG, PNG or WebP image only" });
      path = `${booking.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from("hotel-checkin-documents").upload(path, bytes, { contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}` });
      if (error) return reply(500, { error: "Could not upload the image. Please try again" });
      uploaded = true;
    }
    if (!path || (!uploaded && booking.checkin_info?.id_type !== info.id_type)) return reply(400, { error: "Please choose an Aadhaar or passport image" });
    const checkin = { id_type: info.id_type, id_document_path: path, eta: info.eta, requests: info.requests };
    const { error } = await db.rpc("save_hotel_checkin_image", { p_booking_id: booking.id, p_info: checkin });
    if (error) {
      if (uploaded) await db.storage.from("hotel-checkin-documents").remove([path]);
      return reply(500, { error: "Could not save check-in details. Please try again" });
    }
    if (uploaded && booking.checkin_info?.id_document_path) await db.storage.from("hotel-checkin-documents").remove([booking.checkin_info.id_document_path]);
    return reply(200, { checkin });
  } catch {
    return reply(400, { error: "Could not process the image. Please try again" });
  }
});