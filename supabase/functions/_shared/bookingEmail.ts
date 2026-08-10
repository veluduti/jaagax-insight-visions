// Sends the guest a branded hotel booking confirmation email through the
// Lovable email queue (same pipeline as lifecycle emails).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FROM_EMAIL = Deno.env.get("LIFECYCLE_FROM_EMAIL") || "notify@notify.jaagax.com";
const SENDER_DOMAIN = Deno.env.get("LIFECYCLE_SENDER_DOMAIN") || "notify.jaagax.com";
const APP_BASE = Deno.env.get("APP_BASE_URL") || "https://jaagax.com";

type Admin = ReturnType<typeof createClient>;

const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:6px 0;font-size:14px;color:#94a3b8;">${label}</td>
    <td style="padding:6px 0;font-size:14px;color:#e2e8f0;text-align:right;font-weight:600;">${value}</td>
  </tr>`;
}

export async function sendBookingConfirmationEmail(admin: Admin, booking: any): Promise<void> {
  const to = booking?.guest_email;
  if (!to) return;

  try {
    const { data: suppressed } = await admin
      .from("suppressed_emails").select("email").eq("email", to).maybeSingle();
    if (suppressed) return;

    const link = `${APP_BASE}/hotels/booking/${booking.id}/confirmed`;
    const subject = `Booking confirmed · ${booking.hotel_name || "Your stay"} (${booking.booking_reference || ""})`.trim();

    const html = `<!doctype html><html><body style="margin:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;">
      <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
        <div style="font-size:13px;letter-spacing:2px;color:#10b981;font-weight:600;margin-bottom:24px;">JAAGA X</div>
        <h1 style="font-size:22px;margin:0 0 8px;color:#fff;font-weight:600;">Your booking is confirmed 🎉</h1>
        <p style="font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 20px;">
          Hi ${booking.guest_name || "there"}, your payment was received and your stay at
          <strong>${booking.hotel_name || "the hotel"}</strong> is confirmed.
        </p>
        <table style="width:100%;border-collapse:collapse;border-top:1px solid #1e293b;border-bottom:1px solid #1e293b;">
          ${row("Booking reference", booking.booking_reference || booking.id.slice(0, 8))}
          ${row("Check-in", String(booking.check_in))}
          ${row("Check-out", String(booking.check_out))}
          ${row("Room", `${booking.room_type || "Room"} × ${booking.num_rooms || 1}`)}
          ${row("Guests", String(booking.num_guests ?? "—"))}
          ${row("Amount paid", inr(booking.total_amount))}
          ${row("Payment status", "Paid")}
        </table>
        <div style="margin-top:28px;">
          <a href="${link}" style="background:linear-gradient(90deg,#10b981,#3b82f6);color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600;font-size:14px;">View booking</a>
        </div>
        <div style="margin-top:36px;padding-top:20px;border-top:1px solid #1e293b;font-size:12px;color:#64748b;">
          Need help? Just reply to this email and our team will assist you.
        </div>
      </div></body></html>`;

    const text = `Booking confirmed at ${booking.hotel_name || "the hotel"}.
Reference: ${booking.booking_reference || booking.id}
Check-in: ${booking.check_in} | Check-out: ${booking.check_out}
Rooms: ${booking.num_rooms || 1} (${booking.room_type || "Room"})
Amount paid: ${inr(booking.total_amount)}
View: ${link}`;

    const messageId = crypto.randomUUID();

    let unsubscribeToken: string | null = null;
    try {
      const { data: existing } = await admin
        .from("email_unsubscribe_tokens").select("token").eq("email", to).maybeSingle();
      if (existing?.token) unsubscribeToken = existing.token as string;
      else {
        const t = crypto.randomUUID();
        const { error } = await admin.from("email_unsubscribe_tokens").insert({ email: to, token: t });
        if (!error) unsubscribeToken = t;
      }
    } catch { /* optional */ }

    await admin.from("email_send_log").insert({
      message_id: messageId,
      template_name: "hotel-booking-confirmation",
      recipient_email: to,
      status: "pending",
    });

    const { error } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to,
        from: FROM_EMAIL,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: "transactional",
        label: "hotel-booking-confirmation",
        idempotency_key: `hotel-booking-confirm:${booking.id}`,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    });

    if (error) {
      await admin.from("email_send_log").insert({
        message_id: messageId,
        template_name: "hotel-booking-confirmation",
        recipient_email: to,
        status: "failed",
        error_message: error.message ?? "enqueue failed",
      });
    }
  } catch (e) {
    console.error("sendBookingConfirmationEmail error", (e as Error).message);
  }
}
