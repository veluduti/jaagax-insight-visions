import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401, headers: cors });

    const { property_id, visit_date, visit_time, notes } = await req.json();
    if (!property_id || !visit_date || !visit_time) {
      return new Response(JSON.stringify({ error: "property_id, visit_date, visit_time required" }), { status: 400, headers: cors });
    }

    const { data: prop } = await admin
      .from("properties")
      .select("id, assigned_agent_id, submitted_by, title, lifecycle_status")
      .eq("id", property_id)
      .maybeSingle();
    if (!prop) return new Response(JSON.stringify({ error: "Property not found" }), { status: 404, headers: cors });

    // Resolve agent owner user id
    let ownerUserId: string | null = null;
    if (prop.assigned_agent_id === user.id) ownerUserId = user.id;
    else if (prop.assigned_agent_id) {
      const { data: a } = await admin.from("agents").select("user_id").eq("id", prop.assigned_agent_id).maybeSingle();
      ownerUserId = (a as any)?.user_id ?? null;
    }
    if (ownerUserId !== user.id) {
      return new Response(JSON.stringify({ error: "Not your assignment" }), { status: 403, headers: cors });
    }

    const allowedFromStates = ["agent_accepted", "visit_reschedule_requested", "visit_scheduled"];
    if (!allowedFromStates.includes(prop.lifecycle_status || "")) {
      return new Response(JSON.stringify({ error: `Cannot schedule from state ${prop.lifecycle_status}` }), { status: 400, headers: cors });
    }

    const fromStatus = prop.lifecycle_status;
    const now = new Date().toISOString();

    const { error: uErr } = await admin
      .from("properties")
      .update({
        lifecycle_status: "visit_scheduled",
        visit_scheduled_date: visit_date,
        visit_scheduled_time: visit_time,
        visit_scheduled_notes: notes || null,
        visit_scheduled_by: user.id,
        visit_scheduled_at: now,
        reschedule_reason: null,
        reschedule_preferred_date: null,
        reschedule_preferred_time: null,
        reschedule_requested_at: null,
        visit_confirmed_at: null,
      })
      .eq("id", property_id);
    if (uErr) throw uErr;

    // Audit log
    await admin.from("property_audit_log").insert({
      property_id,
      actor_id: user.id,
      action: fromStatus === "visit_reschedule_requested" ? "schedule_proposed_after_reschedule" : "visit_schedule_submitted",
      from_status: fromStatus,
      to_status: "visit_scheduled",
      metadata: { visit_date, visit_time, notes: notes || null },
    });

    // Notify owner + admins
    const notifs: any[] = [];
    if (prop.submitted_by) {
      notifs.push({
        user_id: prop.submitted_by,
        title: "Verification visit scheduled — please review",
        message: `Your assigned agent proposed a visit for "${prop.title}" on ${visit_date} at ${visit_time}. Please accept or request a reschedule from your dashboard.`,
        type: "alert",
        link: "/dashboard/seller",
      });
    }
    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      notifs.push(...admins.map((a) => ({
        user_id: a.user_id,
        title: "Agent proposed a verification visit",
        message: `Agent proposed visit for "${prop.title}" on ${visit_date} at ${visit_time}.`,
        type: "info",
        link: "/admin",
      })));
    }
    if (notifs.length) await admin.from("notifications").insert(notifs);

    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
