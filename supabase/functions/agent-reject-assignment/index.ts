import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendLifecycleEmail } from "../_shared/lifecycleEmail.ts";

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

    const { property_id, reason } = await req.json();
    if (!property_id || !reason) return new Response(JSON.stringify({ error: "property_id and reason required" }), { status: 400, headers: cors });

    const { data: prop } = await admin
      .from("properties")
      .select("id, assigned_agent_id, submitted_by, title, lifecycle_status")
      .eq("id", property_id)
      .maybeSingle();
    if (!prop) return new Response(JSON.stringify({ error: "Property not found" }), { status: 404, headers: cors });
    if (prop.assigned_agent_id !== user.id) return new Response(JSON.stringify({ error: "Not your assignment" }), { status: 403, headers: cors });
    if (prop.lifecycle_status !== "agent_assigned") return new Response(JSON.stringify({ error: `Cannot reject from state ${prop.lifecycle_status}` }), { status: 400, headers: cors });

    await admin.from("properties").update({
      lifecycle_status: "agent_rejected",
      agent_rejection_reason: reason,
    }).eq("id", property_id);

    await admin.from("properties").update({
      lifecycle_status: "pending_admin_review",
      assigned_agent_id: null,
      agent_assignment_status: null,
    }).eq("id", property_id);

    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      await admin.from("notifications").insert(
        admins.map((a) => ({
          user_id: a.user_id,
          title: "Agent rejected — needs reassignment",
          message: `Agent rejected "${prop.title}". Reason: ${reason}`,
          type: "alert",
          link: "/admin",
        }))
      );
    }
    await admin.from("notifications").insert({
      user_id: prop.submitted_by,
      title: "Agent unavailable — being reassigned",
      message: `Admin will assign a different agent for "${prop.title}".`,
      type: "info",
      link: "/dashboard/seller",
    });

    // Email owner
    await sendLifecycleEmail(admin, prop.submitted_by, "agent_rejected", {
      propertyTitle: prop.title ?? "Your property",
      propertyId: property_id,
      ctaLink: "/dashboard/seller",
      extra: { reason },
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
