// Verifies a Razorpay payment signature and credits the user's wallet.
// Signature verification is mandatory; wallet is only credited after success.
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

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const RZP_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RZP_SECRET) return json({ error: "Payment gateway not configured" }, 500);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Auth required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) return json({ error: "Invalid session" }, 401);
    const userId = userData.user.id;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: "Missing payment fields" }, 400);
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Load the pending payment for this order + user
    const { data: payment, error: pErr } = await admin
      .from("wallet_payments")
      .select("id, user_id, amount, status")
      .eq("razorpay_order_id", razorpay_order_id)
      .maybeSingle();

    if (pErr || !payment) return json({ error: "Payment record not found" }, 404);
    if (payment.user_id !== userId) return json({ error: "Not allowed" }, 403);

    // Verify signature
    const expected = await hmacHex(RZP_SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
    if (expected !== razorpay_signature) {
      await admin.from("wallet_payments").update({
        status: "failed",
        razorpay_payment_id,
        error_message: "Invalid signature",
        updated_at: new Date().toISOString(),
      }).eq("id", payment.id);
      return json({ error: "Invalid payment signature" }, 400);
    }

    // Credit wallet atomically + record transaction (idempotent on payment_id)
    const { data: newBalance, error: creditErr } = await admin.rpc(
      "credit_wallet_from_razorpay",
      {
        _user_id: userId,
        _payment_id: razorpay_payment_id,
        _order_id: razorpay_order_id,
        _signature: razorpay_signature,
        _amount: Number(payment.amount),
      },
    );

    if (creditErr) {
      await admin.from("wallet_payments").update({
        status: "failed",
        razorpay_payment_id,
        razorpay_signature,
        error_message: creditErr.message,
        updated_at: new Date().toISOString(),
      }).eq("id", payment.id);
      return json({ error: creditErr.message }, 500);
    }

    return json({
      success: true,
      amount: Number(payment.amount),
      new_balance: Number(newBalance ?? 0),
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
