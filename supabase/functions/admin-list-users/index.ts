import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: myRoles } = await admin
      .from("user_roles").select("role").eq("user_id", user.id);
    const roleSet = new Set((myRoles ?? []).map((r: any) => r.role));
    const isGlobal = roleSet.has("admin");
    const isCountry = roleSet.has("country_admin");
    const isState = roleSet.has("state_admin");
    const isDistrict = roleSet.has("district_admin");
    if (!isGlobal && !isCountry && !isState && !isDistrict) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load caller scope for hierarchical admins
    let scope: any = null;
    if (!isGlobal) {
      const { data: scopes } = await admin
        .from("admin_scopes").select("*").eq("user_id", user.id).eq("is_active", true);
      const order = ["country_admin", "state_admin", "district_admin"];
      scope = (scopes ?? []).sort((a: any, b: any) => order.indexOf(a.role) - order.indexOf(b.role))[0] ?? null;
    }

    // Page through auth.users
    const authUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) break;
      authUsers.push(...(data?.users ?? []));
      if (!data?.users || data.users.length < perPage) break;
      page++;
      if (page > 20) break;
    }

    const [{ data: signups }, { data: profiles }, { data: roles }] = await Promise.all([
      admin.from("signup_requests").select("*"),
      admin.from("profiles").select("*"),
      admin.from("user_roles").select("user_id, role"),
    ]);

    const users = authUsers.map((au) => {
      const meta = (au.user_metadata ?? {}) as any;
      const signup = (signups ?? []).find((s: any) => s.user_id === au.id) ?? null;
      const userProfiles = (profiles ?? []).filter((p: any) => p.user_id === au.id);
      const userRoles = (roles ?? []).filter((r: any) => r.user_id === au.id).map((r: any) => r.role);
      return {
        user_id: au.id,
        email: au.email ?? signup?.email ?? meta.email ?? null,
        full_name: signup?.full_name ?? meta.name ?? meta.full_name ?? null,
        phone: signup?.phone ?? au.phone ?? meta.phone ?? null,
        city: signup?.city ?? meta.city ?? null,
        created_at: au.created_at,
        last_sign_in_at: au.last_sign_in_at ?? null,
        email_confirmed: !!au.email_confirmed_at,
        provider: au.app_metadata?.provider ?? null,
        requested_role: signup?.requested_role ?? meta.selected_role ?? null,
        roles: Array.from(new Set([...userRoles, ...userProfiles.map((p: any) => p.type)])),
        profiles: userProfiles,
        signup,
      };
    });

    users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("admin-list-users error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
