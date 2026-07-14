import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type SubRole = "country_admin" | "state_admin" | "district_admin";

const HIERARCHY: Record<string, SubRole | null> = {
  global_admin: "country_admin",
  country_admin: "state_admin",
  state_admin: "district_admin",
  district_admin: null,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { fullName, phone, email, password, country, state, district, isActive = true } = body ?? {};
    if (!email || !password || !fullName) return json({ error: "fullName, email and password are required" }, 400);

    // Resolve caller's admin role & scope
    const { data: callerScopes } = await admin
      .from("admin_scopes").select("*").eq("user_id", user.id).eq("is_active", true);
    // Global admin fallback via user_roles
    const { data: globalRow } = await admin
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();

    let callerRole: string | null = null;
    let callerScope: any = null;
    if (globalRow) callerRole = "global_admin";
    if (!callerRole && callerScopes && callerScopes.length) {
      const order = ["global_admin", "country_admin", "state_admin", "district_admin"];
      const sorted = [...callerScopes].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role));
      callerScope = sorted[0];
      callerRole = sorted[0].role;
    }
    if (!callerRole) return json({ error: "Forbidden" }, 403);

    const targetRole = HIERARCHY[callerRole];
    if (!targetRole) return json({ error: "You cannot create sub-admins" }, 403);

    // Enforce scope inheritance
    let finalCountry: string | null = null;
    let finalState: string | null = null;
    let finalDistrict: string | null = null;

    if (targetRole === "country_admin") {
      if (!country) return json({ error: "Country is required" }, 400);
      finalCountry = country;
    } else if (targetRole === "state_admin") {
      finalCountry = callerScope?.country ?? country;
      if (!finalCountry || !state) return json({ error: "Country and State are required" }, 400);
      if (callerScope?.country && country && country !== callerScope.country) {
        return json({ error: "Country must match your assigned country" }, 403);
      }
      finalState = state;
    } else if (targetRole === "district_admin") {
      finalCountry = callerScope?.country ?? country;
      finalState = callerScope?.state ?? state;
      if (!finalCountry || !finalState || !district) return json({ error: "Country, State and District are required" }, 400);
      if (callerScope?.state && state && state !== callerScope.state) {
        return json({ error: "State must match your assigned state" }, 403);
      }
      finalDistrict = district;
    }

    // Create auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone, role: targetRole },
    });
    if (createErr || !created?.user) {
      console.error("createUser error:", createErr);
      return json({ error: createErr?.message ?? "Failed to create user" }, 400);
    }
    const newUserId = created.user.id;

    // Insert user_roles + admin_scopes
    const { error: roleErr } = await admin.from("user_roles").insert({ user_id: newUserId, role: targetRole });
    if (roleErr && !roleErr.message.toLowerCase().includes("duplicate")) {
      console.error("user_roles insert error:", roleErr);
      await admin.auth.admin.deleteUser(newUserId).catch(() => {});
      return json({ error: `user_roles: ${roleErr.message}` }, 400);
    }

    const { error: scopeErr } = await admin.from("admin_scopes").insert({
      user_id: newUserId,
      role: targetRole,
      country: finalCountry,
      state: finalState,
      district: finalDistrict,
      is_active: !!isActive,
      created_by: user.id,
    });
    if (scopeErr) {
      console.error("admin_scopes insert error:", scopeErr);
      await admin.auth.admin.deleteUser(newUserId).catch(() => {});
      return json({ error: `admin_scopes: ${scopeErr.message}` }, 400);
    }


    // Optional: mirror phone into signup_requests / profile? Keep minimal — non-blocking.
    if (phone) {
      try {
        await admin.from("signup_requests").upsert({
          user_id: newUserId, email, full_name: fullName, phone, requested_role: targetRole, status: "approved",
        } as any, { onConflict: "user_id" });
      } catch (e) {
        console.warn("signup_requests upsert skipped:", (e as any)?.message);
      }
    }

    return json({ success: true, user_id: newUserId, role: targetRole });
  } catch (e: any) {
    console.error("create-sub-admin failed:", e?.message, e?.stack);
    return json({ error: e?.message ?? "Server error" }, 500);
  }
});

