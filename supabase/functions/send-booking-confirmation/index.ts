import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  bookingId?: string;
  hotelName: string;
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  bookingType: string;
  action?: "created" | "updated" | "cancelled";
  agentId?: string;
  propertyId?: string;
}

function formatPhone(phone: string): string {
  let c = phone.replace(/[\s\-\(\)]/g, "").replace("whatsapp:", "");
  if (c.startsWith("+")) return c;
  if (c.startsWith("91") && c.length === 12) return "+" + c;
  if (c.length === 10 && /^\d+$/.test(c)) return "+91" + c;
  return c.startsWith("+") ? c : "+" + c;
}

async function sendWhatsApp(to: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
  if (!sid || !token || !from) {
    console.warn("Twilio not configured — skipping WhatsApp");
    return;
  }
  const fromNum = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;
  const toNum = `whatsapp:${formatPhone(to)}`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = btoa(`${sid}:${token}`);
  const params = new URLSearchParams({ To: toNum, From: fromNum, Body: body });
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const text = await r.text();
    console.log(`WhatsApp -> ${toNum} status=${r.status}`, text.slice(0, 200));
  } catch (e) {
    console.error("WhatsApp send failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const p: Payload = await req.json();
    const action = p.action || "created";
    const verb = action === "cancelled" ? "Cancelled" : action === "updated" ? "Updated" : "Confirmed";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Admin in-app notification
    const adminTitle = `🏨 Booking ${verb}: ${p.hotelName}`;
    const adminMsg = `${p.guestName} • ${p.checkIn} → ${p.checkOut} • ₹${p.totalAmount.toLocaleString()} • ${p.bookingType === "visit_stay" ? "Visit + Stay" : "Hotel Only"}${p.guestPhone ? ` • ${p.guestPhone}` : ""}`;

    await supabase.from("notifications").insert({
      recipient_role: "admin",
      type: `hotel_booking_${action}`,
      title: adminTitle,
      message: adminMsg,
      related_id: p.bookingId,
      metadata: p as any,
    });

    // 2. Notify assigned agent (if visit_stay)
    if (p.agentId && p.bookingType === "visit_stay") {
      const { data: agent } = await supabase
        .from("agents")
        .select("user_id, phone, name")
        .eq("id", p.agentId)
        .maybeSingle();
      if (agent?.user_id) {
        await supabase.from("notifications").insert({
          user_id: agent.user_id,
          recipient_role: "agent",
          type: `hotel_booking_${action}`,
          title: `🏨 Visit + Stay booked: ${p.hotelName}`,
          message: adminMsg,
          related_id: p.bookingId,
        });
      }
      if (agent?.phone) {
        await sendWhatsApp(
          agent.phone,
          `Hi ${agent.name || "Agent"}, ${p.guestName} booked a Visit+Stay at ${p.hotelName} (${p.checkIn} → ${p.checkOut}). Please prepare.`,
        );
      }
    }

    // 3. WhatsApp to buyer
    if (p.guestPhone) {
      const userBody =
        action === "cancelled"
          ? `Hi ${p.guestName}, your booking at ${p.hotelName} has been cancelled.`
          : action === "updated"
            ? `Hi ${p.guestName}, your booking at ${p.hotelName} was updated. New dates: ${p.checkIn} → ${p.checkOut}. Total: ₹${p.totalAmount.toLocaleString()}.`
            : `Hi ${p.guestName}! 🎉 Your booking at ${p.hotelName} is confirmed.\nCheck-in: ${p.checkIn}\nCheck-out: ${p.checkOut}\nTotal: ₹${p.totalAmount.toLocaleString()}\nBooking ID: ${p.bookingId?.slice(0, 8)}`;
      await sendWhatsApp(p.guestPhone, userBody);
    }

    // 4. Optional admin WhatsApp
    const adminPhone = Deno.env.get("ADMIN_WHATSAPP");
    if (adminPhone) {
      await sendWhatsApp(adminPhone, `📢 ${adminTitle}\n${adminMsg}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-booking-confirmation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
