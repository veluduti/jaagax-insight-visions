import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const schema = z.object({
  email: z.string().email(), password: z.string().min(6).max(256),
  name: z.string().min(1).max(100), propertyId: z.string().uuid(),
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key || !anon) return json({ error: "Configuration unavailable" }, 500);
  const admin = createClient(url, key);
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const { data: caller, error: authError } = await admin.auth.getUser(header.slice(7));
  if (authError || !caller.user) return json({ error: "Unauthorized" }, 401);
  const { data: allowed, error: roleError } = await admin.rpc("is_global_admin", { _uid: caller.user.id });
  if (roleError || !allowed) return json({ error: "Global Admin required" }, 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid account details" }, 400);
  const input = parsed.data;
  const { data: property, error: propertyError } = await admin.from("properties")
    .select("id,locality,city,country,state,district,country_id,state_id,district_id,city_id,locality_id,assigned_agent_id,lifecycle_status")
    .eq("id", input.propertyId).single();
  if (propertyError || !property) return json({ error: "Property not found" }, 404);
  if (property.assigned_agent_id || property.lifecycle_status !== "pending_admin_review") {
    return json({ error: "Property is not awaiting an agent assignment" }, 409);
  }
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: input.email, password: input.password, email_confirm: true,
    user_metadata: { full_name: input.name },
  });
  if (createError || !created.user) return json({ error: createError?.message ?? "Account creation failed" }, 400);
  const userId = created.user.id;
  const location = {
    city: property.city, locality: property.locality, country: property.country,
    state: property.state, district: property.district, country_id: property.country_id,
    state_id: property.state_id, district_id: property.district_id,
    city_id: property.city_id, locality_id: property.locality_id,
  };
  try {
    const { error: agentError } = await admin.from("agents").insert({
      user_id: userId, name: input.name, email: input.email, phone: "", ...location,
      cities_served: property.city, localities_served: property.locality,
      verified: true, trust_score: 0, experience_years: 0,
      bio: "Test account for locality verification assignments.",
    });
    if (agentError) throw agentError;
    const { error: profileError } = await admin.from("profiles").insert({
      user_id: userId, type: "agent", status: "active",
      country: location.country, state: location.state, district: location.district,
      city: location.city, country_id: location.country_id, state_id: location.state_id,
      district_id: location.district_id, city_id: location.city_id, locality_id: location.locality_id,
    });
    if (profileError) throw profileError;
    const { error: rolesError } = await admin.from("user_roles").upsert({ user_id: userId, role: "agent" }, { onConflict: "user_id,role" });
    if (rolesError) throw rolesError;
    const scoped = createClient(url, anon, { global: { headers: { Authorization: header } } });
    const { data: assignment, error: assignError } = await scoped.rpc("property_assign_agent", {
      _property_id: property.id, _agent_user_id: userId,
    });
    if (assignError) throw assignError;
    return json({ success: true, user_id: userId, property_id: property.id, assignment });
  } catch {
    await admin.from("agents").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
    return json({ error: "Provisioning failed; account rolled back" }, 500);
  }
});