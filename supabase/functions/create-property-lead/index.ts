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

    const body = await req.json();
    const { property_id, source, lead_name = null, lead_phone = null, lead_email = null, notes = null } = body;
    if (!property_id || !["call","whatsapp","inquiry"].includes(source)) {
      return new Response(JSON.stringify({ error: "property_id and source required" }), { status: 400, headers: cors });
    }

    const { data: prop } = await admin
      .from("properties")
      .select("id, title, submitted_by, assigned_agent_id, lifecycle_status, is_live")
      .eq("id", property_id).maybeSingle();
    if (!prop) return new Response(JSON.stringify({ error: "Property not found" }), { status: 404, headers: cors });
    if (!prop.is_live) return new Response(JSON.stringify({ error: "Property is not live" }), { status: 400, headers: cors });

    // Freeze owner + assigned agent at creation time (historical preservation)
    const { data: lead, error: lErr } = await admin.from("property_leads").insert({
      property_id,
      lead_user_id: user?.id ?? null,
      lead_name, lead_phone, lead_email, notes,
      owner_id: prop.submitted_by,
      assigned_agent_id: prop.assigned_agent_id,   // snapshot — historical
      source,
      status: "new",
    }).select().single();
    if (lErr) throw lErr;

    const notifs = [];
    if (prop.submitted_by) notifs.push({
      user_id: prop.submitted_by,
      title: `New ${source} lead`,
      message: `A buyer reached out about "${prop.title}".`,
      type: "info", link: "/dashboard/seller",
    });
    if (prop.assigned_agent_id) notifs.push({
      user_id: prop.assigned_agent_id,
      title: `New ${source} lead`,
      message: `A buyer reached out about "${prop.title}".`,
      type: "info", link: "/dashboard/agent",
    });
    if (user?.id) notifs.push({
      user_id: user.id,
      title: "Enquiry sent ✅",
      message: `Your ${source} enquiry for "${prop.title}" was forwarded to the owner.`,
      type: "success", link: `/property/${property_id}`,
    });
    if (notifs.length) await admin.from("notifications").insert(notifs);

    return new Response(JSON.stringify({ success: true, lead_id: lead.id }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
