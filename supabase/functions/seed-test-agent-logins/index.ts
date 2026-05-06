// One-time test helper: creates auth users for existing agents with password "Agent@123",
// links agents.user_id, and assigns the 'agent' role. Idempotent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: agents, error: agentsErr } = await admin
      .from("agents")
      .select("id, email, name, user_id, phone, cities_served");
    if (agentsErr) throw agentsErr;

    const PASSWORD = "Agent@123";
    const results: any[] = [];

    for (const a of agents ?? []) {
      if (!a.email) {
        results.push({ email: null, status: "skipped_no_email" });
        continue;
      }

      let userId = a.user_id as string | null;

      // Try to find existing auth user by email
      if (!userId) {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existing = list?.users?.find((u) => u.email?.toLowerCase() === a.email.toLowerCase());
        if (existing) userId = existing.id;
      }

      if (!userId) {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: a.email,
          password: PASSWORD,
          email_confirm: true,
          user_metadata: { name: a.name, role: "agent", requested_role: "agent" },
        });
        if (cErr) {
          results.push({ email: a.email, status: "create_failed", error: cErr.message });
          continue;
        }
        userId = created.user!.id;
      } else {
        // Reset password to known value
        const { error: uErr } = await admin.auth.admin.updateUserById(userId, {
          password: PASSWORD,
          email_confirm: true,
        });
        if (uErr) {
          results.push({ email: a.email, status: "password_reset_failed", error: uErr.message });
          continue;
        }
      }

      // Link agent row
      if (a.user_id !== userId) {
        await admin.from("agents").update({ user_id: userId, verified: true }).eq("id", a.id);
      }

      // Assign agent role
      await admin.from("user_roles").upsert(
        { user_id: userId, role: "agent" },
        { onConflict: "user_id,role" },
      );

      // Ensure signup_request marked approved (so role resolver passes)
      await admin.from("signup_requests").upsert(
        {
          user_id: userId,
          email: a.email,
          full_name: a.name,
          city: Array.isArray(a.cities_served) ? a.cities_served[0] : a.cities_served,
          requested_role: "agent",
          status: "approved",
          reviewed_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      // Ensure profile row of type 'agent'
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "agent")
        .maybeSingle();
      let profileId = existingProfile?.id as string | undefined;
      if (!profileId) {
        const { data: prof } = await admin
          .from("profiles")
          .insert({ user_id: userId, type: "agent", status: "active" })
          .select("id")
          .single();
        profileId = prof?.id;
      }
      if (profileId) {
        await admin.from("user_settings").upsert(
          { user_id: userId, active_profile_id: profileId, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      }

      results.push({ email: a.email, user_id: userId, status: "ok" });
    }

    return new Response(JSON.stringify({ password: PASSWORD, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
