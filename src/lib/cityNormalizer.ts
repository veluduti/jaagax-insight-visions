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
  (s || "").trim().toLowerCase();

/**
 * Returns the list of accepted aliases for a given city name (always
 * includes the input itself, lowercased). Useful for building SQL
 * `.in("city", aliases)` filters.
 */
export function getCityAliases(city: string | null | undefined): string[] {
  const key = normalize(city);
  if (!key) return [];
  for (const [, aliases] of Object.entries(CITY_ALIASES)) {
    if (aliases.includes(key)) {
      // Return aliases in both lowercase and Title Case so .in() matches
      // databases that store either casing.
      const out = new Set<string>();
      aliases.forEach((a) => {
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
  const a = normalize(candidate);
  const b = normalize(selected);
  if (!a || !b) return false;
  if (a === b) return true;
  const aAliases = getCityAliases(a).map(normalize);
  return aAliases.includes(b);
}
