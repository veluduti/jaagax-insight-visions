// Cron: agent assigned but no acceptance within 24h => reminder.
// >48h => escalate to admin and unassign (back to pending_admin_review).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = { "Access-Control-Allow-Origin": "*" };

Deno.serve(async (_req) => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const now = Date.now();
  const { data: stale } = await admin
    .from("properties")
    .select("id, title, assigned_agent_id, agent_assigned_at, lifecycle_status")
    .eq("lifecycle_status", "agent_assigned")
    .not("assigned_agent_id", "is", null);

  let reminded = 0, escalated = 0;
  for (const r of stale ?? []) {
    const assignedAt = r.agent_assigned_at ? new Date(r.agent_assigned_at).getTime() : now;
    const ageHrs = (now - assignedAt) / 3600000;
    if (ageHrs >= 48) {
      // Escalate
      await admin.from("properties").update({
        lifecycle_status: "pending_admin_review",
        assigned_agent_id: null,
        agent_assignment_status: null,
      }).eq("id", r.id);

      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        await admin.from("notifications").insert(
          admins.map((a) => ({
            user_id: a.user_id,
            title: "Agent timed out — reassign",
            message: `Agent did not respond for "${r.title}". Please reassign.`,
            type: "alert", link: "/admin",
          }))
        );
      }
      escalated++;
    } else if (ageHrs >= 24) {
      // Reminder dedup
      const key = `verif_reminder:${r.id}`;
      const { data: ex } = await admin.from("notifications")
        .select("id").eq("user_id", r.assigned_agent_id!)
        .contains("metadata", { reminder_key: key } as any).maybeSingle();
      if (!ex) {
        await admin.from("notifications").insert({
          user_id: r.assigned_agent_id,
          title: "Pending verification task",
          message: `Please accept or reject the assignment for "${r.title}".`,
          type: "alert", link: "/dashboard/agent",
          metadata: { reminder_key: key },
        });
        reminded++;
      }
    }
  }

  return new Response(JSON.stringify({ reminded, escalated }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
