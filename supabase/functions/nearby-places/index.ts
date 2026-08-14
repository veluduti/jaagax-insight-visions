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

const CATEGORY_KEYS = [
  'school',
  'hospital',
  'pharmacy',
  'shopping_mall',
  'transit_station',
  'restaurant',
  'park',
] as const;
type CategoryKey = typeof CATEGORY_KEYS[number];

function emptyResults(): Record<string, POIItem[]> {
  const out: Record<string, POIItem[]> = {};
  for (const k of CATEGORY_KEYS) out[k] = [];
  return out;
}

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

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Google Places (legacy nearbysearch) — only used when a server key is configured. */
async function fetchFromGoogle(lat: number, lng: number, apiKey: string): Promise<Record<string, POIItem[]> | null> {
  const categories: { key: CategoryKey; type: string; radius: number }[] = [
    { key: 'school', type: 'school', radius: 3000 },
    { key: 'hospital', type: 'hospital', radius: 4000 },
    { key: 'pharmacy', type: 'pharmacy', radius: 3000 },
    { key: 'shopping_mall', type: 'shopping_mall', radius: 5000 },
    { key: 'transit_station', type: 'transit_station', radius: 3000 },
    { key: 'restaurant', type: 'restaurant', radius: 2000 },
    { key: 'park', type: 'park', radius: 3000 },
  ];

  const results = emptyResults();
  let anyOk = false;

  await Promise.all(categories.map(async (cat) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${cat.radius}&type=${cat.type}&key=${apiKey}`;
      const resp = await fetchWithTimeout(url, {}, 8000);
      const data = await resp.json();
      if (data.status === 'OK' && data.results?.length) {
        anyOk = true;
        results[cat.key] = data.results.slice(0, 6).map((place: any) => {
          const pLat = place.geometry?.location?.lat;
          const pLng = place.geometry?.location?.lng;
          return {
            name: place.name,
            rating: place.rating ?? null,
            distance: pLat && pLng ? formatDistance(haversine(lat, lng, pLat, pLng)) : '',
            address: place.vicinity || '',
            open_now: place.opening_hours?.open_now ?? null,
          };
        });
      }
    } catch (e) {
      console.error(`[Google] ${cat.key} failed:`, e instanceof Error ? e.message : e);
    }
  }));

  return anyOk ? results : null;
}

const OSM_TAG_MAP: { key: CategoryKey; tag: string; values: string[] }[] = [
  { key: 'school', tag: 'amenity', values: ['school', 'college', 'university', 'kindergarten'] },
  { key: 'hospital', tag: 'amenity', values: ['hospital', 'clinic', 'doctors'] },
  { key: 'pharmacy', tag: 'amenity', values: ['pharmacy'] },
  { key: 'shopping_mall', tag: 'shop', values: ['mall', 'supermarket', 'department_store'] },
  { key: 'transit_station', tag: 'railway', values: ['station'] },
  { key: 'transit_station', tag: 'amenity', values: ['bus_station'] },
  { key: 'restaurant', tag: 'amenity', values: ['restaurant', 'cafe', 'fast_food'] },
  { key: 'park', tag: 'leisure', values: ['park', 'garden'] },
];

function classify(tags: Record<string, string>): CategoryKey | null {
  for (const entry of OSM_TAG_MAP) {
    const v = tags[entry.tag];
    if (v && entry.values.includes(v)) return entry.key;
  }
  return null;
}

/**
 * Single Overpass query covering every category. One request (instead of six
 * parallel ones) keeps us well inside Overpass rate limits and the function
 * timeout. Falls through the endpoint list until one answers.
 */
async function fetchFromOSM(lat: number, lng: number, radius: number): Promise<Record<string, POIItem[]>> {
  const results = emptyResults();

  const blocks = OSM_TAG_MAP.map((e) =>
    e.values.map((v) =>
      `nwr["${e.tag}"="${v}"](around:${radius},${lat},${lng});`
    ).join('')
  ).join('');

  const query = `[out:json][timeout:20];(${blocks});out center 300;`;

  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
  ];

  let data: any = null;
  for (const ep of endpoints) {
    try {
      const r = await fetchWithTimeout(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'JaagaX-NearbyPlaces/1.0',
          'Accept': 'application/json',
        },
        body: 'data=' + encodeURIComponent(query),
      }, 20000);
      if (!r.ok) {
        console.error(`[OSM] ${ep} HTTP ${r.status}`);
        continue;
      }
      data = await r.json();
      break;
    } catch (e) {
      console.error(`[OSM] ${ep} error:`, e instanceof Error ? e.message : e);
    }
  }

  if (!data) return results;

  const buckets: Record<string, (POIItem & { _d: number })[]> = {};
  for (const k of CATEGORY_KEYS) buckets[k] = [];

  for (const el of (data.elements ?? []) as any[]) {
    const tags = el?.tags || {};
    if (!tags.name) continue;
    const key = classify(tags);
    if (!key) continue;
    const pLat = el.lat ?? el.center?.lat;
    const pLng = el.lon ?? el.center?.lon;
    if (typeof pLat !== 'number' || typeof pLng !== 'number') continue;
    const d = haversine(lat, lng, pLat, pLng);
    const addr = [
      tags['addr:housenumber'],
      tags['addr:street'],
      tags['addr:suburb'] || tags['addr:neighbourhood'],
      tags['addr:city'],
    ].filter(Boolean).join(', ');
    buckets[key].push({
      name: tags.name,
      rating: null,
      distance: formatDistance(d),
      address: addr,
      open_now: null,
      _d: d,
    });
  }

  for (const k of CATEGORY_KEYS) {
    const seen = new Set<string>();
    results[k] = buckets[k]
      .sort((a, b) => a._d - b._d)
      .filter((i) => {
        const id = i.name.toLowerCase();
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 6)
      .map(({ _d, ...rest }) => rest);
  }

  return results;
}

function hasAny(r: Record<string, POIItem[]> | null): boolean {
  return !!r && Object.values(r).some((v) => v && v.length > 0);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    let { lat, lng } = body as { lat?: number; lng?: number };
    const { query, locality, city } = body as { query?: string; locality?: string; city?: string };

    if ((typeof lat !== 'number' || typeof lng !== 'number') && (query || locality || city)) {
      const q = query || [locality, city].filter(Boolean).join(', ');
      try {
        const geoResp = await fetchWithTimeout(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
          { headers: { 'User-Agent': 'JaagaX-NearbyPlaces/1.0', 'Accept': 'application/json' } },
          8000,
        );
        if (geoResp.ok) {
          const arr = await geoResp.json();
          if (Array.isArray(arr) && arr[0]) {
            lat = parseFloat(arr[0].lat);
            lng = parseFloat(arr[0].lon);
          }
        }
      } catch (e) {
        console.error('Nominatim geocode error:', e instanceof Error ? e.message : e);
      }
    }

    if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
      return new Response(
        JSON.stringify({ success: false, error: 'lat/lng or locality required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    let results: Record<string, POIItem[]> | null = null;
    let source = 'osm';

    if (apiKey) {
      results = await fetchFromGoogle(lat, lng, apiKey);
      if (results) source = 'google';
    }

    if (!hasAny(results)) {
      results = await fetchFromOSM(lat, lng, 3000);
      source = 'osm';
      if (!hasAny(results)) {
        // widen once for sparsely mapped areas
        results = await fetchFromOSM(lat, lng, 10000);
      }
    }

    return new Response(
      JSON.stringify({ success: true, source, center: { lat, lng }, data: results ?? emptyResults() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error in nearby-places:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to fetch nearby places' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
