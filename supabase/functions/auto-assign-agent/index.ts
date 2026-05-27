// Auto-assign an agent to a freshly submitted property.
// Algorithm:
//  1. Find verified agents whose cities_served / localities_served match the property location.
//  2. Count their active tasks (assigned, in_progress, visit_scheduled).
//  3. Exclude agents with >= 3 active tasks.
//  4. Pick the one with the least tasks; tie-break randomly.
//  5. Assign agent, insert agent_tasks row, set listing_status = 'assigned_to_agent'.
//  6. Notify seller, agent, and all admins.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { property_id } = await req.json();
    if (!property_id) {
      return json({ error: "property_id required" }, 400);
    }

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    // Authorization: only the property owner or an admin can trigger assignment
    const { data: isAdminData } = await sb.rpc("is_admin", { _user_id: userData.user.id });
    const { data: ownerCheck } = await sb.from("properties").select("submitted_by").eq("id", property_id).single();
    if (!isAdminData && ownerCheck?.submitted_by !== userData.user.id) {
      return json({ error: "Forbidden" }, 403);
    }

    // 1. Load the property
    const { data: prop, error: pErr } = await sb
      .from("properties")
      .select("id, title, city, locality, submitted_by, assigned_agent_id, listing_status")
      .eq("id", property_id).single();
    if (pErr || !prop) return json({ error: "property not found" }, 404);

    if (prop.assigned_agent_id) {
      return json({ ok: true, already_assigned: true, agent_id: prop.assigned_agent_id });
    }

    const city = (prop.city || "").trim();
    const locality = (prop.locality || "").trim();

    // 2. Get verified agents (filter by location in JS — fields are free text)
    const { data: agents, error: aErr } = await sb
      .from("agents")
      .select("id, user_id, name, phone, email, cities_served, localities_served, trust_score, sales_count, verified")
      .eq("verified", true);
    if (aErr) throw aErr;

    const cityLc = city.toLowerCase();
    const locLc = locality.toLowerCase();
    const matched = (agents || []).filter((a) => {
      const c = (a.cities_served || "").toLowerCase();
      const l = (a.localities_served || "").toLowerCase();
      // Match if city is in cities_served OR locality is in localities_served, OR no location info on agent (broad coverage)
      if (cityLc && c.includes(cityLc)) return true;
      if (locLc && l.includes(locLc)) return true;
      if (!c && !l) return true;
      return false;
    });

    // Fallback: if no location match, consider all verified agents
    const candidatePool = matched.length > 0 ? matched : (agents || []);

    if (candidatePool.length === 0) {
      // No agents — keep status as 'complete' and notify admins
      await notifyAdmins(sb, prop.id, prop.title || "A property",
        "New property submitted (no agent available)",
        `${prop.title || "A property"} in ${locality || city} was submitted but no agent matched. Please assign manually.`);
      return json({ ok: true, assigned: false, reason: "no_agents" });
    }

    // 3. Count active tasks per candidate
    const ids = candidatePool.map((a) => a.id);
    const { data: tasks, error: tErr } = await sb
      .from("agent_tasks")
      .select("agent_id, status")
      .in("agent_id", ids)
      .in("status", ["assigned", "in_progress", "visit_scheduled"]);
    if (tErr) throw tErr;

    const loadByAgent = new Map<string, number>();
    for (const id of ids) loadByAgent.set(id, 0);
    for (const t of tasks || []) {
      loadByAgent.set(t.agent_id, (loadByAgent.get(t.agent_id) || 0) + 1);
    }

    // 4. Exclude agents with >= 3 active tasks
    const eligible = candidatePool.filter((a) => (loadByAgent.get(a.id) || 0) < 3);
    if (eligible.length === 0) {
      await notifyAdmins(sb, prop.id, prop.title || "A property",
        "All agents at capacity",
        `${prop.title || "A property"} in ${locality || city} could not be auto-assigned (all agents have 3+ active tasks).`);
      return json({ ok: true, assigned: false, reason: "all_busy" });
    }

    // 5. Pick agent with least tasks, tie-break randomly (with trust_score nudge)
    const minLoad = Math.min(...eligible.map((a) => loadByAgent.get(a.id) || 0));
    const tied = eligible.filter((a) => (loadByAgent.get(a.id) || 0) === minLoad);
    // Random tie-break, slightly biased to higher trust_score
    tied.sort(() => Math.random() - 0.5);
    tied.sort((a, b) => (b.trust_score || 0) - (a.trust_score || 0));
    const chosen = tied[0];

    // 6. Assign
    const { error: upErr } = await sb
      .from("properties")
      .update({
        assigned_agent_id: chosen.id,
        listing_status: "assigned_to_agent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", prop.id);
    if (upErr) throw upErr;

    // 7. Insert task
    const { error: taskErr } = await sb.from("agent_tasks").insert({
      property_id: prop.id,
      agent_id: chosen.id,
      agent_user_id: chosen.user_id,
      task_type: "property_assigned",
      status: "assigned",
      priority: "normal",
      title: `Verify "${prop.title || "new property"}"`,
      description: `New listing in ${locality || city}. Contact the seller and complete on-site verification.`,
      metadata: { city, locality, source: "auto_assign" },
    });
    if (taskErr) console.error("task insert", taskErr);

    // 8. Notifications
    await Promise.all([
      // Seller
      prop.submitted_by ? sb.from("notifications").insert({
        user_id: prop.submitted_by,
        title: "Agent assigned ✅",
        message: `${chosen.name} has been assigned to verify "${prop.title || "your property"}". You'll hear from them shortly.`,
        type: "success",
        link: "/dashboard/seller",
        metadata: { property_id: prop.id, agent_id: chosen.id },
      }) : Promise.resolve(),
      // Agent
      chosen.user_id ? sb.from("notifications").insert({
        user_id: chosen.user_id,
        title: "New property assigned 🏠",
        message: `You've been assigned to verify "${prop.title || "a new listing"}" in ${locality || city}.`,
        type: "info",
        link: "/dashboard/agent",
        metadata: { property_id: prop.id, agent_id: chosen.id },
      }) : Promise.resolve(),
      // Admins
      notifyAdmins(sb, prop.id, prop.title || "A property",
        "New property submitted",
        `"${prop.title || "A property"}" in ${locality || city} was submitted and auto-assigned to ${chosen.name}.`),
    ]);

    return json({
      ok: true,
      assigned: true,
      agent: { id: chosen.id, name: chosen.name, user_id: chosen.user_id },
      load: minLoad,
    });
  } catch (e) {
    console.error("auto-assign error", e);
    return json({ error: String(e) }, 500);
  }
});

async function notifyAdmins(sb: any, propertyId: string, title: string, t: string, m: string) {
  const { data: admins } = await sb.from("user_roles").select("user_id").eq("role", "admin");
  if (!admins || admins.length === 0) return;
  const rows = admins.map((a: any) => ({
    user_id: a.user_id,
    title: t,
    message: m,
    type: "alert",
    link: "/admin",
    metadata: { property_id: propertyId },
  }));
  await sb.from("notifications").insert(rows);
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
