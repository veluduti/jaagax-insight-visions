import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface POIItem {
  name: string;
  rating: number | null;
  distance: string;
  address: string;
  open_now: boolean | null;
}

// Haversine distance in km
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

// Try Google Places first (if key configured + works), then fall back to OpenStreetMap Overpass API.
async function fetchFromGoogle(lat: number, lng: number, apiKey: string): Promise<Record<string, POIItem[]> | null> {
  const categories = [
    { type: 'school', radius: 2000 },
    { type: 'hospital', radius: 3000 },
    { type: 'shopping_mall', radius: 3000 },
    { type: 'transit_station', radius: 2000 },
    { type: 'restaurant', radius: 1500 },
    { type: 'park', radius: 2000 },
  ];

  const results: Record<string, POIItem[]> = {};
  let anyOk = false;

  await Promise.all(
    categories.map(async (cat) => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${cat.radius}&type=${cat.type}&key=${apiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();
        console.log(`[Google] ${cat.type}: status=${data.status}, results=${data.results?.length ?? 0}`);

        if (data.status === 'OK' && data.results?.length) {
          anyOk = true;
          results[cat.type] = data.results.slice(0, 5).map((place: any) => {
            const placeLat = place.geometry?.location?.lat;
            const placeLng = place.geometry?.location?.lng;
            let distance = '';
            if (placeLat && placeLng) {
              distance = formatDistance(haversine(lat, lng, placeLat, placeLng));
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
        console.error(`[Google] error ${cat.type}:`, e);
        results[cat.type] = [];
      }
    })
  );

  return anyOk ? results : null;
}

// OpenStreetMap Overpass API — free, no key required
async function fetchFromOSM(lat: number, lng: number): Promise<Record<string, POIItem[]>> {
  const categories = [
    { key: 'school',          radius: 2000, filters: ['amenity=school', 'amenity=college', 'amenity=university'] },
    { key: 'hospital',        radius: 3000, filters: ['amenity=hospital', 'amenity=clinic'] },
    { key: 'shopping_mall',   radius: 3000, filters: ['shop=mall', 'shop=supermarket', 'shop=department_store'] },
    { key: 'transit_station', radius: 2000, filters: ['railway=station', 'public_transport=station', 'amenity=bus_station'] },
    { key: 'restaurant',      radius: 1500, filters: ['amenity=restaurant', 'amenity=cafe', 'amenity=fast_food'] },
    { key: 'park',            radius: 2000, filters: ['leisure=park', 'leisure=garden'] },
  ];

  const results: Record<string, POIItem[]> = {};

  await Promise.all(
    categories.map(async (cat) => {
      try {
        const filterBlocks = cat.filters
          .map((f) => {
            const [k, v] = f.split('=');
            return `node["${k}"="${v}"](around:${cat.radius},${lat},${lng});way["${k}"="${v}"](around:${cat.radius},${lat},${lng});`;
          })
          .join('');
        const query = `[out:json][timeout:15];(${filterBlocks});out center 25;`;

        const endpoints = [
          'https://overpass-api.de/api/interpreter',
          'https://overpass.kumi.systems/api/interpreter',
          'https://overpass.openstreetmap.ru/api/interpreter',
        ];
        let resp: Response | null = null;
        for (const ep of endpoints) {
          try {
            const r = await fetch(ep, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'JaagaX-NearbyPlaces/1.0',
                'Accept': 'application/json',
              },
              body: 'data=' + encodeURIComponent(query),
            });
            if (r.ok) { resp = r; break; }
            console.error(`[OSM] ${cat.key} ${ep} HTTP ${r.status}`);
          } catch (e) {
            console.error(`[OSM] ${cat.key} ${ep} fetch error:`, e);
          }
        }
        if (!resp) { results[cat.key] = []; return; }

        if (!resp.ok) {
          console.error(`[OSM] ${cat.key} HTTP ${resp.status}`);
          results[cat.key] = [];
          return;
        }

        const data = await resp.json();
        const elements = (data?.elements ?? []) as any[];
        console.log(`[OSM] ${cat.key}: ${elements.length} elements`);

        const items: POIItem[] = elements
          .filter((el) => el?.tags?.name)
          .map((el) => {
            const placeLat = el.lat ?? el.center?.lat;
            const placeLng = el.lon ?? el.center?.lon;
            const tags = el.tags || {};
            const addrParts = [
              tags['addr:housenumber'],
              tags['addr:street'],
              tags['addr:suburb'] || tags['addr:neighbourhood'],
              tags['addr:city'],
            ].filter(Boolean);
            const distanceKm = (placeLat && placeLng) ? haversine(lat, lng, placeLat, placeLng) : Infinity;
            return {
              name: tags.name as string,
              rating: null,
              distance: distanceKm === Infinity ? '' : formatDistance(distanceKm),
              address: addrParts.join(', '),
              open_now: null,
              _distance: distanceKm,
            } as POIItem & { _distance: number };
          })
          .sort((a, b) => (a as any)._distance - (b as any)._distance)
          .slice(0, 6)
          .map(({ _distance, ...rest }: any) => rest);

        results[cat.key] = items;
      } catch (e) {
        console.error(`[OSM] error ${cat.key}:`, e);
        results[cat.key] = [];
      }
    })
  );

  return results;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    let { lat, lng } = body as { lat?: number; lng?: number };
    const { query, locality, city } = body as { query?: string; locality?: string; city?: string };

    // Geocode locality/city via OSM Nominatim if coords missing
    if ((typeof lat !== 'number' || typeof lng !== 'number') && (query || locality || city)) {
      const q = query || [locality, city].filter(Boolean).join(', ');
      try {
        const geoResp = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
          { headers: { 'User-Agent': 'JaagaX-NearbyPlaces/1.0', 'Accept': 'application/json' } }
        );
        if (geoResp.ok) {
          const arr = await geoResp.json();
          if (Array.isArray(arr) && arr[0]) {
            lat = parseFloat(arr[0].lat);
            lng = parseFloat(arr[0].lon);
            console.log(`Geocoded "${q}" -> (${lat}, ${lng})`);
          }
        }
      } catch (e) {
        console.error('Nominatim geocode error:', e);
      }
    }

    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      return new Response(
        JSON.stringify({ success: false, error: 'lat/lng or locality required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching nearby places for (${lat}, ${lng})`);

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    let results: Record<string, POIItem[]> | null = null;
    let source = 'osm';

    if (apiKey) {
      results = await fetchFromGoogle(lat, lng, apiKey);
      if (results) source = 'google';
    }

    if (!results) {
      console.log('Falling back to OpenStreetMap Overpass API');
      results = await fetchFromOSM(lat, lng);
    }

    return new Response(
      JSON.stringify({ success: true, source, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in nearby-places:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch nearby places' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
