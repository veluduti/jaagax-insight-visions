// Smart Visit online payment: action "create" makes a Razorpay order for a booking,
// action "verify" checks the signature and marks the booking paid.
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
    if (!KEY || !SECRET) return json({ error: "Payment gateway not configured" }, 500);
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return json({ error: "Auth required" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return json({ error: "Invalid session" }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const bookingId = typeof body?.booking_id === "string" ? body.booking_id : "";
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) return json({ error: "Invalid booking" }, 400);

    const { data: b } = await admin.from("smart_visit_bookings")
      .select("id, customer_id, total_amount, status, payment_status, razorpay_order_id, plan:smart_visit_plans(title, agent_user_id)")
      .eq("id", bookingId).maybeSingle();
    if (!b || b.customer_id !== uid) return json({ error: "Booking not found" }, 404);
    if (b.payment_status === "paid") return json({ success: true, already: true });
    if (b.status === "cancelled") return json({ error: "This booking was cancelled" }, 400);

    if (body.action === "create") {
      const amount = Math.round(Number(b.total_amount) * 100);
      if (!(amount >= 100)) return json({ error: "Nothing to pay for this booking" }, 400);
      const r = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(`${KEY}:${SECRET}`)}` },
        body: JSON.stringify({ amount, currency: "INR", receipt: `sv_${bookingId.slice(0, 8)}_${Date.now()}`, notes: { purpose: "smart_visit", booking_id: bookingId } }),
      });
      const order = await r.json();
      if (!r.ok || !order.id) return json({ error: order?.error?.description || "Could not start payment" }, 502);
      await admin.from("smart_visit_bookings").update({ razorpay_order_id: order.id, payment_status: "pending" }).eq("id", bookingId);
      return json({ order_id: order.id, amount, currency: "INR", key_id: KEY });
    }

    if (body.action === "verify") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return json({ error: "Missing payment fields" }, 400);
      if (razorpay_order_id !== b.razorpay_order_id) return json({ error: "Order mismatch" }, 400);
      const expected = await hmacHex(SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
      if (expected !== razorpay_signature) {
        await admin.from("smart_visit_bookings").update({ payment_status: "failed" }).eq("id", bookingId);
        return json({ error: "Payment could not be verified" }, 400);
      }
      await admin.from("smart_visit_bookings").update({
        payment_status: "paid", razorpay_payment_id, paid_at: new Date().toISOString(),
      }).eq("id", bookingId);
      const plan: any = b.plan;
      if (plan?.agent_user_id) {
        await admin.from("notifications").insert({
          user_id: plan.agent_user_id, type: "smart_visit_payment", title: "Smart Visit paid",
          message: `₹${Number(b.total_amount).toLocaleString("en-IN")} received for "${plan.title}".`,
          link: "/dashboard/agent/smart-visits", metadata: { booking_id: bookingId },
        });
      }
      return json({ success: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong" }, 500);
  }
});
