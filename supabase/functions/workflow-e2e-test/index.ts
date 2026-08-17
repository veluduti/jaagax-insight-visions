// End-to-end test runner for the property review ladder:
// Country -> State -> District -> auto-assigned best matched agent (needs_agent = true).
// Creates throwaway fixtures inside the DB routine and deletes them again.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data, error } = await admin.rpc("workflow_e2e_agent_assignment_test");
    if (error) throw error;
    console.log("workflow e2e result", JSON.stringify(data));
    return new Response(JSON.stringify(data), {
      status: (data as any)?.ok ? 200 : 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
