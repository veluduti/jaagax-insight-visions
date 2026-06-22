import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401, headers: cors });

    const { property_id, reason, preferred_date, preferred_time } = await req.json();
    if (!property_id || !reason?.trim()) {
      return new Response(JSON.stringify({ error: "property_id and reason are required" }), { status: 400, headers: cors });
    }

    const { data: prop } = await admin
      .from("properties")
      .select("id, submitted_by, assigned_agent_id, title, lifecycle_status")
      .eq("id", property_id).maybeSingle();
    if (!prop) return new Response(JSON.stringify({ error: "Property not found" }), { status: 404, headers: cors });
    if (prop.submitted_by !== user.id) return new Response(JSON.stringify({ error: "Not your property" }), { status: 403, headers: cors });
    if (prop.lifecycle_status !== "visit_scheduled") {
      return new Response(JSON.stringify({ error: `Cannot request reschedule from state ${prop.lifecycle_status}` }), { status: 400, headers: cors });
    }

    const now = new Date().toISOString();
    const { error: uErr } = await admin.from("properties").update({
      lifecycle_status: "visit_reschedule_requested",
      reschedule_reason: reason.trim(),
      reschedule_preferred_date: preferred_date || null,
      reschedule_preferred_time: preferred_time || null,
      reschedule_requested_at: now,
    }).eq("id", property_id);
    if (uErr) throw uErr;

    await admin.from("property_audit_log").insert({
      property_id, actor_id: user.id, action: "reschedule_requested",
      from_status: "visit_scheduled", to_status: "visit_reschedule_requested",
      metadata: { reason, preferred_date: preferred_date || null, preferred_time: preferred_time || null },
    });

    const notifs: any[] = [];
    let agentUserId: string | null = null;
    if (prop.assigned_agent_id) {
      const { data: a } = await admin.from("agents").select("user_id").eq("id", prop.assigned_agent_id).maybeSingle();
      agentUserId = (a as any)?.user_id ?? null;
    }
    const pref = preferred_date ? ` Owner suggests ${preferred_date}${preferred_time ? " at " + preferred_time : ""}.` : "";
    if (agentUserId) {
      notifs.push({
        user_id: agentUserId,
        title: "Owner requested a reschedule",
        message: `Owner of "${prop.title}" requested a reschedule. Reason: ${reason}.${pref}`,
        type: "alert", link: "/dashboard/agent",
      });
    }
    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      notifs.push(...admins.map((a) => ({
        user_id: a.user_id,
        title: "Reschedule requested by owner",
        message: `Owner requested a reschedule for "${prop.title}". Reason: ${reason}.`,
        type: "info", link: "/admin",
      })));
    }
    if (notifs.length) await admin.from("notifications").insert(notifs);

    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
