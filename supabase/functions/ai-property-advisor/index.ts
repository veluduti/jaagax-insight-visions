import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyFilters {
  city?: string;
  locality?: string;
  beds?: number;
  bhk?: number;
  min_price?: number;
  max_price?: number;
  trust_score_min?: number;
  type?: string;
  verified?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId } = await req.json();
    console.log('AI Property Advisor request:', { query, userId });

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Step 1: Parse user query using OpenAI
    const parseResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a real estate query parser for Indian properties. Parse natural language queries into structured filters.
Return ONLY valid JSON with this exact structure:
{
  "filters": {
    "city": string (e.g., "Mumbai", "Bangalore", "Hyderabad"),
    "locality": string (optional),
    "beds": number (optional),
    "bhk": number (optional),
    "min_price": number (optional, in INR),
    "max_price": number (optional, in INR),
    "trust_score_min": number (optional, 0-100),
    "type": string (optional: "Apartment", "Villa", "Plot", "House"),
    "verified": boolean (optional)
  },
  "ai_comment": "Brief explanation of the search"
}

Examples:
- "3BHK in Gachibowli under 1 crore" → {"filters": {"locality": "Gachibowli", "bhk": 3, "max_price": 10000000}, "ai_comment": "Searching for 3BHK apartments in Gachibowli under ₹1 Crore"}
- "verified properties in Mumbai" → {"filters": {"city": "Mumbai", "verified": true}, "ai_comment": "Finding verified properties in Mumbai"}
- "high trust score villa near Bangalore" → {"filters": {"city": "Bangalore", "type": "Villa", "trust_score_min": 80}, "ai_comment": "Looking for high-trust villas near Bangalore"}`
          },
          {
            role: 'user',
            content: query
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!parseResponse.ok) {
      console.error('OpenAI parse error:', await parseResponse.text());
      throw new Error('Failed to parse query with AI');
    }

    const parseData = await parseResponse.json();
    const parsedContent = parseData.choices[0].message.content;
    console.log('Parsed content:', parsedContent);
    
    let parsedResult;
    try {
      parsedResult = JSON.parse(parsedContent);
    } catch (e) {
      console.error('JSON parse error:', e, parsedContent);
      throw new Error('AI returned invalid JSON');
    }

    const filters: PropertyFilters = parsedResult.filters || {};
    const aiComment = parsedResult.ai_comment || 'Finding properties that match your requirements';

    // Step 2: Query Supabase properties table
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    let propertyQuery = supabase
      .from('properties')
      .select(`
        id, title, city, locality, price, area, beds, baths, bhk, type,
        trust_score, verified, status, images, description,
        agent_id, project_id
      `)
      .eq('verified', true);

    // Apply filters
    if (filters.city) {
      propertyQuery = propertyQuery.ilike('city', `%${filters.city}%`);
    }
    if (filters.locality) {
      propertyQuery = propertyQuery.ilike('locality', `%${filters.locality}%`);
    }
    if (filters.beds) {
      propertyQuery = propertyQuery.eq('beds', filters.beds);
    }
    if (filters.bhk) {
      propertyQuery = propertyQuery.eq('bhk', filters.bhk);
    }
    if (filters.min_price) {
      propertyQuery = propertyQuery.gte('price', filters.min_price);
    }
    if (filters.max_price) {
      propertyQuery = propertyQuery.lte('price', filters.max_price);
    }
    if (filters.trust_score_min) {
      propertyQuery = propertyQuery.gte('trust_score', filters.trust_score_min);
    }
    if (filters.type) {
      propertyQuery = propertyQuery.eq('type', filters.type);
    }

    const { data: properties, error: propertiesError } = await propertyQuery.limit(20);

    if (propertiesError) {
      console.error('Supabase query error:', propertiesError);
      throw propertiesError;
    }

    console.log(`Found ${properties?.length || 0} properties`);

    // Step 3: Get community insights if locality is specified
    let communityInsights = null;
    if (filters.locality && filters.city) {
      const { data: communityData } = await supabase
        .from('community_profiles')
        .select('*')
        .ilike('locality', `%${filters.locality}%`)
        .ilike('city', `%${filters.city}%`)
        .maybeSingle();
      
      communityInsights = communityData;
    }

    // Step 4: Generate AI summary and recommendations
    const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert Indian real estate advisor. Provide concise, helpful insights about property matches.
Focus on: location benefits, price value, trust factors, and lifestyle fit.
Keep responses under 150 words and use Indian currency format (₹).`
          },
          {
            role: 'user',
            content: `User query: "${query}"
            
Found ${properties?.length || 0} properties matching:
${JSON.stringify(filters, null, 2)}

${properties && properties.length > 0 ? `Sample properties:
${properties.slice(0, 3).map(p => `- ${p.title} in ${p.locality}, ${p.city}: ₹${(p.price / 100000).toFixed(2)}L, ${p.bhk}BHK, Trust Score: ${p.trust_score || 'N/A'}`).join('\n')}` : ''}

${communityInsights ? `Community insights for ${filters.locality}:
- AI Rating: ${communityInsights.ai_rating}/10
- Average Price: ₹${(communityInsights.avg_price / 100000).toFixed(2)}L
- Appreciation Rate: ${communityInsights.appreciation_rate}%
- Summary: ${communityInsights.ai_summary}` : ''}

Provide a friendly summary explaining why these properties are good matches and any key insights.`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!summaryResponse.ok) {
      console.error('OpenAI summary error:', await summaryResponse.text());
      throw new Error('Failed to generate AI summary');
    }

    const summaryData = await summaryResponse.json();
    const aiSummary = summaryData.choices[0].message.content;

    // Step 5: Store session if user is authenticated
    if (userId) {
      await supabase
        .from('ai_sessions')
        .insert({
          user_id: userId,
          query,
          response: {
            filters,
            property_count: properties?.length || 0,
            ai_comment: aiComment,
            ai_summary: aiSummary,
          },
          filters: filters,
        });
    }

    // Return results
    return new Response(
      JSON.stringify({
        success: true,
        filters,
        aiComment,
        aiSummary,
        properties: properties || [],
        communityInsights,
        totalResults: properties?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in ai-property-advisor:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});