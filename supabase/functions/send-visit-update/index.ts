import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatPhoneNumber(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  cleaned = cleaned.replace("whatsapp:", "");

  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("91") && cleaned.length === 12) return "+" + cleaned;
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) return "+91" + cleaned;
  return cleaned.startsWith("+") ? cleaned : "+" + cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bookingId, templateType } = await req.json();
    console.log("Processing notification:", { bookingId, templateType });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Booking + property + agent
    const { data: booking, error: bookingError } = await supabase
      .from("visit_bookings")
      .select(
        `
        *,
        properties (id, title, locality, city, builder_id, submitted_by),
        agents (id, name, user_id, phone)
      `,
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking fetch error:", bookingError);
      throw new Error("Booking not found");
    }

    const propertyName = booking.properties?.title || "Property";
    const locality = booking.properties?.locality || "";
    const city = booking.properties?.city || "";
    const visitDate = new Date(booking.visit_date).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const visitTime = booking.visit_time;
    const userName = booking.buyer_name || "Guest";
    const userPhone = booking.buyer_phone ? formatPhoneNumber(booking.buyer_phone) : "";
    const agentName = booking.agents?.name || "Agent";
    const agentPhone = booking.agents?.phone ? formatPhoneNumber(booking.agents.phone) : "";

    // Builder: phone comes from builders table (public.users has no phone column)
    const builderId: number | null = booking.builder_id ?? booking.properties?.builder_id ?? null;
    let builderName = "Builder";
    let builderPhone = "";
    let builderUserId: string | null = booking.properties?.submitted_by ?? null;

    if (builderId) {
      const { data: builderRow, error: builderErr } = await supabase
        .from("builders")
        .select("name, phone")
        .eq("id", builderId)
        .maybeSingle();

      if (builderErr) console.warn("Builder lookup error:", builderErr);
      builderName = builderRow?.name || builderName;
      builderPhone = builderRow?.phone ? formatPhoneNumber(builderRow.phone) : "";

      // If submitted_by missing on property, fallback: pick any property with this builder_id that has submitted_by
      if (!builderUserId) {
        const { data: anyProp, error: anyPropErr } = await supabase
          .from("properties")
          .select("submitted_by")
          .eq("builder_id", builderId)
          .not("submitted_by", "is", null)
          .limit(1)
          .maybeSingle();
        if (anyPropErr) console.warn("Builder user fallback lookup error:", anyPropErr);
        builderUserId = anyProp?.submitted_by ?? null;
      }
    }

    // Message + recipients
    let message = "";
    const recipients: { phone: string; role: "user" | "builder" | "agent" }[] = [];

    switch (templateType) {
      case "user_requested":
        message = `🏡 *Visit Request Received* - JaagaX\n\nHi ${userName}!\n\nYour visit request for *${propertyName}* in ${locality}, ${city} has been received.\n\n📅 Date: ${visitDate}\n⏰ Time: ${visitTime}\n\n⏳ Status: Pending builder approval\n🔐 OTP: ${booking.otp_code}\n\nTrack live: https://jaagax.com/visit/live/${bookingId}`;
        if (userPhone) recipients.push({ phone: userPhone, role: "user" });
        break;

      case "visit_pending_approval":
        message = `⏳ *Visit Pending Approval* - JaagaX\n\nHi ${userName}!\n\nYour visit request for *${propertyName}* in ${locality}, ${city} is pending builder approval.\n\n📅 Date: ${visitDate}\n⏰ Time: ${visitTime}\n👤 Agent: ${agentName}\n\nWe'll notify you once approved!\n\nTrack status: https://jaagax.com/dashboard/buyer`;
        if (userPhone) recipients.push({ phone: userPhone, role: "user" });
        break;

      case "builder_approval_needed":
      case "builder_pending":
        message = `🔔 *New Visit Request* - JaagaX\n\nHi ${builderName}!\n\nA new visit request needs your approval:\n\n🏠 Property: *${propertyName}*\n📍 Location: ${locality}, ${city}\n👤 Visitor: ${userName}\n📞 Phone: ${userPhone}\n📅 Date: ${visitDate}\n⏰ Time: ${visitTime}\n👤 Agent: ${agentName}\n\n👉 Approve/Reject: https://jaagax.com/builder-visits`;
        if (builderPhone) recipients.push({ phone: builderPhone, role: "builder" });
        break;

      case "visit_confirmed":
        message = `✅ *Visit Confirmed!* - JaagaX\n\nHi ${userName}!\n\nYour visit to *${propertyName}* is confirmed.\n\n📅 ${visitDate} at ${visitTime}\n👤 Agent: ${agentName}\n📍 ${locality}, ${city}\n🔐 OTP: ${booking.otp_code}\n🎫 Code: ${booking.verification_code}\n\nTrack live: https://jaagax.com/visit/live/${bookingId}`;
        if (userPhone) recipients.push({ phone: userPhone, role: "user" });
        break;

      case "builder_approved":
        message = `✅ *Visit Approved!* - JaagaX\n\nHi ${userName}!\n\nGreat news! Your visit to *${propertyName}* has been approved by the builder.\n\n📅 ${visitDate} at ${visitTime}\n👤 Agent: ${agentName}\n📍 ${locality}, ${city}\n🔐 OTP: ${booking.otp_code}\n🎫 Code: ${booking.verification_code}\n\nTrack live: https://jaagax.com/visit/live/${bookingId}`;
        if (userPhone) recipients.push({ phone: userPhone, role: "user" });
        if (agentPhone) recipients.push({ phone: agentPhone, role: "agent" });
        break;

      case "builder_rejected":
        message = `❌ *Visit Request Declined* - JaagaX\n\nHi ${userName},\n\nYour visit request for *${propertyName}* was declined by the builder.\n\n${booking.rejection_reason ? `📋 Reason: ${booking.rejection_reason}\n\n` : ""}Please try booking another slot or explore other properties.`;
        if (userPhone) recipients.push({ phone: userPhone, role: "user" });
        break;

      case "agent_new_assignment":
        message = `🎯 *New Visit Assigned* - JaagaX\n\nHi ${agentName}!\n\nNew visit assigned to you:\n\n🏠 *${propertyName}*\n📍 ${locality}, ${city}\n👤 Client: ${userName}\n📞 Client: ${userPhone}\n📅 ${visitDate} at ${visitTime}\n\n⏰ Please confirm within 2 minutes!\n\n👉 Dashboard: https://jaagax.com/dashboard/agent/visits`;
        if (agentPhone) recipients.push({ phone: agentPhone, role: "agent" });
        break;

      case "visit_started":
        message = `🚗 *Agent En Route* - JaagaX\n\nHi ${userName}!\n\n${agentName} has started your visit and is on the way to *${propertyName}*.\n\n📍 Track live location: https://jaagax.com/visit/live/${bookingId}\n🔐 OTP: ${booking.otp_code}`;
        if (userPhone) recipients.push({ phone: userPhone, role: "user" });
        break;

      case "visit_completed":
        message = `🎉 *Visit Completed* - JaagaX\n\nHi ${userName}!\n\nYour visit to *${propertyName}* is complete.\n\n⭐ Please rate your experience: https://jaagax.com/visit/summary/${bookingId}\n\nThank you for choosing JaagaX!`;
        if (userPhone) recipients.push({ phone: userPhone, role: "user" });
        break;

      case "visit_reminder":
        message = `⏰ *Visit Reminder* - JaagaX\n\nHi ${userName}!\n\nReminder: Your visit to *${propertyName}* is coming up.\n\n📅 ${visitDate} at ${visitTime}\n👤 Agent: ${agentName}\n📍 ${locality}, ${city}\n🔐 OTP: ${booking.otp_code}\n\nSee you there!`;
        if (userPhone) recipients.push({ phone: userPhone, role: "user" });
        if (agentPhone) recipients.push({ phone: agentPhone, role: "agent" });
        break;

      default:
        message = `📬 *JaagaX Update*\n\nVisit status updated for ${propertyName}. Check the app for details.`;
        if (userPhone) recipients.push({ phone: userPhone, role: "user" });
    }

    console.log("Recipients:", recipients);
    if (templateType === "builder_pending" && !builderPhone) {
      console.warn(
        `Builder WhatsApp not sent: builders.phone is missing for builder_id=${builderId}. Builder will still see in-app notifications in Visit Approvals.`,
      );
    }

    // Send WhatsApp
    const results: any[] = [];
    for (const r of recipients) {
      try {
        const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke(
          "send-whatsapp",
          {
            body: {
              to: r.phone,
              message,
              bookingId,
            },
          },
        );

        await supabase.from("whatsapp_logs").insert({
          booking_id: bookingId,
          recipient: r.phone,
          message,
          template_type: templateType,
          status: whatsappError ? "failed" : "sent",
          error_message: whatsappError?.message,
          twilio_sid: whatsappResult?.sid,
        });

        results.push({ role: r.role, phone: r.phone, success: !whatsappError, sid: whatsappResult?.sid });
      } catch (err: any) {
        console.error(`Failed to send WhatsApp to ${r.phone}:`, err);
        results.push({ role: r.role, phone: r.phone, success: false, error: err?.message });
      }
    }

    // In-app notifications
    const title = `Visit ${String(templateType).replace(/_/g, " ")}`;
    const oneLine = message.replace(/\*/g, "").split("\n")[0];

    const shouldNotifyUser = [
      "user_requested",
      "visit_pending_approval",
      "visit_confirmed",
      "builder_approved",
      "builder_rejected",
      "visit_reminder",
      "visit_started",
      "visit_completed",
      "visit_cancelled",
      "agent_assigned",
    ].includes(templateType);

    if (shouldNotifyUser && booking.user_id) {
      await supabase.functions
        .invoke("create-notification", {
          body: {
            userId: booking.user_id,
            type: "visit_update",
            title,
            message: oneLine,
            metadata: { bookingId, templateType },
          },
        })
        .catch((err) => console.error("User in-app notification error:", err));
    }

    if (templateType === "builder_pending" && builderUserId) {
      await supabase.functions
        .invoke("create-notification", {
          body: {
            userId: builderUserId,
            type: "visit_request",
            title: "New Visit Request",
            message: `New visit request for ${propertyName} on ${visitDate}`,
            metadata: { bookingId, templateType, propertyId: booking.property_id },
          },
        })
        .catch((err) => console.error("Builder in-app notification error:", err));
    }

    if (
      (templateType === "agent_new_assignment" || templateType === "builder_approved") &&
      booking.agents?.user_id
    ) {
      await supabase.functions
        .invoke("create-notification", {
          body: {
            userId: booking.agents.user_id,
            type: "visit_assignment",
            title: "Visit Assigned",
            message: `You have a visit to ${propertyName} on ${visitDate}`,
            metadata: { bookingId, templateType, propertyId: booking.property_id },
          },
        })
        .catch((err) => console.error("Agent in-app notification error:", err));
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-visit-update function:", error);
    return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
