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

    const body = await req.json();
    const { property_id, photos = [], geo_photos = [], video_url = null, remarks = "", report_url = null } = body;
    if (!property_id) return new Response(JSON.stringify({ error: "property_id required" }), { status: 400, headers: cors });

    const { data: prop } = await admin
      .from("properties")
      .select("id, assigned_agent_id, submitted_by, title, lifecycle_status")
      .eq("id", property_id).maybeSingle();
    if (!prop) return new Response(JSON.stringify({ error: "Property not found" }), { status: 404, headers: cors });
    if (prop.assigned_agent_id !== user.id) return new Response(JSON.stringify({ error: "Not your assignment" }), { status: 403, headers: cors });
    if (!["agent_accepted","visit_scheduled","under_verification"].includes(prop.lifecycle_status)) {
      return new Response(JSON.stringify({ error: `Cannot submit from ${prop.lifecycle_status}` }), { status: 400, headers: cors });
    }

    if (prop.lifecycle_status === "agent_accepted") {
      await admin.from("properties").update({ lifecycle_status: "visit_scheduled" }).eq("id", property_id);
    }
    if (prop.lifecycle_status !== "under_verification") {
      await admin.from("properties").update({ lifecycle_status: "under_verification" }).eq("id", property_id);
    }

    const { error: vErr } = await admin.from("property_verifications").insert({
      property_id, agent_id: user.id,
      photos, geo_photos, video_url, remarks, report_url,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });
    if (vErr) throw vErr;

    await admin.from("properties").update({ lifecycle_status: "verification_submitted" }).eq("id", property_id);
    await admin.from("properties").update({ lifecycle_status: "pending_final_approval" }).eq("id", property_id);

    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      await admin.from("notifications").insert(
        admins.map((a) => ({
          user_id: a.user_id,
          title: "Verification submitted — final approval",
          message: `Agent submitted verification for "${prop.title}".`,
          type: "alert",
          link: "/admin",
        }))
      );
    }

    // Notify + email owner
    await admin.from("notifications").insert({
      user_id: prop.submitted_by,
      title: "Verification submitted",
      message: `Agent submitted verification for "${prop.title}". Awaiting admin final approval.`,
      type: "info",
      link: "/dashboard/seller",
    });
    await sendLifecycleEmail(admin, prop.submitted_by, "verification_submitted", {
      propertyTitle: prop.title ?? "Your property",
      propertyId: property_id,
      ctaLink: "/dashboard/seller",
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
