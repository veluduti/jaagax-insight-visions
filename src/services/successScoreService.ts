import { fromTable } from "@/lib/supabaseHelper";

export interface SuccessScore {
  id: string;
  builder_profile_id: string;
  response_time: number;
  conversion_rate: number;
  verified_listings: number;
  customer_rating: number;
  visit_success_rate: number;
  overall_score: number;
  last_calculated: string;
  created_at: string;
  updated_at: string;
}

export type Grade = "Excellent" | "Good" | "Average" | "Poor";

export function gradeForResponseTime(hours: number): Grade {
  if (hours <= 1) return "Excellent";
  if (hours <= 4) return "Good";
  if (hours <= 12) return "Average";
  return "Poor";
}

export function gradeForPercent(p: number): Grade {
  if (p >= 80) return "Excellent";
  if (p >= 60) return "Good";
  if (p >= 40) return "Average";
  return "Poor";
}

export function gradeForRating(r: number): Grade {
  if (r >= 4.5) return "Excellent";
  if (r >= 4) return "Good";
  if (r >= 3) return "Average";
  return "Poor";
}

export function gradeForCount(c: number): Grade {
  if (c >= 20) return "Excellent";
  if (c >= 10) return "Good";
  if (c >= 3) return "Average";
  return "Poor";
}

export async function getSuccessScore(builderProfileId: string): Promise<SuccessScore | null> {
  const { data, error } = await fromTable("agent_success_scores")
    .select("*")
    .eq("builder_profile_id", builderProfileId)
    .order("last_calculated", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as SuccessScore) || null;
}

export async function getScoreHistory(builderProfileId: string): Promise<SuccessScore[]> {
  const { data, error } = await fromTable("agent_success_scores")
    .select("*")
    .eq("builder_profile_id", builderProfileId)
    .order("last_calculated", { ascending: true });
  if (error) throw error;
  return (data || []) as SuccessScore[];
}

async function computeMetrics(builderProfileId: string) {
  const { data: properties } = await fromTable("properties")
    .select("id, verification_status, rera_verified")
    .eq("builder_profile_id", builderProfileId);
  const props = properties || [];
  const verified_listings = props.filter(
    (p: any) => p.verification_status === "verified" || p.rera_verified
  ).length;

  let conversion_rate = 0;
  let visit_success_rate = 0;
  let customer_rating = 0;
  let response_time = 6;

  try {
    const { data: visits } = await fromTable("visit_bookings")
      .select("status")
      .in("property_id", props.map((p: any) => p.id));
    const vs = visits || [];
    if (vs.length) {
      const completed = vs.filter((v: any) => v.status === "completed").length;
      visit_success_rate = (completed / vs.length) * 100;
      conversion_rate = (completed / Math.max(1, props.length)) * 100;
    }
  } catch { /* table optional */ }

  try {
    const { data: ratings } = await fromTable("agent_ratings")
      .select("rating")
      .eq("builder_profile_id", builderProfileId);
    if (ratings && ratings.length) {
      customer_rating =
        ratings.reduce((s: number, r: any) => s + (r.rating || 0), 0) / ratings.length;
    }
  } catch { /* optional */ }

  const verifiedPct = Math.min(100, (verified_listings / Math.max(1, props.length)) * 100);
  const ratingPct = (customer_rating / 5) * 100;
  const responsePct = Math.max(0, 100 - response_time * 5);
  const overall_score = Math.round(
    responsePct * 0.2 +
      conversion_rate * 0.25 +
      verifiedPct * 0.2 +
      ratingPct * 0.2 +
      visit_success_rate * 0.15
  );

  return {
    response_time,
    conversion_rate: Math.round(conversion_rate),
    verified_listings,
    customer_rating: Number(customer_rating.toFixed(2)),
    visit_success_rate: Math.round(visit_success_rate),
    overall_score,
  };
}

export async function calculateScore(builderProfileId: string): Promise<SuccessScore> {
  const metrics = await computeMetrics(builderProfileId);
  const payload = {
    builder_profile_id: builderProfileId,
    ...metrics,
    last_calculated: new Date().toISOString(),
  };
  const { data, error } = await fromTable("agent_success_scores")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as SuccessScore;
}

export async function updateMetrics(builderProfileId: string): Promise<SuccessScore> {
  return calculateScore(builderProfileId);
}

export async function getScoreBreakdown(builderProfileId: string) {
  const score = (await getSuccessScore(builderProfileId)) || (await calculateScore(builderProfileId));
  return [
    { key: "response_time", label: "Response Time", value: score.response_time, suffix: " hrs", grade: gradeForResponseTime(score.response_time) },
    { key: "conversion_rate", label: "Conversion Rate", value: score.conversion_rate, suffix: "%", grade: gradeForPercent(score.conversion_rate) },
    { key: "verified_listings", label: "Verified Listings", value: score.verified_listings, suffix: "", grade: gradeForCount(score.verified_listings) },
    { key: "customer_rating", label: "Customer Rating", value: score.customer_rating, suffix: " / 5", grade: gradeForRating(score.customer_rating) },
    { key: "visit_success_rate", label: "Visit Success Rate", value: score.visit_success_rate, suffix: "%", grade: gradeForPercent(score.visit_success_rate) },
  ];
}
