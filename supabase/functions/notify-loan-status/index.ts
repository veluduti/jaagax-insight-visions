import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FROM_EMAIL = Deno.env.get("LIFECYCLE_FROM_EMAIL") || "notify@notify.jaagax.com";
const SENDER_DOMAIN = Deno.env.get("LIFECYCLE_SENDER_DOMAIN") || "notify.jaagax.com";
const APP_BASE = Deno.env.get("APP_BASE_URL") || "https://jaagax-insight-visions.lovable.app";

function shell(title: string, bodyHtml: string, cta?: { label: string; link: string }) {
  return `<!doctype html><html><body style="margin:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="font-size:13px;letter-spacing:2px;color:#10b981;font-weight:700;margin-bottom:24px;">JAAGA X</div>
    <h1 style="font-size:22px;margin:0 0 16px;font-weight:600;line-height:1.3;">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#334155;">${bodyHtml}</div>
    ${cta ? `<div style="margin-top:28px;"><a href="${cta.link}" style="background:#10b981;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600;font-size:14px;">${cta.label}</a></div>` : ""}
    <div style="margin-top:36px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
      You're receiving this because you applied for a loan on JAAGA X.
    </div>
  </div></body></html>`;
}

function build(status: string, app: any, lender: string) {
  const amount = `₹${Number(app.loan_amount || 0).toLocaleString("en-IN")}`;
  const link = `${APP_BASE}/dashboard/customer?view=loans`;
  const cta = { label: "Track application", link };
  switch (status) {
    case "accepted":
      return {
        subject: `${lender} accepted your loan request`,
        html: shell("Your loan request was accepted", `<p><strong>${lender}</strong> has accepted your ${amount} loan request and will begin processing it.</p>`, cta),
      };
    case "documents_pending":
      return {
        subject: `Documents required — ${lender}`,
        html: shell("Documents required", `<p><strong>${lender}</strong> needs additional documents to continue with your ${amount} loan application.</p>`, cta),
      };
    case "under_review":
      return {
        subject: `Your loan application is under review`,
        html: shell("Under review", `<p><strong>${lender}</strong> is now reviewing and verifying your ${amount} loan application.</p>`, cta),
      };
    case "approved":
      return {
        subject: `🎉 Loan approved by ${lender}`,
        html: shell("Your loan is approved", `<p>Great news — <strong>${lender}</strong> has approved your loan of ${amount}. Disbursement details will follow shortly.</p>`, cta),
      };
    case "rejected":
      return {
        subject: `Update on your loan application`,
        html: shell("Application not approved", `<p><strong>${lender}</strong> could not approve your ${amount} loan application.</p>${app.rejection_reason ? `<p style="color:#64748b;font-size:13px;">Reason: ${app.rejection_reason}</p>` : ""}`, cta),
      };
    case "disbursed":
      return {
        subject: `Loan disbursed by ${lender}`,
        html: shell("Your loan has been granted", `<p><strong>${lender}</strong> has disbursed ${app.disbursed_amount ? `₹${Number(app.disbursed_amount).toLocaleString("en-IN")}` : amount} for your home loan. Congratulations!</p>`, cta),
      };
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { application_id, status } = await req.json();
    if (!application_id || !status) {
      return new Response(JSON.stringify({ error: "application_id and status are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const { data: caller } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: app } = await admin
      .from("financial_loan_applications")
      .select("*")
      .eq("id", application_id)
      .maybeSingle();
    if (!app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: provider } = await admin
      .from("financial_providers")
      .select("id,user_id,company_name")
      .eq("id", app.provider_id)
      .maybeSingle();
    if (!provider || provider.user_id !== caller.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lender = provider.company_name || "Your lending partner";
    const content = build(status, app, lender);
    if (!content) return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // In-app notification for the buyer
    if (app.buyer_id) {
      await admin.from("notifications").insert({
        user_id: app.buyer_id,
        title: content.subject,
        message: `Your loan application with ${lender} is now "${status.replace("_", " ")}".`,
        type: "loan_status",
        link: "/dashboard/customer?view=loans",
      }).then(() => {}, () => {});
    }

    let to: string | null = app.buyer_email ?? null;
    if (!to && app.buyer_id) {
      const { data: u } = await admin.auth.admin.getUserById(app.buyer_id);
      to = u.user?.email ?? null;
    }
    if (!to) return new Response(JSON.stringify({ ok: true, emailed: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: suppressed } = await admin.from("suppressed_emails").select("email").eq("email", to).maybeSingle();
    if (suppressed) return new Response(JSON.stringify({ ok: true, emailed: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const messageId = crypto.randomUUID();
    const label = `loan-${status}`;

    let unsubscribeToken: string | null = null;
    try {
      const { data: existing } = await admin.from("email_unsubscribe_tokens").select("token").eq("email", to).maybeSingle();
      if (existing?.token) unsubscribeToken = existing.token as string;
      else {
        const token = crypto.randomUUID();
        const { error } = await admin.from("email_unsubscribe_tokens").insert({ email: to, token });
        if (!error) unsubscribeToken = token;
      }
    } catch { /* best effort */ }

    await admin.from("email_send_log").insert({
      message_id: messageId, template_name: label, recipient_email: to, status: "pending",
    });

    const { error: qErr } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to,
        from: FROM_EMAIL,
        sender_domain: SENDER_DOMAIN,
        subject: content.subject,
        html: content.html,
        text: content.subject,
        purpose: "transactional",
        label,
        idempotency_key: `${label}:${application_id}`,
        unsubscribe_token: unsubscribeToken,
        queued_at: new Date().toISOString(),
      },
    });

    if (qErr) {
      await admin.from("email_send_log").insert({
        message_id: messageId, template_name: label, recipient_email: to,
        status: "failed", error_message: qErr.message,
      });
    }

    return new Response(JSON.stringify({ ok: true, emailed: !qErr }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-loan-status", (e as Error).message);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
