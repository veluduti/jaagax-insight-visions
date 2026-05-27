import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PropertyData {
  title: string;
  city: string;
  locality: string;
  price: number;
  area: number;
  type: string;
  beds?: number;
  baths?: number;
  bhk?: number;
  images?: string[];
  description?: string;
  lat?: number;
  lng?: number;
  status?: string;
  verified?: boolean;
  trust_score?: number;
}

interface AgentData {
  name: string;
  agency_name?: string;
  cities_served: string;
  languages?: string;
  photo_url?: string;
  sales_count?: number;
  rent_count?: number;
  trust_score?: number;
  verified?: boolean;
}

interface BuilderData {
  name: string;
  city: string;
  description?: string;
  logo_url?: string;
  trust_score?: number;
  verified?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated admin caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: isAdminData } = await supabaseClient.rpc('is_admin', { _user_id: userData.user.id });
    if (!isAdminData) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { source, cities, apifyApiKey } = await req.json();
    console.log(`Starting data import from source: ${source} for cities: ${cities}`);

    const results = {
      properties: 0,
      agents: 0,
      builders: 0,
      errors: [] as string[]
    };

    // If using Apify scrapers
    if (source === 'apify' && apifyApiKey) {
      for (const city of cities) {
        try {
          // Scrape from 99acres
          const scraped99acres = await scrape99acres(city, apifyApiKey);
          const processedData = await processScrapedData(scraped99acres, city);
          
          // Import builders first
          if (processedData.builders.length > 0) {
            const { error: builderError } = await supabaseClient
              .from('builders')
              .upsert(processedData.builders, { onConflict: 'name' });
            
            if (builderError) {
              console.error('Builder import error:', builderError);
              results.errors.push(`Builders: ${builderError.message}`);
            } else {
              results.builders += processedData.builders.length;
            }
          }

          // Import agents
          if (processedData.agents.length > 0) {
            const { error: agentError } = await supabaseClient
              .from('agents')
              .upsert(processedData.agents, { onConflict: 'name' });
            
            if (agentError) {
              console.error('Agent import error:', agentError);
              results.errors.push(`Agents: ${agentError.message}`);
            } else {
              results.agents += processedData.agents.length;
            }
          }

          // Import properties
          if (processedData.properties.length > 0) {
            const { error: propError } = await supabaseClient
              .from('properties')
              .insert(processedData.properties);
            
            if (propError) {
              console.error('Property import error:', propError);
              results.errors.push(`Properties: ${propError.message}`);
            } else {
              results.properties += processedData.properties.length;
            }
          }
        } catch (error) {
          console.error(`Error processing ${city}:`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          results.errors.push(`${city}: ${errorMessage}`);
        }
      }
    }

    // Manual bulk import
    if (source === 'manual') {
      const { properties, agents, builders } = await req.json();
      
      if (builders && builders.length > 0) {
        const { error } = await supabaseClient
          .from('builders')
          .insert(builders);
        if (!error) results.builders = builders.length;
        else results.errors.push(`Builders: ${error.message}`);
      }

      if (agents && agents.length > 0) {
        const { error } = await supabaseClient
          .from('agents')
          .insert(agents);
        if (!error) results.agents = agents.length;
        else results.errors.push(`Agents: ${error.message}`);
      }

      if (properties && properties.length > 0) {
        const { error } = await supabaseClient
          .from('properties')
          .insert(properties);
        if (!error) results.properties = properties.length;
        else results.errors.push(`Properties: ${error.message}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in import function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function scrape99acres(city: string, apiKey: string) {
  console.log(`Scraping 99acres for ${city}`);
  
  const cityUrls: Record<string, string> = {
    'hyderabad': 'https://www.99acres.com/property-in-hyderabad-ffid',
    'vijayawada': 'https://www.99acres.com/property-in-vijayawada-ffid'
  };

  try {
    const response = await fetch('https://api.apify.com/v2/acts/fatihtahta~99acres-scraper/runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        startUrls: [{ url: cityUrls[city.toLowerCase()] || cityUrls.hyderabad }],
        maxRequestsPerCrawl: 100,
        proxyConfiguration: { useApifyProxy: true }
      })
    });

    const runData = await response.json();
    const runId = runData.data.id;

    // Wait for scraping to complete
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Fetch results
    const resultsResponse = await fetch(
      `https://api.apify.com/v2/acts/fatihtahta~99acres-scraper/runs/${runId}/dataset/items`,
      {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }
    );

    return await resultsResponse.json();
  } catch (error) {
    console.error('Error scraping 99acres:', error);
    return [];
  }
}

function processScrapedData(data: any[], city: string) {
  const properties: PropertyData[] = [];
  const agents: AgentData[] = [];
  const builders: BuilderData[] = [];

  for (const item of data) {
    // Process property
    if (item.price && item.title) {
      properties.push({
        title: item.title || 'Untitled Property',
        city: city,
        locality: item.locality || item.location || 'Unknown',
        price: parseInt(item.price.replace(/[^0-9]/g, '')) || 0,
        area: parseInt(item.area?.replace(/[^0-9]/g, '')) || 0,
        type: item.propertyType || 'Apartment',
        beds: item.bedrooms || item.bhk || 2,
        baths: item.bathrooms || 2,
        bhk: item.bhk || 2,
        images: item.images || [],
        description: item.description || '',
        lat: item.latitude || null,
        lng: item.longitude || null,
        status: 'Ready',
        verified: false,
        trust_score: 75
      });
    }

    // Process builder if available
    if (item.builder && item.builder.name) {
      builders.push({
        name: item.builder.name,
        city: city,
        description: item.builder.description || '',
        logo_url: item.builder.logo || '',
        trust_score: 75,
        verified: false
      });
    }

    // Process agent if available
    if (item.agent && item.agent.name) {
      agents.push({
        name: item.agent.name,
        agency_name: item.agent.company || 'Independent',
        cities_served: city,
        languages: 'English, Hindi, Telugu',
        photo_url: item.agent.photo || '',
        sales_count: 0,
        rent_count: 0,
        trust_score: 75,
        verified: false
      });
    }
  }

  return { properties, agents, builders };
}
