// Cron: dispatches T-10 / T-7 / T-3 / T-1 expiry reminders.
// Idempotent: dedupes via notifications.metadata.bucket_key
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = { "Access-Control-Allow-Origin": "*" };

Deno.serve(async (_req) => {
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const buckets = [10, 7, 3, 1];
  const summary: Record<string, number> = {};

  for (const days of buckets) {
    const startISO = new Date(Date.now() + (days - 0.5) * 86400000).toISOString();
    const endISO = new Date(Date.now() + (days + 0.5) * 86400000).toISOString();

    const { data: rows } = await admin
      .from("properties")
      .select("id, title, submitted_by, expiry_date, lifecycle_status")
      .in("lifecycle_status", ["live", "live_verified"])
      .gte("expiry_date", startISO)
      .lte("expiry_date", endISO);

    let inserted = 0;
    for (const r of rows ?? []) {
      if (!r.submitted_by) continue;
      const bucketKey = `expiry_t_minus_${days}:${r.id}`;
      // Dedupe via metadata
      const { data: existing } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", r.submitted_by)
        .eq("type", "listing_expiry_warning")
        .contains("metadata", { bucket_key: bucketKey } as any)
        .maybeSingle();
      if (existing) continue;

      await admin.from("notifications").insert({
        user_id: r.submitted_by,
        title: `Listing expires in ${days} day${days > 1 ? "s" : ""}`,
        message: `"${r.title ?? "Your property"}" expires on ${new Date(r.expiry_date!).toDateString()}. Renew to keep it live.`,
        type: "listing_expiry_warning",
        link: "/dashboard/seller",
        metadata: { bucket_key: bucketKey, days, property_id: r.id },
      });
      inserted++;
    }
    summary[`t_minus_${days}`] = inserted;
  }

  // Also process actual expiry
  const { data: expCount } = await admin.rpc("expire_due_property_listings");
  summary.expired_run = (expCount as any)?.[0]?.expired_count ?? 0;

  return new Response(JSON.stringify(summary), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
