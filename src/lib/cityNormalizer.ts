/**
 * City name normalization & alias matching.
 *
 * Indian cities frequently have multiple accepted spellings (Bangalore /
 * Bengaluru, Bombay / Mumbai, etc.). Users may pick one; the database
 * may store another. To keep listings strictly location-consistent we
 * normalize both sides through this map.
 */

const CITY_ALIASES: Record<string, string[]> = {
  bengaluru: ["bengaluru", "bangalore", "blr"],
  mumbai: ["mumbai", "bombay"],
  chennai: ["chennai", "madras"],
  kolkata: ["kolkata", "calcutta"],
  pune: ["pune", "poona"],
  hyderabad: ["hyderabad", "hyd", "secunderabad"],
  delhi: ["delhi", "new delhi", "ncr"],
  gurugram: ["gurugram", "gurgaon"],
  vijayawada: ["vijayawada", "bezawada"],
  visakhapatnam: ["visakhapatnam", "vizag", "visakhapatanam"],
  thiruvananthapuram: ["thiruvananthapuram", "trivandrum"],
  kochi: ["kochi", "cochin", "ernakulam"],
};

const normalize = (s: string | null | undefined) =>
  (s || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");

const toKey = (city: string | null | undefined) => {
  const normalized = normalize(city);
  if (!normalized) return "";

  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.map(normalize).includes(normalized)) {
      return canonical;
    }
  }

  return normalized;
};

export function canonicalizeCity(city: string | null | undefined): string {
  return toKey(city);
}

/**
 * Returns the list of accepted aliases for a given city name (always
 * includes the input itself, lowercased). Useful for building SQL
 * `.in("city", aliases)` filters.
 */
export function getCityAliases(city: string | null | undefined): string[] {
  const input = normalize(city);
  const key = toKey(city);
  if (!key) return [];
  for (const [canonical, aliases] of Object.entries(CITY_ALIASES)) {
    if (canonical === key) {
      // Return aliases in both lowercase and Title Case so .in() matches
      // databases that store either casing.
      const out = new Set<string>();
      [canonical, ...aliases].forEach((a) => {
        out.add(a);
        out.add(a.charAt(0).toUpperCase() + a.slice(1));
        out.add(a.toUpperCase());
      });
      return Array.from(out);
    }
  }
  // Unknown city — return the original + capitalized variants.
  return Array.from(
    new Set([
      key,
      key.charAt(0).toUpperCase() + key.slice(1),
      key.toUpperCase(),
      city as string,
      input,
    ])
  );
}

/**
 * True iff `candidate` refers to the same city as `selected`, accounting
 * for aliases and case. Use this on the client side after fetching, to
 * be 100% sure no cross-city rows leak in (e.g. a row whose top-level
 * `city` matched but whose `final_data.location.city` is a different city).
 */
export function isSameCity(
  candidate: string | null | undefined,
  selected: string | null | undefined
): boolean {
  const a = toKey(candidate);
  const b = toKey(selected);
  if (!a || !b) return false;
  if (a === b) return true;
  const aAliases = getCityAliases(a).map(toKey);
  return aAliases.includes(b);
}
