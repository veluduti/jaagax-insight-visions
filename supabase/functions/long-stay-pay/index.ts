// PG / Hostel / Co-living long-stay checkout: "create" makes one Razorpay order for the
// server-computed amount, "verify" checks signature + amount, marks paid (idempotent) and confirms the hold.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import { isVerifiedLongStayPayment } from "./paymentRules.ts";
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
    const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !serviceKey) return json({error:"Payment service unavailable"},503);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    const uid = u?.user?.id;
    if (!uid) return json({ error: "Please sign in" }, 401);
    const admin = createClient(url, serviceKey);

    const parsed = z.object({ action:z.enum(["create","verify"]), stay_id:z.string().uuid(), razorpay_order_id:z.string().regex(/^order_[a-zA-Z0-9]+$/).optional(), razorpay_payment_id:z.string().regex(/^pay_[a-zA-Z0-9]+$/).optional(), razorpay_signature:z.string().regex(/^[a-f0-9]{64}$/).optional() }).safeParse(await req.json().catch(()=>({})));
    if(!parsed.success)return json({error:"Invalid payment request"},400);
    const body=parsed.data;
    const stayId=body.stay_id;
    const { data: s } = await admin.from("hotel_long_stays").select("*").eq("id", stayId).maybeSingle();
    if (!s || s.user_id !== uid) return json({ error: "Booking not found" }, 404);
    const confirm = async () => {
      const { data, error } = await admin.rpc("long_stay_confirm", { _stay_id: stayId });
      if (error) throw new Error("Payment received; booking confirmation requires review");
      return data;
    };
    if (s.payment_status === "paid") {
      if (!["active", "manual_review", "notice", "moved_out"].includes(s.status)) { const result=await confirm();if(!result?.ok)return json({error:"Payment received; your booking needs property review"},409); }
      if(s.status==="manual_review")return json({error:"Payment received; your booking needs property review"},409);
      return json({ success: true, already: true, booking_ref: s.booking_ref });
    }

    if (body.action === "create") {
      if(s.application_id){
        const {data:application}=await admin.from("hotel_leads").select("stage,verification").eq("id",s.application_id).eq("customer_id",uid).single();
        if(application?.stage!=="approved" || application.verification?.id!=="verified" || application.verification?.photo!=="verified")return json({error:"Application approval and verified documents are required before payment"},409);
      }
      if (s.status !== "pending_payment") return json({ error: "This booking can't be paid any more" });
      if (!s.hold_expires_at || new Date(s.hold_expires_at).getTime() < Date.now()) return json({ error: "Your hold expired — please start again" });
      const amount = Math.round(Number(s.amount_due) * 100);
      if (!(amount >= 100)) return json({ error: "Nothing to pay" });
      if (s.razorpay_order_id) return json({ order_id: s.razorpay_order_id, amount, currency: "INR", key_id: KEY });
      const r = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(`${KEY}:${SECRET}`)}` },
        body: JSON.stringify({ amount, currency: "INR", receipt: `ls_${stayId.slice(0, 8)}`, notes: { purpose: "long_stay", stay_id: stayId } }),
      });
      const order = await r.json();
      if (!r.ok || !order.id) return json({ error: order?.error?.description || "Could not start payment" });
      // Only set if still empty → duplicate "create" calls reuse one order.
      const { data: upd } = await admin.from("hotel_long_stays").update({ razorpay_order_id: order.id })
        .eq("id", stayId).is("razorpay_order_id", null).select("razorpay_order_id");
      const oid = upd?.[0]?.razorpay_order_id ?? (await admin.from("hotel_long_stays").select("razorpay_order_id").eq("id", stayId).single()).data?.razorpay_order_id;
      return json({ order_id: oid, amount, currency: "INR", key_id: KEY });
    }

    if (body.action === "verify") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return json({ error: "Missing payment fields" }, 400);
      if (razorpay_order_id !== s.razorpay_order_id) return json({ error: "Order mismatch" }, 400);
      const expected = await hmacHex(SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
      if (expected !== razorpay_signature) return json({ error: "Payment could not be verified" });
      const pr = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, { headers: { Authorization: `Basic ${btoa(`${KEY}:${SECRET}`)}` } });
      const pay = await pr.json();
      if (!pr.ok || !isVerifiedLongStayPayment(pay, razorpay_order_id, Number(s.amount_due))) return json({ error: "Payment not completed or amount does not match" });
      await admin.from("hotel_long_stays")
        .update({ payment_status: "paid", razorpay_payment_id, paid_at: new Date().toISOString() })
        .eq("id", stayId).neq("payment_status", "paid");
      const result = await confirm();
      if(!result?.ok)return json({error:"Payment received; inventory requires property review. Do not pay again.",booking_ref:s.booking_ref},409);
      // Deposit checkout leaves the initial balance due; never label it fully paid.
      if ((result as any)?.ok && s.rent_plan === "monthly") {
        await admin.from("hotel_rent_dues").upsert({
          stay_id: stayId, hotel_id: s.hotel_id, period_month: `${String(s.move_in).slice(0, 7)}-01`,
          amount: Number(s.move_in_balance)>0 ? s.move_in_balance : s.quote?.recurring ?? s.monthly_rent,
          due_date: s.move_in, status: Number(s.move_in_balance)>0 ? "due" : "paid", paid_at: Number(s.move_in_balance)>0 ? null : new Date().toISOString(),
          payment_note: Number(s.move_in_balance)>0 ? `Move-in balance after online booking deposit ${razorpay_payment_id}` : `Paid online ${razorpay_payment_id}`,
        }, { onConflict: "stay_id,period_month", ignoreDuplicates: true });
      }
      await admin.from("notifications").insert([{ user_id: uid, title: "Long stay confirmed", message: `Booking ${s.booking_ref} — move-in ${s.move_in}`, type: "booking" }]).then(() => {}, () => {});
      return json({ success: true, result, booking_ref: s.booking_ref });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong" }, 500);
  }
});
