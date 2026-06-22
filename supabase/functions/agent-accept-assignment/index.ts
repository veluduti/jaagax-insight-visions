import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendLifecycleEmail } from "../_shared/lifecycleEmail.ts";
import { sendLifecycleSMS } from "../_shared/lifecycleSms.ts";

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

    // assigned_agent_id may be either agents.id OR agents.user_id depending on flow.
    // Resolve the owning auth user and compare.
    let ownerUserId: string | null = null;
    if (prop.assigned_agent_id === user.id) {
      ownerUserId = user.id;
    } else if (prop.assigned_agent_id) {
      const { data: a } = await admin
        .from("agents")
        .select("user_id")
        .eq("id", prop.assigned_agent_id)
        .maybeSingle();
      ownerUserId = (a as any)?.user_id ?? null;
    }
    if (ownerUserId !== user.id) {
      return new Response(JSON.stringify({ error: "Not your assignment" }), { status: 403, headers: cors });
    }
    if (prop.lifecycle_status !== "agent_assigned") return new Response(JSON.stringify({ error: `Cannot accept from state ${prop.lifecycle_status}` }), { status: 400, headers: cors });

    const { error: uErr } = await admin
      .from("properties")
      .update({ lifecycle_status: "agent_accepted" })
      .eq("id", property_id);
    if (uErr) throw uErr;

    // Audit log
    await admin.from("property_audit_log").insert({
      property_id,
      actor_id: user.id,
      action: "agent_accepted_assignment",
      from_status: "agent_assigned",
      to_status: "agent_accepted",
    });

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

    // Email + SMS fan-out (best-effort)
    await sendLifecycleEmail(admin, prop.submitted_by, "agent_accepted", {
      propertyTitle: prop.title ?? "Your property",
      propertyId: property_id,
      ctaLink: "/dashboard/seller",
    });
    const { data: ownerProfile } = await admin.from("profiles").select("phone").eq("id", prop.submitted_by).maybeSingle();
    await sendLifecycleSMS(admin, (ownerProfile as any)?.phone, `JAAGA X: Agent accepted "${prop.title}". Editing is now locked until verification completes.`, { propertyId: property_id, event: "agent_accepted" });

    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
