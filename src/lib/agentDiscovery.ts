/**
 * Find-an-Agent discovery helpers.
 *
 * Everything here derives from real `agents` table rows only — no invented
 * stats, badges or categories. Agents with unset fields are treated as
 * "unknown" and are not hidden by specific filters (unknown ≠ mismatch),
 * matching the existing city-filter behaviour on the directory page.
 */

export interface DiscoveryAgent {
  id: string;
  agent_code?: string | null;
  name?: string | null;
  agency_name: string | null;
  languages?: string | string[] | null;
  languages_spoken?: string[] | null;
  cities_served?: string | string[] | null;
  localities_served?: string | string[] | null;
  sales_count: number | null;
  rent_count: number | null;
  photo_url: string | null;
  trust_score: number | null;
  verified: boolean | null;
  avg_rating?: number | null;
  total_ratings?: number | null;
  experience_years?: number | null;
  specializations?: string[] | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
}

export const SERVICE_TYPES = [
  { id: "buy", label: "Buy" },
  { id: "sell", label: "Sell" },
  { id: "rent", label: "Rent" },
  { id: "investment", label: "Investment" },
  { id: "management", label: "Property Management" },
  { id: "commercial", label: "Commercial" },
] as const;

export const PROPERTY_TYPES = [
  { id: "apartment", label: "Apartment" },
  { id: "villa", label: "Villa" },
  { id: "plot", label: "Plot / Land" },
  { id: "commercial", label: "Commercial" },
  { id: "pg", label: "PG / Co-living" },
  { id: "farmhouse", label: "Farm House" },
] as const;

export type SortKey = "recommended" | "rating" | "experience" | "properties";

export const toArray = (val: string | string[] | null | undefined): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  return val.split(",").map((s) => s.trim()).filter(Boolean);
};

/** All area labels an agent serves, lower-cased. */
export const agentAreas = (agent: DiscoveryAgent): string[] =>
  [
    ...toArray(agent.cities_served),
    ...toArray(agent.localities_served),
    agent.city,
    agent.district,
    agent.state,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

/** Normalised specialization text for keyword matching. */
const specText = (agent: DiscoveryAgent): string =>
  (agent.specializations || []).join(" ").toLowerCase();

/** True when the agent has no service information saved at all. */
const hasNoServiceData = (agent: DiscoveryAgent): boolean =>
  !specText(agent) && !(agent.sales_count || 0) && !(agent.rent_count || 0);

export const matchesService = (agent: DiscoveryAgent, serviceId: string): boolean => {
  if (hasNoServiceData(agent)) return true;
  const text = specText(agent);
  const sales = (agent.sales_count || 0) > 0;
  const rent = (agent.rent_count || 0) > 0;
  switch (serviceId) {
    case "buy":
      return sales || /buy|sale|residential/.test(text);
    case "sell":
      return sales || /sell|sale/.test(text);
    case "rent":
      return rent || /rent|lease|pg|co-living|coliving/.test(text);
    case "investment":
      return /invest/.test(text);
    case "management":
      return /management|facility/.test(text);
    case "commercial":
      return /commercial|office|retail|shop/.test(text);
    default:
      return true;
  }
};

export const matchesPropertyType = (agent: DiscoveryAgent, typeId: string): boolean => {
  const text = specText(agent);
  if (!text) return true; // no specialization data saved — do not hide
  switch (typeId) {
    case "apartment":
      return /apartment|flat|residential/.test(text);
    case "villa":
      return /villa|house|bungalow|independent/.test(text);
    case "plot":
      return /plot|land|agricultur/.test(text);
    case "commercial":
      return /commercial|office|retail|shop/.test(text);
    case "pg":
      return /pg|co-living|coliving|hostel/.test(text);
    case "farmhouse":
      return /farm/.test(text);
    default:
      return true;
  }
};

export const matchesLanguage = (agent: DiscoveryAgent, language: string): boolean => {
  const langs = (
    Array.isArray(agent.languages_spoken) && agent.languages_spoken.length
      ? agent.languages_spoken
      : toArray(agent.languages)
  ).map((l) => l.toLowerCase());
  if (!langs.length) return true; // unknown — do not hide
  return langs.some((l) => l.includes(language.toLowerCase()));
};

export type AgentBadge = "Top Rated" | "Verified" | "Experienced" | "Rising Star" | null;

/** Badge derived only from real agent data; null when nothing stands out. */
export const deriveBadge = (agent: DiscoveryAgent): AgentBadge => {
  const rating = Number(agent.avg_rating || 0);
  const ratings = agent.total_ratings || 0;
  const exp = agent.experience_years;
  if (rating >= 4.5 && ratings >= 10) return "Top Rated";
  if (agent.verified) return "Verified";
  if (exp != null && exp >= 10) return "Experienced";
  if (exp != null && exp <= 2) return "Rising Star";
  return null;
};

/** Total properties handled = recorded sales + rentals. */
export const propertiesHandled = (agent: DiscoveryAgent): number =>
  (agent.sales_count || 0) + (agent.rent_count || 0);

export const sortAgents = (agents: DiscoveryAgent[], sortBy: SortKey): DiscoveryAgent[] => {
  const list = [...agents];
  switch (sortBy) {
    case "rating":
      return list.sort(
        (a, b) =>
          Number(b.avg_rating || 0) - Number(a.avg_rating || 0) ||
          (b.total_ratings || 0) - (a.total_ratings || 0),
      );
    case "experience":
      return list.sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0));
    case "properties":
      return list.sort((a, b) => propertiesHandled(b) - propertiesHandled(a));
    case "recommended":
    default:
      return list.sort(
        (a, b) =>
          (b.trust_score || 0) - (a.trust_score || 0) ||
          Number(b.avg_rating || 0) - Number(a.avg_rating || 0),
      );
  }
};

export interface AgentFilters {
  search: string;
  city: string; // "all" or city label
  areas: string[]; // selected localities
  services: string[];
  propertyTypes: string[];
  languages: string[];
  verifiedOnly: boolean;
}

export const EMPTY_FILTERS: AgentFilters = {
  search: "",
  city: "all",
  areas: [],
  services: [],
  propertyTypes: [],
  languages: [],
  verifiedOnly: false,
};

export const filterAgents = (agents: DiscoveryAgent[], f: AgentFilters): DiscoveryAgent[] => {
  let out = [...agents];

  if (f.search.trim()) {
    const q = f.search.trim().toLowerCase();
    out = out.filter(
      (a) =>
        (a.agent_code || "").toLowerCase().includes(q) ||
        (a.agency_name || "").toLowerCase().includes(q) ||
        agentAreas(a).some((area) => area.includes(q)),
    );
  }

  if (f.city !== "all") {
    const c = f.city.toLowerCase();
    out = out.filter((a) => {
      const areas = agentAreas(a);
      if (!areas.length) return true;
      return areas.some((area) => area.includes(c) || c.includes(area));
    });
  }

  if (f.areas.length) {
    const wanted = f.areas.map((a) => a.toLowerCase());
    out = out.filter((a) => {
      const areas = agentAreas(a);
      if (!areas.length) return true;
      return wanted.some((w) => areas.some((area) => area.includes(w) || w.includes(area)));
    });
  }

  if (f.services.length) out = out.filter((a) => f.services.some((s) => matchesService(a, s)));
  if (f.propertyTypes.length)
    out = out.filter((a) => f.propertyTypes.some((t) => matchesPropertyType(a, t)));
  if (f.languages.length) out = out.filter((a) => f.languages.some((l) => matchesLanguage(a, l)));
  if (f.verifiedOnly) out = out.filter((a) => a.verified);

  // Deduplicate by id
  const seen = new Set<string>();
  return out.filter((a) => {
    if (!a?.id || seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
};

/** Count agents per label for sidebar filter rows. */
export const countBy = (
  agents: DiscoveryAgent[],
  key: (a: DiscoveryAgent) => string[],
): Map<string, number> => {
  const map = new Map<string, number>();
  for (const a of agents) {
    for (const raw of key(a)) {
      const label = String(raw).trim();
      if (!label) continue;
      map.set(label, (map.get(label) || 0) + 1);
    }
  }
  return map;
};

/** Cities an agent serves, pretty-cased, for the city dropdown. */
export const agentCities = (agents: DiscoveryAgent[]): string[] =>
  Array.from(
    new Map(
      agents
        .flatMap((a) => [...toArray(a.cities_served), a.city])
        .filter(Boolean)
        .map((c) => {
          const label = String(c).trim();
          const pretty = label.charAt(0).toUpperCase() + label.slice(1);
          return [label.toLowerCase(), pretty] as [string, string];
        }),
    ).values(),
  );

/** Locality labels (localities_served + city) for the Location filter. */
export const agentLocalities = (agents: DiscoveryAgent[]): Map<string, number> =>
  countBy(agents, (a) => [...toArray(a.localities_served), ...(a.city ? [a.city] : [])]);

export const agentLanguagesList = (agents: DiscoveryAgent[]): Map<string, number> =>
  countBy(agents, (a) =>
    Array.isArray(a.languages_spoken) && a.languages_spoken.length
      ? a.languages_spoken
      : toArray(a.languages),
  );
