// Creates a Razorpay order for a wallet top-up.
// Records a PENDING wallet_payments row and returns the order to the client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const RZP_KEY = Deno.env.get("RAZORPAY_KEY_ID");
    const RZP_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RZP_KEY || !RZP_SECRET) return json({ error: "Payment gateway not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Auth required" }, 401);

    // Auth-scoped client to get the calling user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) return json({ error: "Invalid session" }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount < 500) {
      return json({ error: "Minimum top-up is ₹500" }, 400);
    }
    if (amount > 200000) {
      return json({ error: "Maximum top-up per transaction is ₹2,00,000" }, 400);
    }

    // Service client for privileged writes
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const amountPaise = Math.round(amount * 100);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${RZP_KEY}:${RZP_SECRET}`)}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `wallet_${userId.slice(0, 8)}_${Date.now()}`,
        notes: { purpose: "wallet_topup", user_id: userId },
      }),
    });
    const order = await rzpRes.json();
    if (!rzpRes.ok || !order.id) {
      return json({ error: order?.error?.description || "Failed to create payment order" }, 502);
    }

    const { error: insErr } = await admin.from("wallet_payments").insert({
      user_id: userId,
      amount,
      razorpay_order_id: order.id,
      status: "pending",
    });
    if (insErr) {
      console.error("wallet_payments insert failed", insErr);
    }

    return json({
      order_id: order.id,
      amount: amountPaise,
      currency: "INR",
      key_id: RZP_KEY,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
