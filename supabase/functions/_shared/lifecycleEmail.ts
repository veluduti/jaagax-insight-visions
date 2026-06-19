// Shared helper to enqueue branded lifecycle emails to the Lovable email queue.
// Falls back silently if the user has no email or the queue insert fails — notifications
// row is the source-of-truth, email is best-effort.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const FROM_EMAIL = Deno.env.get("LIFECYCLE_FROM_EMAIL") || "notify@notify.jaagax.com";
const SENDER_DOMAIN = Deno.env.get("LIFECYCLE_SENDER_DOMAIN") || "notify.jaagax.com";
const APP_BASE = Deno.env.get("APP_BASE_URL") || "https://jaagax-insight-visions.lovable.app";

type Admin = ReturnType<typeof createClient>;

export type LifecycleEvent =
  | "agent_assigned"
  | "agent_accepted"
  | "agent_rejected"
  | "verification_submitted"
  | "live_published"
  | "rejected"
  | "expiry_warning"
  | "expired"
  | "new_lead";

interface Ctx {
  propertyTitle: string;
  propertyId: string;
  ctaLink?: string;
  extra?: Record<string, string | number | null | undefined>;
}

function shell(title: string, bodyHtml: string, cta?: { label: string; link: string }) {
  return `<!doctype html><html><body style="margin:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="font-size:13px;letter-spacing:2px;color:#10b981;font-weight:600;margin-bottom:24px;">JAAGA X</div>
    <h1 style="font-size:22px;margin:0 0 16px;color:#ffffff;font-weight:600;line-height:1.3;">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#cbd5e1;">${bodyHtml}</div>
    ${cta ? `<div style="margin-top:28px;"><a href="${cta.link}" style="background:linear-gradient(90deg,#10b981,#3b82f6);color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600;font-size:14px;">${cta.label}</a></div>` : ""}
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid #1e293b;font-size:12px;color:#64748b;">
      You're receiving this because you have an active listing on JAAGA X.
    </div>
  </div></body></html>`;
}

function buildEmail(event: LifecycleEvent, ctx: Ctx): { subject: string; html: string; text: string; label: string } {
  const link = ctx.ctaLink ? (ctx.ctaLink.startsWith("http") ? ctx.ctaLink : `${APP_BASE}${ctx.ctaLink}`) : `${APP_BASE}/property/${ctx.propertyId}`;
  switch (event) {
    case "agent_assigned":
      return {
        subject: `New verification task: ${ctx.propertyTitle}`,
        html: shell("You've been assigned a verification", `<p>Admin has assigned you the verification task for <strong>${ctx.propertyTitle}</strong>. Please accept or reject within 24 hours.</p>`, { label: "Open task", link }),
        text: `You've been assigned verification for "${ctx.propertyTitle}". Accept or reject in your dashboard.`,
        label: "lifecycle-agent-assigned",
      };
    case "agent_accepted":
      return {
        subject: `Editing locked — agent accepted "${ctx.propertyTitle}"`,
        html: shell("Agent accepted your listing", `<p>An agent has accepted the verification task for <strong>${ctx.propertyTitle}</strong>. Listing edits are now locked until verification completes.</p>`, { label: "Track progress", link }),
        text: `Agent accepted verification for "${ctx.propertyTitle}". Editing is now locked.`,
        label: "lifecycle-agent-accepted",
      };
    case "agent_rejected":
      return {
        subject: `Reassignment in progress — "${ctx.propertyTitle}"`,
        html: shell("We're reassigning your verification", `<p>The assigned agent could not pick up the task. Admin is selecting a new agent for <strong>${ctx.propertyTitle}</strong>.</p>${ctx.extra?.reason ? `<p style="color:#94a3b8;font-size:13px;">Reason: ${ctx.extra.reason}</p>` : ""}`, { label: "Open dashboard", link }),
        text: `Agent unavailable — reassigning verification for "${ctx.propertyTitle}".`,
        label: "lifecycle-agent-rejected",
      };
    case "verification_submitted":
      return {
        subject: `Verification submitted: ${ctx.propertyTitle}`,
        html: shell("Verification report submitted", `<p>The agent has submitted the verification report for <strong>${ctx.propertyTitle}</strong>. Admin will review it shortly.</p>`, { label: "View status", link }),
        text: `Verification submitted for "${ctx.propertyTitle}". Pending admin approval.`,
        label: "lifecycle-verification-submitted",
      };
    case "live_published":
      return {
        subject: `🎉 Your listing is live: ${ctx.propertyTitle}`,
        html: shell("Your listing is live!", `<p><strong>${ctx.propertyTitle}</strong> is now visible to buyers on JAAGA X.${ctx.extra?.verified ? " It carries the <strong>Verified</strong> badge." : ""}</p>`, { label: "View listing", link }),
        text: `"${ctx.propertyTitle}" is live on JAAGA X.`,
        label: "lifecycle-live",
      };
    case "rejected":
      return {
        subject: `Listing not approved: ${ctx.propertyTitle}`,
        html: shell("Listing not approved", `<p>Unfortunately <strong>${ctx.propertyTitle}</strong> was not approved.</p>${ctx.extra?.reason ? `<p style="color:#94a3b8;font-size:13px;">Reason: ${ctx.extra.reason}</p>` : ""}<p>You can edit the details and resubmit.</p>`, { label: "Edit listing", link }),
        text: `"${ctx.propertyTitle}" was not approved.`,
        label: "lifecycle-rejected",
      };
    case "expiry_warning":
      return {
        subject: `Listing expires in ${ctx.extra?.days} day${(ctx.extra?.days as number) > 1 ? "s" : ""}: ${ctx.propertyTitle}`,
        html: shell(`Renew to stay visible`, `<p><strong>${ctx.propertyTitle}</strong> expires in <strong>${ctx.extra?.days} day${(ctx.extra?.days as number) > 1 ? "s" : ""}</strong>. Renew now to keep it live without re-verification.</p>`, { label: "Renew now", link: `${APP_BASE}/dashboard/seller` }),
        text: `Renew "${ctx.propertyTitle}" — expires in ${ctx.extra?.days} day(s).`,
        label: "lifecycle-expiry-warning",
      };
    case "expired":
      return {
        subject: `Listing expired: ${ctx.propertyTitle}`,
        html: shell("Listing expired", `<p><strong>${ctx.propertyTitle}</strong> has expired and is no longer visible to buyers. Renew anytime to relist.</p>`, { label: "Renew listing", link: `${APP_BASE}/dashboard/seller` }),
        text: `"${ctx.propertyTitle}" has expired.`,
        label: "lifecycle-expired",
      };
    case "new_lead":
      return {
        subject: `New ${ctx.extra?.source || "enquiry"} lead: ${ctx.propertyTitle}`,
        html: shell("New buyer lead", `<p>A buyer reached out about <strong>${ctx.propertyTitle}</strong> via <strong>${ctx.extra?.source || "enquiry"}</strong>.${ctx.extra?.lead_name ? ` Name: <strong>${ctx.extra.lead_name}</strong>.` : ""}${ctx.extra?.lead_phone ? ` Phone: <strong>${ctx.extra.lead_phone}</strong>.` : ""}</p>`, { label: "Open dashboard", link }),
        text: `New ${ctx.extra?.source || "enquiry"} lead for "${ctx.propertyTitle}".`,
        label: "lifecycle-new-lead",
      };
  }
}

async function ensureUnsubscribeToken(admin: Admin, email: string): Promise<string | null> {
  try {
    const { data: existing } = await admin
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", email)
      .maybeSingle();
    if (existing?.token) return existing.token as string;
    const token = crypto.randomUUID();
    const { error } = await admin
      .from("email_unsubscribe_tokens")
      .insert({ email, token });
    if (error) return null;
    return token;
  } catch {
    return null;
  }
}

async function emailForUser(admin: Admin, userId: string): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

export async function sendLifecycleEmail(
  admin: Admin,
  recipientUserId: string | null,
  event: LifecycleEvent,
  ctx: Ctx,
): Promise<void> {
  if (!recipientUserId) return;
  try {
    const to = await emailForUser(admin, recipientUserId);
    if (!to) return;

    // Suppression check
    const { data: suppressed } = await admin
      .from("suppressed_emails")
      .select("email")
      .eq("email", to)
      .maybeSingle();
    if (suppressed) return;

    const { subject, html, text, label } = buildEmail(event, ctx);
    const messageId = crypto.randomUUID();
    const unsubscribeToken = await ensureUnsubscribeToken(admin, to);

    await admin.from("email_send_log").insert({
      message_id: messageId,
      template_name: label,
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
        label,
        idempotency_key: `${label}:${ctx.propertyId}:${recipientUserId}:${ctx.extra?.bucket_key ?? messageId}`,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    });

    if (error) {
      await admin.from("email_send_log").insert({
        message_id: messageId,
        template_name: label,
        recipient_email: to,
        status: "failed",
        error_message: error.message ?? "enqueue failed",
      });
    }
  } catch (e) {
    console.error("sendLifecycleEmail error", event, (e as Error).message);
  }
}
