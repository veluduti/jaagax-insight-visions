// Smart Stays checkout: "create" makes one Razorpay order for the package booking,
// "verify" checks the signature, marks paid (idempotent), then confirms every hotel stay.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const KEY = Deno.env.get("RAZORPAY_KEY_ID"), SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!KEY || !SECRET) return json({ error: "Payment gateway not configured" });
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return json({ error: "Please sign in" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const bookingId = typeof body?.booking_id === "string" ? body.booking_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return json({ error: "Invalid booking" }, 400);
    const { data: b } = await admin.from("smart_stay_bookings").select("*").eq("id", bookingId).maybeSingle();
    if (!b || b.customer_id !== uid) return json({ error: "Booking not found" }, 404);

    const confirm = async () => {
      const { data, error } = await admin.rpc("smart_stay_confirm", { _booking_id: bookingId });
      if (error) console.error("confirm failed", error);
      return data;
    };

    if (b.payment_status === "paid") {
      if (!["CONFIRMED", "MANUAL_REVIEW"].includes(b.status)) await confirm();
      return json({ success: true, already: true });
    }

    if (body.action === "create") {
      if (b.status !== "PENDING_PAYMENT") return json({ error: "This booking can't be paid" });
      const { data: q } = await admin.from("smart_stay_quotes").select("expires_at").eq("id", b.quote_id).single();
      if (!q || new Date(q.expires_at).getTime() < Date.now()) return json({ error: "Your price quote expired — please refresh it" });
      const amount = Math.round(Number(b.total) * 100);
      if (!(amount >= 100)) return json({ error: "Nothing to pay" });
      if (b.razorpay_order_id) return json({ order_id: b.razorpay_order_id, amount, currency: "INR", key_id: KEY });
      const r = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(`${KEY}:${SECRET}`)}` },
        body: JSON.stringify({ amount, currency: "INR", receipt: `ss_${bookingId.slice(0, 8)}`, notes: { purpose: "smart_stay", booking_id: bookingId } }),
      });
      const order = await r.json();
      if (!r.ok || !order.id) return json({ error: order?.error?.description || "Could not start payment" });
      await admin.from("smart_stay_bookings").update({ razorpay_order_id: order.id, payment_status: "pending", status: "PAYMENT_PROCESSING" }).eq("id", bookingId);
      await admin.from("smart_stay_events").insert({ booking_id: bookingId, smart_stay_id: b.smart_stay_id, event: "PAYMENT_PROCESSING" });
      return json({ order_id: order.id, amount, currency: "INR", key_id: KEY });
    }

    if (body.action === "verify") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return json({ error: "Missing payment fields" }, 400);
      if (razorpay_order_id !== b.razorpay_order_id) return json({ error: "Order mismatch" }, 400);
      const expected = await hmacHex(SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
      if (expected !== razorpay_signature) return json({ error: "Payment could not be verified" });
      // Double-check with Razorpay that the payment really was captured/authorised.
      const pr = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, { headers: { Authorization: `Basic ${btoa(`${KEY}:${SECRET}`)}` } });
      const pay = await pr.json();
      if (!pr.ok || !["captured", "authorized"].includes(pay.status) || pay.order_id !== razorpay_order_id) return json({ error: "Payment not completed yet" });
      const { data: upd } = await admin.from("smart_stay_bookings")
        .update({ payment_status: "paid", status: "PAYMENT_SUCCEEDED", razorpay_payment_id, paid_at: new Date().toISOString() })
        .eq("id", bookingId).neq("payment_status", "paid").select("id");
      if (upd?.length) await admin.from("smart_stay_events").insert({ booking_id: bookingId, smart_stay_id: b.smart_stay_id, event: "PAYMENT_SUCCEEDED", details: { payment_id: razorpay_payment_id } });
      const result = await confirm();
      return json({ success: true, result });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong" }, 500);
  }
});
