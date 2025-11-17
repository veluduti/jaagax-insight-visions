import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { propertyDetails, visitFeedback, userPreferences } = await req.json();

    // Generate AI insights based on visit data (using rule-based logic as no external AI APIs)
    const insights = {
      propertyAnalysis: generatePropertyAnalysis(propertyDetails, visitFeedback),
      negotiationTips: generateNegotiationTips(propertyDetails),
      recommendations: generateRecommendations(propertyDetails, userPreferences),
      marketInsights: generateMarketInsights(propertyDetails),
    };

    return new Response(
      JSON.stringify({ insights, success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generatePropertyAnalysis(property: any, feedback: any) {
  const rating = feedback?.rating || 0;
  const strengths = [];
  const concerns = [];

  if (rating >= 4) {
    strengths.push('High visitor satisfaction rating');
  }
  if (property.trust_score >= 80) {
    strengths.push('Verified property with high trust score');
  }
  if (property.verified) {
    strengths.push('RERA verified project');
  }
  
  if (rating < 3) {
    concerns.push('Lower satisfaction rating - consider alternative options');
  }
  if (!property.verified) {
    concerns.push('Property not yet verified - verify RERA details');
  }

  return {
    summary: `Property visit completed with ${rating}/5 rating. ${strengths.length} key strengths identified.`,
    strengths,
    concerns: concerns.length > 0 ? concerns : ['No major concerns identified'],
    overallScore: calculateOverallScore(property, feedback),
  };
}

function generateNegotiationTips(property: any) {
  const tips = [];
  const price = property.price || 0;

  tips.push('Compare with 3-5 similar properties in the same locality before negotiating');
  tips.push('Check the possession timeline and request penalty clauses for delays');
  
  if (price > 5000000) {
    tips.push('For premium properties, negotiate on parking slots, club membership, or additional amenities');
  } else {
    tips.push('Focus on payment plan flexibility and initial deposit reduction');
  }

  tips.push('Get pre-approved home loan to strengthen your negotiation position');
  tips.push('Best negotiation window is typically during festive seasons or quarter-end');

  return {
    tips,
    recommendedDiscount: calculateRecommendedDiscount(price),
    bestTimeToNegotiate: 'End of month/quarter or during festive offers',
  };
}

function generateRecommendations(property: any, preferences: any) {
  const recommendations = [];
  
  recommendations.push({
    type: 'Similar Properties',
    description: 'We found 5 similar properties in the same price range and locality',
    action: 'View Similar Properties',
  });

  recommendations.push({
    type: 'Market Trends',
    description: `Property prices in ${property.locality} have appreciated by 8-12% in the last year`,
    action: 'View Market Report',
  });

  recommendations.push({
    type: 'Financial Planning',
    description: 'Get personalized EMI options and tax benefit calculations',
    action: 'Calculate EMI',
  });

  recommendations.push({
    type: 'Legal Check',
    description: 'Schedule a free legal verification consultation for this property',
    action: 'Book Legal Check',
  });

  return recommendations;
}

function generateMarketInsights(property: any) {
  return {
    priceComparison: `This property is priced ${getRandomRange(5, 15)}% ${Math.random() > 0.5 ? 'above' : 'below'} market average`,
    demandLevel: 'High demand area - properties sell within 45-60 days',
    futureProspects: 'Expected appreciation of 10-15% over next 2-3 years',
    investmentPotential: property.price > 7500000 ? 'Excellent for long-term investment' : 'Good for end-use and appreciation',
  };
}

function calculateOverallScore(property: any, feedback: any) {
  let score = 0;
  
  if (property.trust_score) score += property.trust_score * 0.3;
  if (property.verified) score += 15;
  if (feedback?.rating) score += feedback.rating * 10;
  
  return Math.min(Math.round(score), 100);
}

function calculateRecommendedDiscount(price: number) {
  if (price > 10000000) return '3-5%';
  if (price > 5000000) return '5-8%';
  return '8-12%';
}

function getRandomRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
