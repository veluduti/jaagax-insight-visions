import { describe, expect, it } from "vitest";
import {
  deriveBadge,
  filterAgents,
  matchesPropertyType,
  matchesService,
  propertiesHandled,
  sortAgents,
  EMPTY_FILTERS,
  type DiscoveryAgent,
} from "./agentDiscovery";

const base: DiscoveryAgent = {
  id: "a1",
  agency_name: "Prime Realty",
  sales_count: 0,
  rent_count: 0,
  photo_url: null,
  trust_score: 50,
  verified: false,
};

describe("matchesService", () => {
  it("matches buy/sell from sales count", () => {
    const a = { ...base, sales_count: 12 };
    expect(matchesService(a, "buy")).toBe(true);
    expect(matchesService(a, "sell")).toBe(true);
    expect(matchesService(a, "rent")).toBe(false);
  });

  it("matches rent from rent count", () => {
    const a = { ...base, rent_count: 5 };
    expect(matchesService(a, "rent")).toBe(true);
    expect(matchesService(a, "buy")).toBe(false);
  });

  it("matches keyword services from specializations", () => {
    const a = { ...base, specializations: ["Commercial", "Investment"] };
    expect(matchesService(a, "commercial")).toBe(true);
    expect(matchesService(a, "investment")).toBe(true);
    expect(matchesService(a, "management")).toBe(false);
  });

  it("does not hide agents with no service data saved", () => {
    expect(matchesService(base, "buy")).toBe(true);
    expect(matchesService(base, "investment")).toBe(true);
  });
});

describe("matchesPropertyType", () => {
  it("matches specialization keywords", () => {
    const a = { ...base, specializations: ["Villa", "Independent House"] };
    expect(matchesPropertyType(a, "villa")).toBe(true);
    expect(matchesPropertyType(a, "plot")).toBe(false);
  });

  it("does not hide agents without specializations", () => {
    expect(matchesPropertyType(base, "farmhouse")).toBe(true);
  });
});

describe("deriveBadge", () => {
  it("returns Top Rated only with real ratings", () => {
    expect(
      deriveBadge({ ...base, avg_rating: 4.8, total_ratings: 25 }),
    ).toBe("Top Rated");
    expect(deriveBadge({ ...base, avg_rating: 4.8, total_ratings: 2 })).not.toBe(
      "Top Rated",
    );
  });

  it("falls back to Verified then experience badges", () => {
    expect(deriveBadge({ ...base, verified: true })).toBe("Verified");
    expect(deriveBadge({ ...base, experience_years: 12 })).toBe("Experienced");
    expect(deriveBadge({ ...base, experience_years: 1 })).toBe("Rising Star");
    expect(deriveBadge(base)).toBeNull();
  });
});

describe("propertiesHandled", () => {
  it("sums sales and rentals", () => {
    expect(propertiesHandled({ ...base, sales_count: 10, rent_count: 4 })).toBe(14);
    expect(propertiesHandled(base)).toBe(0);
  });
});

describe("filterAgents", () => {
  const agents: DiscoveryAgent[] = [
    { ...base, id: "1", agent_code: "AGX-AAA", agency_name: "Prime Realty", city: "Hyderabad", verified: true },
    { ...base, id: "2", agent_code: "AGX-BBB", agency_name: "City Homes", city: "Secunderabad" },
  ];

  it("searches by agent code and agency", () => {
    expect(filterAgents(agents, { ...EMPTY_FILTERS, search: "agx-aaa" })).toHaveLength(1);
    expect(filterAgents(agents, { ...EMPTY_FILTERS, search: "city homes" })).toHaveLength(1);
  });

  it("filters by city without hiding area-less agents", () => {
    const noArea = { ...base, id: "3" };
    const out = filterAgents([...agents, noArea], { ...EMPTY_FILTERS, city: "Hyderabad" });
    expect(out.map((a) => a.id)).toEqual(["1", "3"]);
  });

  it("filters verified only", () => {
    expect(filterAgents(agents, { ...EMPTY_FILTERS, verifiedOnly: true })).toHaveLength(1);
  });

  it("deduplicates by id", () => {
    const dup = [agents[0], agents[0]];
    expect(filterAgents(dup, EMPTY_FILTERS)).toHaveLength(1);
  });
});

describe("sortAgents", () => {
  const agents: DiscoveryAgent[] = [
    { ...base, id: "low", trust_score: 10, avg_rating: 3.5, experience_years: 1, sales_count: 1 },
    { ...base, id: "high", trust_score: 90, avg_rating: 4.9, experience_years: 9, sales_count: 40 },
  ];

  it("recommended sorts by trust score", () => {
    expect(sortAgents(agents, "recommended")[0].id).toBe("high");
  });
  it("rating sorts by average rating", () => {
    expect(sortAgents(agents, "rating")[0].id).toBe("high");
  });
  it("properties sorts by handled count", () => {
    expect(sortAgents(agents, "properties")[0].id).toBe("high");
  });
});
