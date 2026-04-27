import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatPhone(phone: string): string {
  let c = phone.replace(/[\s\-\(\)]/g, "").replace("whatsapp:", "");
  if (c.startsWith("+")) return c;
  if (c.startsWith("91") && c.length === 12) return "+" + c;
  if (c.length === 10 && /^\d+$/.test(c)) return "+91" + c;
  return c.startsWith("+") ? c : "+" + c;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify caller is admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden — admins only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { targetUserId } = await req.json();
    if (!targetUserId || typeof targetUserId !== "string") {
      return new Response(JSON.stringify({ error: "targetUserId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (targetUserId === user.id) {
      return new Response(JSON.stringify({ error: "Cannot delete your own account" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch contact info before deletion (for SMS)
    const { data: signup } = await admin
      .from("signup_requests")
      .select("phone, email, full_name")
      .eq("user_id", targetUserId)
      .maybeSingle();

    const { data: authUser } = await admin.auth.admin.getUserById(targetUserId);
    const phone = signup?.phone || (authUser?.user as any)?.phone || null;
    const email = signup?.email || authUser?.user?.email || null;
    const name = signup?.full_name || "User";

    // Clean dependent rows (best-effort)
    await admin.from("user_roles").delete().eq("user_id", targetUserId);
    await admin.from("profiles").delete().eq("user_id", targetUserId);
    await admin.from("signup_requests").delete().eq("user_id", targetUserId);
    await admin.from("user_settings").delete().eq("user_id", targetUserId);

    // Delete auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(targetUserId);
    if (delErr) {
      console.error("auth delete error:", delErr);
      return new Response(JSON.stringify({ error: "Failed to delete user", details: delErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Send SMS notification (best-effort)
    let smsSent = false;
    if (phone) {
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const token = Deno.env.get("TWILIO_AUTH_TOKEN");
      const from = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
      if (sid && token && from) {
        try {
          const to = formatPhone(phone);
          const body = `Hi ${name}, your JAAGA X account has been deleted by an administrator. If this seems wrong, please contact support.`;
          // Try plain SMS first; from must be SMS-capable. Fallback: WhatsApp.
          const fromSms = from.replace("whatsapp:", "");
          const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
          const auth = btoa(`${sid}:${token}`);
          const r = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ To: to, From: fromSms, Body: body }),
          });
          smsSent = r.ok;
          if (!r.ok) console.error("SMS send failed", await r.text());
        } catch (e) {
          console.error("sms error", e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, smsSent, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-delete-user error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
