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
    const { lat, lng } = await req.json();

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ success: false, error: 'lat and lng are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const categories = [
      { type: 'school', label: 'Schools', radius: 2000 },
      { type: 'hospital', label: 'Hospitals', radius: 3000 },
      { type: 'shopping_mall', label: 'Malls', radius: 3000 },
      { type: 'transit_station', label: 'Transit', radius: 2000 },
      { type: 'restaurant', label: 'Restaurants', radius: 1500 },
      { type: 'park', label: 'Parks', radius: 2000 },
    ];

    const results: Record<string, any[]> = {};

    await Promise.all(
      categories.map(async (cat) => {
        try {
          const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${cat.radius}&type=${cat.type}&key=${apiKey}`;
          const resp = await fetch(url);
          const data = await resp.json();

          if (data.status === 'OK' && data.results) {
            results[cat.type] = data.results.slice(0, 5).map((place: any) => {
              const placeLat = place.geometry?.location?.lat;
              const placeLng = place.geometry?.location?.lng;
              let distance = '';
              if (placeLat && placeLng) {
                const d = haversine(lat, lng, placeLat, placeLng);
                distance = d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
              }
              return {
                name: place.name,
                rating: place.rating || null,
                distance,
                address: place.vicinity || '',
                open_now: place.opening_hours?.open_now ?? null,
              };
            });
          } else {
            results[cat.type] = [];
          }
        } catch (e) {
          console.error(`Error fetching ${cat.type}:`, e);
          results[cat.type] = [];
        }
      })
    );

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in nearby-places:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch nearby places' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
