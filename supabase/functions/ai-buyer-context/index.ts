import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BuyerContextInput {
  fears: string[];
  life_stage: string;
  budget_comfort: "strict" | "flexible" | "premium";
}

interface BuyerContextOutput {
  decision_mode: "buy_now" | "wait" | "rent_then_buy";
  confidence_score: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fears, life_stage, budget_comfort }: BuyerContextInput = await req.json();

    console.log("AI Buyer Context Analysis:", { fears, life_stage, budget_comfort });

    // AI-based decision logic
    let decision_mode: "buy_now" | "wait" | "rent_then_buy" = "buy_now";
    let confidence_score = 50;

    // Analyze fears to determine risk tolerance
    const highRiskFears = ["job_stability", "emi_pressure"];
    const mediumRiskFears = ["price_fall", "builder_delay"];
    const trustFears = ["legal_trust"];

    const hasHighRiskFear = fears.some((f) => highRiskFears.includes(f));
    const hasMediumRiskFear = fears.some((f) => mediumRiskFears.includes(f));
    const hasTrustFear = fears.some((f) => trustFears.includes(f));

    // Life stage analysis
    const readyToBuyStages = ["family", "investor", "retired"];
    const cautionStages = ["single", "newly_married"];
    const isReadyStage = readyToBuyStages.includes(life_stage);
    const isCautionStage = cautionStages.includes(life_stage);

    // Budget comfort analysis
    const budgetReadiness =
      budget_comfort === "premium" ? 3 : budget_comfort === "flexible" ? 2 : 1;

    // Decision logic
    if (hasHighRiskFear && budgetReadiness === 1) {
      // High risk fears + strict budget = rent first
      decision_mode = "rent_then_buy";
      confidence_score = 30 + (isReadyStage ? 10 : 0);
    } else if (hasHighRiskFear && isCautionStage) {
      // High risk fears + caution stage = wait
      decision_mode = "wait";
      confidence_score = 40 + budgetReadiness * 5;
    } else if (hasMediumRiskFear && budgetReadiness === 1 && isCautionStage) {
      // Medium risk + strict + caution = wait
      decision_mode = "wait";
      confidence_score = 45 + (hasTrustFear ? -5 : 5);
    } else if (isReadyStage && budgetReadiness >= 2) {
      // Ready stage + flexible/premium = buy now
      decision_mode = "buy_now";
      confidence_score = 70 + budgetReadiness * 5 - fears.length * 3;
    } else if (budgetReadiness === 3) {
      // Premium budget = likely to buy
      decision_mode = "buy_now";
      confidence_score = 75 - fears.length * 5;
    } else if (fears.length >= 3) {
      // Many fears = wait
      decision_mode = "wait";
      confidence_score = 35 + budgetReadiness * 5;
    } else {
      // Default case
      decision_mode = "buy_now";
      confidence_score = 50 + budgetReadiness * 10 - fears.length * 5;
    }

    // Clamp confidence score between 10 and 95
    confidence_score = Math.max(10, Math.min(95, confidence_score));

    const result: BuyerContextOutput = {
      decision_mode,
      confidence_score,
    };

    console.log("AI Decision Result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Buyer Context Error:", error);
    
    // Return sensible defaults on error
    return new Response(
      JSON.stringify({
        decision_mode: "buy_now",
        confidence_score: 50,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 200, // Return 200 with defaults to not break flow
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
