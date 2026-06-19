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

    const { property_id } = await req.json();
    if (!property_id) return new Response(JSON.stringify({ error: "property_id required" }), { status: 400, headers: cors });

    const { data: prop, error: pErr } = await admin
      .from("properties")
      .select("id, assigned_agent_id, submitted_by, title, lifecycle_status")
      .eq("id", property_id)
      .maybeSingle();
    if (pErr || !prop) return new Response(JSON.stringify({ error: "Property not found" }), { status: 404, headers: cors });
    if (prop.assigned_agent_id !== user.id) return new Response(JSON.stringify({ error: "Not your assignment" }), { status: 403, headers: cors });
    if (prop.lifecycle_status !== "agent_assigned") return new Response(JSON.stringify({ error: `Cannot accept from state ${prop.lifecycle_status}` }), { status: 400, headers: cors });

    const { error: uErr } = await admin
      .from("properties")
      .update({ lifecycle_status: "agent_accepted" })
      .eq("id", property_id);
    if (uErr) throw uErr;

    // Notify owner (edit locked) + admins
    await admin.from("notifications").insert([
      {
        user_id: prop.submitted_by,
        title: "Agent accepted — editing locked",
        message: `An agent accepted the verification task for "${prop.title}". You can no longer edit until verification completes. Contact admin if needed.`,
        type: "info",
        link: "/dashboard/seller",
      },
    ]);
    // Notify admins
    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      await admin.from("notifications").insert(
        admins.map((a) => ({
          user_id: a.user_id,
          title: "Agent accepted verification",
          message: `Agent accepted verification for "${prop.title}".`,
          type: "info",
          link: "/admin",
        }))
      );
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
