import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BuyerContext {
  life_stage: string | null;
  budget_comfort: "strict" | "flexible" | "premium" | null;
  primary_fear: string[] | null;
  decision_mode: "buy_now" | "wait" | "rent_then_buy" | null;
  confidence_score: number;
}

interface PropertyInput {
  id: number;
  title: string;
  price: number;
  verified: boolean;
  trust_score: number;
  status?: string;
  bhk?: number;
  type?: string;
  locality?: string;
}

interface PropertyDecision {
  property_id: number;
  match_score: number;
  ai_verdict: "best_for_you" | "alternative" | "risky";
  risk_flags: string[];
  positive_flags: string[];
  reasoning: {
    life_stage_fit: boolean;
    budget_comfort: "good" | "tight" | "stretch";
    delay_risk: "low" | "medium" | "high";
    trust_level: "high" | "medium" | "low";
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { properties, buyerContext }: { properties: PropertyInput[]; buyerContext: BuyerContext } = await req.json();

    console.log("AI Property Decision - Processing", properties.length, "properties");

    const decisions: PropertyDecision[] = properties.map((property) => {
      return analyzeProperty(property, buyerContext);
    });

    // Sort by match_score descending
    decisions.sort((a, b) => b.match_score - a.match_score);

    return new Response(JSON.stringify({ decisions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Property Decision Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function analyzeProperty(property: PropertyInput, context: BuyerContext): PropertyDecision {
  const fears = context.primary_fear || [];
  const budgetComfort = context.budget_comfort || "flexible";
  const lifeStage = context.life_stage || "family";
  const decisionMode = context.decision_mode || "buy_now";

  let matchScore = 50;
  const riskFlags: string[] = [];
  const positiveFlags: string[] = [];

  // Trust and verification analysis
  let trustLevel: "high" | "medium" | "low" = "medium";
  if (property.verified && property.trust_score >= 80) {
    trustLevel = "high";
    matchScore += 15;
    positiveFlags.push("Verified & trusted");
  } else if (property.verified) {
    matchScore += 10;
    positiveFlags.push("Verified listing");
  } else {
    trustLevel = "low";
    matchScore -= 10;
    riskFlags.push("Unverified listing");
  }

  // Fear-based analysis
  if (fears.includes("legal_trust")) {
    if (property.verified) {
      matchScore += 10;
      positiveFlags.push("Addresses trust concerns");
    } else {
      matchScore -= 15;
      riskFlags.push("May not meet trust requirements");
    }
  }

  if (fears.includes("builder_delay")) {
    const isReady = property.status === "Ready" || property.status === "ready";
    if (isReady) {
      matchScore += 10;
      positiveFlags.push("Ready to move - no delay risk");
    } else {
      matchScore -= 10;
      riskFlags.push("Under construction - possible delays");
    }
  }

  // Budget comfort analysis
  let budgetFit: "good" | "tight" | "stretch" = "good";
  const priceInLakhs = property.price / 100000;

  if (budgetComfort === "strict") {
    if (priceInLakhs > 80) {
      budgetFit = "stretch";
      matchScore -= 15;
      riskFlags.push("Price may stretch budget");
    } else if (priceInLakhs > 50) {
      budgetFit = "tight";
      matchScore -= 5;
    } else {
      positiveFlags.push("Within strict budget");
      matchScore += 10;
    }
  } else if (budgetComfort === "flexible") {
    if (priceInLakhs > 150) {
      budgetFit = "stretch";
      matchScore -= 10;
    } else {
      positiveFlags.push("Fits flexible budget");
      matchScore += 5;
    }
  } else {
    // premium
    positiveFlags.push("Premium budget allows options");
    matchScore += 5;
  }

  // EMI pressure analysis
  if (fears.includes("emi_pressure")) {
    if (budgetFit === "stretch" || budgetFit === "tight") {
      riskFlags.push("EMI may be tight for comfort");
      matchScore -= 10;
    } else {
      positiveFlags.push("EMI within comfort zone");
    }
  }

  // Life stage fit
  let lifeStageMatch = true;
  if (lifeStage === "family" && property.bhk && property.bhk < 2) {
    lifeStageMatch = false;
    riskFlags.push("May be small for family");
    matchScore -= 10;
  } else if (lifeStage === "single" && property.bhk && property.bhk > 2) {
    // Not a risk, just note
  } else if (lifeStage === "investor") {
    if (property.verified) {
      positiveFlags.push("Good investment potential");
      matchScore += 5;
    }
  }

  if (lifeStageMatch && !riskFlags.some((f) => f.includes("small"))) {
    positiveFlags.push("Fits your life stage");
  }

  // Delay risk assessment
  let delayRisk: "low" | "medium" | "high" = "low";
  if (property.status === "Ready" || property.status === "ready") {
    delayRisk = "low";
  } else if (property.status === "Under Construction") {
    delayRisk = "medium";
    if (fears.includes("builder_delay")) {
      delayRisk = "high";
    }
  }

  // Decision mode adjustment
  if (decisionMode === "wait") {
    matchScore -= 5; // Slightly reduce scores for those waiting
  } else if (decisionMode === "rent_then_buy") {
    matchScore -= 10;
  }

  // Clamp score
  matchScore = Math.max(20, Math.min(98, matchScore));

  // Determine verdict
  let verdict: "best_for_you" | "alternative" | "risky";
  if (matchScore >= 70 && riskFlags.length <= 1) {
    verdict = "best_for_you";
  } else if (matchScore >= 50 || riskFlags.length <= 2) {
    verdict = "alternative";
  } else {
    verdict = "risky";
  }

  return {
    property_id: property.id,
    match_score: matchScore,
    ai_verdict: verdict,
    risk_flags: riskFlags,
    positive_flags: positiveFlags,
    reasoning: {
      life_stage_fit: lifeStageMatch,
      budget_comfort: budgetFit,
      delay_risk: delayRisk,
      trust_level: trustLevel,
    },
  };
}
