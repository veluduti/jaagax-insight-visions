import { supabase } from "@/integrations/supabase/client";

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
  if (r >= 4.0) return "Good";
  if (r >= 3.0) return "Average";
  return "Poor";
}

export function gradeForCount(c: number): Grade {
  if (c >= 20) return "Excellent";
  if (c >= 10) return "Good";
  if (c >= 3) return "Average";
  return "Poor";
}

export const successScoreService = {
  // ---- Get current success score ----
  async getSuccessScore(builderProfileId: string): Promise<SuccessScore | null> {
    try {
      const { data, error } = await supabase
        .from("agent_success_scores")
        .select("*")
        .eq("builder_profile_id", builderProfileId)
        .order("last_calculated", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as SuccessScore) || null;
    } catch (error) {
      console.error("Error fetching success score:", error);
      return null;
    }
  },

  // ---- Get score history ----
  async getScoreHistory(builderProfileId: string): Promise<SuccessScore[]> {
    try {
      const { data, error } = await supabase
        .from("agent_success_scores")
        .select("*")
        .eq("builder_profile_id", builderProfileId)
        .order("last_calculated", { ascending: true });

      if (error) throw error;
      return (data || []) as SuccessScore[];
    } catch (error) {
      console.error("Error fetching score history:", error);
      return [];
    }
  },

  // ---- Compute metrics ----
  async computeMetrics(builderProfileId: string) {
    try {
      // Get builder profile to get user_id
      const { data: builderProfile } = await supabase
        .from("builder_profiles")
        .select("user_id")
        .eq("id", builderProfileId)
        .maybeSingle();

      if (!builderProfile) {
        throw new Error("Builder profile not found");
      }

      const userId = builderProfile.user_id;

      // Get properties for this builder
      const { data: properties } = await supabase
        .from("properties")
        .select("id, verification_status, rera_id")
        .eq("submitted_by", userId);

      const props = properties || [];

      // Count verified listings (verification_status = 'verified' or 'approved')
      const verified_listings = props.filter(
        (p: any) => p.verification_status === "verified" || p.verification_status === "approved" || p.rera_id !== null,
      ).length;

      let conversion_rate = 0;
      let visit_success_rate = 0;
      let customer_rating = 0;
      let response_time = 6; // Default: 6 hours

      // Get visit bookings for this builder's properties
      try {
        const propertyIds = props.map((p: any) => p.id);
        if (propertyIds.length > 0) {
          const { data: visits } = await supabase
            .from("visit_bookings")
            .select("status")
            .in("property_id", propertyIds);

          const vs = visits || [];
          if (vs.length > 0) {
            const completed = vs.filter((v: any) => v.status === "completed").length;
            const scheduled = vs.filter((v: any) => v.status === "scheduled" || v.status === "pending").length;

            visit_success_rate = vs.length > 0 ? (completed / vs.length) * 100 : 0;
            conversion_rate = props.length > 0 ? (completed / props.length) * 100 : 0;

            // Estimate response time based on visit scheduling speed
            if (scheduled > 0) {
              response_time = Math.max(1, Math.round(scheduled / Math.max(1, vs.length)) * 2);
            }
          }
        }
      } catch (error) {
        console.warn("Error fetching visit bookings:", error);
      }

      // Get agent ratings
      try {
        const { data: ratings } = await supabase.from("agent_ratings").select("rating").eq("agent_id", userId);

        if (ratings && ratings.length > 0) {
          customer_rating = ratings.reduce((s: number, r: any) => s + (r.rating || 0), 0) / ratings.length;
        }
      } catch (error) {
        console.warn("Error fetching agent ratings:", error);
        // Try builder_ratings as fallback
        try {
          const { data: ratings } = await supabase
            .from("builder_ratings")
            .select("rating")
            .eq("builder_id", builderProfileId);

          if (ratings && ratings.length > 0) {
            customer_rating = ratings.reduce((s: number, r: any) => s + (r.rating || 0), 0) / ratings.length;
          }
        } catch (error2) {
          console.warn("Error fetching builder ratings:", error2);
        }
      }

      // Calculate percentages
      const verifiedPct = Math.min(100, (verified_listings / Math.max(1, props.length)) * 100);
      const ratingPct = Math.min(100, (customer_rating / 5) * 100);
      const responsePct = Math.max(0, Math.min(100, 100 - response_time * 5));

      const overall_score = Math.round(
        responsePct * 0.2 + conversion_rate * 0.25 + verifiedPct * 0.2 + ratingPct * 0.2 + visit_success_rate * 0.15,
      );

      return {
        response_time: Math.round(response_time),
        conversion_rate: Math.round(conversion_rate),
        verified_listings,
        customer_rating: Number(customer_rating.toFixed(2)),
        visit_success_rate: Math.round(visit_success_rate),
        overall_score,
      };
    } catch (error) {
      console.error("Error computing metrics:", error);
      return {
        response_time: 6,
        conversion_rate: 0,
        verified_listings: 0,
        customer_rating: 0,
        visit_success_rate: 0,
        overall_score: 0,
      };
    }
  },

  // ---- Calculate and save score ----
  async calculateScore(builderProfileId: string): Promise<SuccessScore | null> {
    try {
      const metrics = await this.computeMetrics(builderProfileId);

      const payload = {
        builder_profile_id: builderProfileId,
        ...metrics,
        last_calculated: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("agent_success_scores").insert(payload).select().single();

      if (error) throw error;
      return data as SuccessScore;
    } catch (error) {
      console.error("Error calculating score:", error);
      return null;
    }
  },

  // ---- Update metrics (alias for calculateScore) ----
  async updateMetrics(builderProfileId: string): Promise<SuccessScore | null> {
    return this.calculateScore(builderProfileId);
  },

  // ---- Get score breakdown ----
  async getScoreBreakdown(builderProfileId: string) {
    try {
      let score = await this.getSuccessScore(builderProfileId);
      if (!score) {
        score = await this.calculateScore(builderProfileId);
      }
      if (!score) {
        throw new Error("Failed to get or calculate score");
      }

      return [
        {
          key: "response_time",
          label: "Response Time",
          value: score.response_time,
          suffix: " hrs",
          grade: gradeForResponseTime(score.response_time),
        },
        {
          key: "conversion_rate",
          label: "Conversion Rate",
          value: score.conversion_rate,
          suffix: "%",
          grade: gradeForPercent(score.conversion_rate),
        },
        {
          key: "verified_listings",
          label: "Verified Listings",
          value: score.verified_listings,
          suffix: "",
          grade: gradeForCount(score.verified_listings),
        },
        {
          key: "customer_rating",
          label: "Customer Rating",
          value: score.customer_rating,
          suffix: " / 5",
          grade: gradeForRating(score.customer_rating),
        },
        {
          key: "visit_success_rate",
          label: "Visit Success Rate",
          value: score.visit_success_rate,
          suffix: "%",
          grade: gradeForPercent(score.visit_success_rate),
        },
      ];
    } catch (error) {
      console.error("Error getting score breakdown:", error);
      return [];
    }
  },
};

export default successScoreService;
