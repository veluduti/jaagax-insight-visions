import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entityType, entityId } = await req.json(); // 'property', 'project', 'agent', 'builder'
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    let entityData;
    
    // Fetch entity details
    if (entityType === 'property') {
      const { data } = await supabase.from('properties').select('*').eq('id', entityId).single();
      entityData = data;
    } else if (entityType === 'project') {
      const { data } = await supabase.from('projects').select('*').eq('id', entityId).single();
      entityData = data;
    } else if (entityType === 'agent') {
      const { data } = await supabase.from('agents').select('*').eq('id', entityId).single();
      entityData = data;
    } else if (entityType === 'builder') {
      const { data } = await supabase.from('builders').select('*').eq('id', entityId).single();
      entityData = data;
    }

    if (!entityData) {
      return new Response(
        JSON.stringify({ error: 'Entity not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `You are JaagaX's AI TrustScore™ Engine for Indian real estate.

Entity Type: ${entityType}
Entity Data (JSON): ${JSON.stringify(entityData)}

Analyze and calculate a comprehensive TrustScore (0-100) based on:

For Properties:
- Verification status (40% weight)
- Documentation completeness (20%)
- Price reasonableness vs market (15%)
- Agent reputation (15%)
- Location credibility (10%)

For Projects:
- RERA verification (50% weight)
- Builder track record (25%)
- Documentation (15%)
- Market position (10%)

For Agents:
- Sales track record (30%)
- Reviews & ratings (30%)
- Verified status (25%)
- Response time & professionalism (15%)

For Builders:
- Verified projects count and quality (25%)
- On-time delivery track record (25%)
- Customer satisfaction score (20%)
- Construction progress consistency (15%)
- RERA compliance across projects (15%)

Additional Builder Analysis:
- Evaluate construction_progress percentage for ongoing projects
- Consider delivery_confidence_score if available
- Factor in projects_completed vs projects_ongoing ratio
- Assess on_time_delivery_rate for reliability
- Review customer_satisfaction_score for quality

Return JSON:
{
  "trustScore": 85,
  "grade": "A+",
  "deliveryConfidence": 88,
  "factors": {
    "positive": ["Strong track record with 15+ completed projects", "95% on-time delivery rate", "High customer satisfaction"],
    "concerns": ["Some ongoing projects behind schedule"]
  },
  "recommendations": ["Verify RERA for all projects", "Check recent customer reviews"],
  "breakdown": {
    "verification": 40,
    "track_record": 35,
    "customer_satisfaction": 15,
    "construction_quality": 10
  }
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    let trustAnalysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      trustAnalysis = JSON.parse(jsonMatch?.[0] || '{}');
    } catch {
      trustAnalysis = {
        trustScore: 50,
        grade: "C",
        factors: { positive: ["Basic verification"], concerns: ["Limited data"] },
        recommendations: ["Complete verification"],
        breakdown: { verification: 20, documentation: 15, reputation: 15 }
      };
    }

    // Update the entity's trust_score in the database
    if (trustAnalysis.trustScore) {
      await supabase
        .from(entityType === 'property' ? 'properties' : 
              entityType === 'project' ? 'projects' :
              entityType === 'agent' ? 'agents' : 'builders')
        .update({ trust_score: Math.round(trustAnalysis.trustScore) })
        .eq('id', entityId);
    }

    return new Response(
      JSON.stringify({ analysis: trustAnalysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
