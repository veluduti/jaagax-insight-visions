import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatPhone(phone: string): string {
  let c = (phone || "").replace(/[\s\-()]/g, "").replace("whatsapp:", "");
  if (c.startsWith("+")) return c;
  if (c.startsWith("91") && c.length === 12) return "+" + c;
  if (c.length === 10 && /^\d+$/.test(c)) return "+91" + c;
  return "+" + c;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const { data: { user } } = await supabase.auth.getUser(auth.slice(7));
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { message_id, hotel_name, to_phone, body } = await req.json();
    if (!message_id || !to_phone || !body) return json({ error: "Missing fields" }, 400);

    // Confirm the message row belongs to a hotel this user owns
    const { data: msg } = await supabase
      .from("hotel_guest_messages")
      .select("id,hotel_id")
      .eq("id", message_id)
      .maybeSingle();
    if (!msg) return json({ error: "Message not found" }, 404);

    const { data: hotel } = await supabase
      .from("partner_hotels")
      .select("manager_id")
      .eq("id", msg.hotel_id)
      .maybeSingle();
    if (!hotel || hotel.manager_id !== user.id) {
      return json({ error: "Forbidden" }, 403);
    }

    const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const token = Deno.env.get("TWILIO_AUTH_TOKEN");
    const from = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    if (!sid || !token || !from) {
      return json({ error: "WhatsApp not configured" }, 500);
    }

    const text =
      (hotel_name ? `*${hotel_name}*\n` : "") +
      body +
      `\n\n— Sent via JAAGA X Partners`;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${sid}:${token}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: `whatsapp:${formatPhone(to_phone)}`,
        From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
        Body: text,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("Twilio error:", data);
      return json({ error: data.message || "Failed to send WhatsApp" }, 500);
    }

    await supabase
      .from("hotel_guest_messages")
      .update({ sent_via_whatsapp: true, whatsapp_sid: data.sid })
      .eq("id", message_id);

    return json({ success: true, sid: data.sid });
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
