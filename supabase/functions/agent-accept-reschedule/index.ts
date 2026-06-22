// Agent accepts the owner's preferred reschedule date/time -> moves directly to visit_confirmed.
// To propose a new schedule instead, call agent-schedule-visit (allowed from visit_reschedule_requested).
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

    const { property_id } = await req.json();
    if (!property_id) return new Response(JSON.stringify({ error: "property_id required" }), { status: 400, headers: cors });

    const { data: prop } = await admin
      .from("properties")
      .select("id, assigned_agent_id, submitted_by, title, lifecycle_status, reschedule_preferred_date, reschedule_preferred_time")
      .eq("id", property_id).maybeSingle();
    if (!prop) return new Response(JSON.stringify({ error: "Property not found" }), { status: 404, headers: cors });

    let ownerUserId: string | null = null;
    if (prop.assigned_agent_id === user.id) ownerUserId = user.id;
    else if (prop.assigned_agent_id) {
      const { data: a } = await admin.from("agents").select("user_id").eq("id", prop.assigned_agent_id).maybeSingle();
      ownerUserId = (a as any)?.user_id ?? null;
    }
    if (ownerUserId !== user.id) return new Response(JSON.stringify({ error: "Not your assignment" }), { status: 403, headers: cors });

    if (prop.lifecycle_status !== "visit_reschedule_requested") {
      return new Response(JSON.stringify({ error: `Cannot accept from state ${prop.lifecycle_status}` }), { status: 400, headers: cors });
    }
    if (!prop.reschedule_preferred_date) {
      return new Response(JSON.stringify({ error: "Owner did not provide a preferred date — propose a new schedule instead." }), { status: 400, headers: cors });
    }

    const now = new Date().toISOString();
    const { error: uErr } = await admin.from("properties").update({
      lifecycle_status: "visit_confirmed",
      visit_scheduled_date: prop.reschedule_preferred_date,
      visit_scheduled_time: prop.reschedule_preferred_time || "10:00",
      visit_scheduled_by: user.id,
      visit_scheduled_at: now,
      visit_confirmed_at: now,
      reschedule_reason: null,
      reschedule_preferred_date: null,
      reschedule_preferred_time: null,
      reschedule_requested_at: null,
    }).eq("id", property_id);
    if (uErr) throw uErr;

    await admin.from("property_audit_log").insert({
      property_id, actor_id: user.id, action: "reschedule_accepted_by_agent",
      from_status: "visit_reschedule_requested", to_status: "visit_confirmed",
      metadata: { visit_date: prop.reschedule_preferred_date, visit_time: prop.reschedule_preferred_time },
    });

    const notifs: any[] = [];
    if (prop.submitted_by) {
      notifs.push({
        user_id: prop.submitted_by,
        title: "Visit confirmed at your preferred time ✅",
        message: `Agent accepted your reschedule for "${prop.title}". Visit confirmed for ${prop.reschedule_preferred_date}${prop.reschedule_preferred_time ? " at " + prop.reschedule_preferred_time : ""}.`,
        type: "success", link: "/dashboard/seller",
      });
    }
    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      notifs.push(...admins.map((a) => ({
        user_id: a.user_id,
        title: "Visit confirmed (reschedule accepted)",
        message: `Agent accepted owner's reschedule for "${prop.title}".`,
        type: "info", link: "/admin",
      })));
    }
    if (notifs.length) await admin.from("notifications").insert(notifs);

    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
