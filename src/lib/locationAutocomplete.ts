/**
 * Generic, data-driven location autocomplete.
 * Builds India → State → City → Locality → Property index from whatever
 * records are passed in (hotels, properties…). No city-specific logic:
 * spelling variants are handled by cityNormalizer aliases + fuzzy matching.
 */
import { canonicalizeCity } from "@/lib/cityNormalizer";
import { ALL_INDIAN_CITIES } from "@/data/indianCities";

export interface LocatableRecord {
  city?: string | null;
  locality?: string | null;
  state?: string | null;
}

export interface LocalityNode { name: string; key: string; count: number; }
export interface CityNode {
  name: string;
  key: string;
  state?: string | null;
  count: number;
  localities: LocalityNode[]; // sorted by count desc
}

const norm = (s?: string | null) =>
  (s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Score how well `query` matches `target` (higher is better, 0 = no match). */
export function matchScore(query: string, target: string): number {
  const q = norm(query);
  const t = norm(target);
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.split(" ").some((w) => w.startsWith(q))) return 60;
  if (t.includes(q)) return 40;
  if (q.length >= 4) {
    const head = t.slice(0, Math.max(q.length, Math.min(t.length, q.length + 1)));
    const d = Math.min(levenshtein(q, head), levenshtein(q, t));
    const allowed = q.length >= 8 ? 3 : q.length >= 6 ? 2 : 1;
    if (d <= allowed) return 30 - d * 5;
  }
  return 0;
}

export function buildLocationIndex(records: LocatableRecord[]): Map<string, CityNode> {
  const cities = new Map<string, CityNode>();
  const locMaps = new Map<string, Map<string, LocalityNode>>();
  for (const r of records) {
    const key = canonicalizeCity(r.city);
    if (!key) continue;
    let node = cities.get(key);
    if (!node) {
      node = { name: title(r.city!.trim()), key, state: r.state ?? null, count: 0, localities: [] };
      cities.set(key, node);
      locMaps.set(key, new Map());
    }
    node.count++;
    const lk = norm(r.locality);
    if (lk && lk !== norm(r.city) && canonicalizeCity(r.locality) !== key) {
      const m = locMaps.get(key)!;
      const ln = m.get(lk) ?? { name: title(r.locality!.trim()), key: lk, count: 0 };
      ln.count++;
      m.set(lk, ln);
    }
  }
  for (const [key, node] of cities) {
    node.localities = Array.from(locMaps.get(key)!.values()).sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name),
    );
  }
  return cities;
}

export interface CityMatch { city: CityNode; score: number; }

/** Cities matching the query: data-backed cities first, then the national city list (0 count). */
export function findCities(index: Map<string, CityNode>, query: string, limit = 3): CityMatch[] {
  const qKey = canonicalizeCity(query);
  const out: CityMatch[] = [];
  const seen = new Set<string>();
  const consider = (node: CityNode) => {
    if (seen.has(node.key)) return;
    const score = node.key === qKey ? 100 : Math.max(matchScore(query, node.name), matchScore(query, node.key));
    if (score > 0) { out.push({ city: node, score }); seen.add(node.key); }
  };
  index.forEach(consider);
  for (const name of ALL_INDIAN_CITIES) {
    const key = canonicalizeCity(name);
    if (index.has(key)) continue;
    consider({ name, key, count: 0, localities: [] });
  }
  return out
    .sort((a, b) => b.score - a.score || b.city.count - a.city.count)
    .slice(0, limit);
}

/** Localities (across all cities) whose name matches the query. */
export function findLocalities(index: Map<string, CityNode>, query: string, limit = 5) {
  const out: { city: CityNode; locality: LocalityNode; score: number }[] = [];
  index.forEach((city) =>
    city.localities.forEach((locality) => {
      const score = matchScore(query, locality.name);
      if (score >= 40) out.push({ city, locality, score });
    }),
  );
  return out.sort((a, b) => b.score - a.score || b.locality.count - a.locality.count).slice(0, limit);
}

export const sameLocality = (a?: string | null, b?: string | null) => !!norm(a) && norm(a) === norm(b);
