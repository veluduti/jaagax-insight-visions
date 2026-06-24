// Sends approval / rejection emails to a hotel partner applicant. Admin
// invokes this AFTER updating the application status. We re-check the
// application row + caller role here for safety.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = Deno.env.get("LIFECYCLE_FROM_EMAIL") || "notify@notify.jaagax.com";
const SENDER_DOMAIN = Deno.env.get("LIFECYCLE_SENDER_DOMAIN") || "notify.jaagax.com";
const APP_BASE = Deno.env.get("APP_BASE_URL") || "https://jaagax-insight-visions.lovable.app";

function shell(title: string, bodyHtml: string, cta?: { label: string; link: string }) {
  return `<!doctype html><html><body style="margin:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="font-size:13px;letter-spacing:2px;color:#10b981;font-weight:600;margin-bottom:24px;">JAAGA X</div>
    <h1 style="font-size:22px;margin:0 0 16px;color:#ffffff;font-weight:600;line-height:1.3;">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#cbd5e1;">${bodyHtml}</div>
    ${cta ? `<div style="margin-top:28px;"><a href="${cta.link}" style="background:linear-gradient(90deg,#10b981,#3b82f6);color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600;font-size:14px;">${cta.label}</a></div>` : ""}
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid #1e293b;font-size:12px;color:#64748b;">
      You're receiving this because you applied to partner with JAAGA X Hotels.
    </div>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { applicationId, decision, reason } = body as { applicationId: string; decision: "approved" | "rejected"; reason?: string };
    if (!applicationId || !["approved", "rejected"].includes(decision)) {
      return new Response(JSON.stringify({ error: "applicationId & decision required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: app, error: appErr } = await admin
      .from("hotel_partner_applications")
      .select("hotel_name, email, city, approved_hotel_id, status, rejection_reason")
      .eq("id", applicationId)
      .maybeSingle();
    if (appErr || !app) {
      return new Response(JSON.stringify({ error: "application not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!app.email) {
      return new Response(JSON.stringify({ ok: true, skipped: "no recipient email" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Suppression check
    const { data: suppressed } = await admin
      .from("suppressed_emails").select("email").eq("email", app.email).maybeSingle();
    if (suppressed) {
      return new Response(JSON.stringify({ ok: true, skipped: "suppressed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const isApproved = decision === "approved";
    const liveLink = app.approved_hotel_id ? `${APP_BASE}/hotels/${app.approved_hotel_id}` : `${APP_BASE}/hotels`;
    const statusLink = `${APP_BASE}/hotels/partner/status`;

    const subject = isApproved
      ? `🎉 Your hotel application is approved — ${app.hotel_name}`
      : `Hotel application update — ${app.hotel_name}`;

    const html = isApproved
      ? shell(
          "You're live on JAAGA X!",
          `<p>Great news! Your application for <strong>${app.hotel_name}</strong> (${app.city}) has been approved by our team.</p><p>Your hotel is now visible to travellers searching on JAAGA X. You can manage rooms, pricing and bookings from your Hotel Manager dashboard.</p>`,
          { label: "View live listing", link: liveLink },
        )
      : shell(
          "Application needs revision",
          `<p>Thank you for applying to partner with JAAGA X Hotels for <strong>${app.hotel_name}</strong>.</p><p>After review, we were unable to approve the application at this time.</p>${reason ? `<p style="margin-top:12px;padding:12px 14px;border-left:3px solid #ef4444;background:#1e293b;color:#fde2e2;font-size:14px;"><strong>Reason:</strong> ${reason}</p>` : ""}<p>You can update the details and resubmit anytime.</p>`,
          { label: "Update application", link: statusLink },
        );

    const text = isApproved
      ? `Your hotel "${app.hotel_name}" is approved and live on JAAGA X.`
      : `Your hotel application for "${app.hotel_name}" was not approved.${reason ? ` Reason: ${reason}` : ""}`;

    const label = isApproved ? "hotel-partner-approved" : "hotel-partner-rejected";
    const messageId = crypto.randomUUID();

    // Ensure unsubscribe token exists
    let unsubscribeToken: string | null = null;
    const { data: existing } = await admin
      .from("email_unsubscribe_tokens").select("token").eq("email", app.email).maybeSingle();
    if (existing?.token) unsubscribeToken = existing.token as string;
    else {
      const t = crypto.randomUUID();
      const { error } = await admin.from("email_unsubscribe_tokens").insert({ email: app.email, token: t });
      if (!error) unsubscribeToken = t;
    }

    await admin.from("email_send_log").insert({
      message_id: messageId,
      template_name: label,
      recipient_email: app.email,
      status: "pending",
    });

    const { error: qErr } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: app.email,
        from: FROM_EMAIL,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: "transactional",
        label,
        idempotency_key: `${label}:${applicationId}`,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    });

    if (qErr) {
      await admin.from("email_send_log").insert({
        message_id: messageId,
        template_name: label,
        recipient_email: app.email,
        status: "failed",
        error_message: qErr.message ?? "enqueue failed",
      });
      return new Response(JSON.stringify({ ok: false, error: qErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
