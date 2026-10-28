import { describe, expect, it } from "vitest";
import {
  agentAreasList,
  agentProfileStats,
  agentServiceChips,
  agentSpecializations,
  agentTrustItems,
  agentTypeChips,
  buildMailLink,
  buildTelLink,
  buildWhatsAppLink,
  formatAgentPropertyPrice,
  phoneDigits,
  type AgentProfileLike,
} from "./agentProfile";

const base: AgentProfileLike = {
  id: "a1",
  specializations: [],
  sales_count: 0,
  rent_count: 0,
  avg_rating: null,
  total_ratings: null,
  experience_years: null,
  verified: false,
};

describe("agentServiceChips", () => {
  it("derives buy/sell from sales count", () => {
    const chips = agentServiceChips({ ...base, sales_count: 5 }).map((c) => c.id);
    expect(chips).toContain("buy");
    expect(chips).toContain("sell");
    expect(chips).not.toContain("rent");
  });

  it("derives rent from rent count and investment from specializations", () => {
    const chips = agentServiceChips({
      ...base,
      rent_count: 3,
      specializations: ["Investment Advisory"],
    }).map((c) => c.id);
    expect(chips).toContain("rent");
    expect(chips).toContain("investment");
  });

  it("returns nothing when the agent has no data", () => {
    expect(agentServiceChips(base)).toEqual([]);
  });
});

describe("agentTypeChips", () => {
  it("maps saved specializations to type chips", () => {
    const chips = agentTypeChips({
      ...base,
      specializations: ["Luxury Villas", "Commercial Offices"],
    }).map((c) => c.id);
    expect(chips).toContain("villa");
    expect(chips).toContain("commercial");
    expect(chips).not.toContain("plot");
  });

  it("returns nothing without specializations", () => {
    expect(agentTypeChips(base)).toEqual([]);
  });
});

describe("agentSpecializations", () => {
  it("matches catalog entries from saved specializations", () => {
    const specs = agentSpecializations({
      ...base,
      specializations: ["Residential", "NRI Assistance"],
    }).map((s) => s.id);
    expect(specs).toContain("residential");
    expect(specs).toContain("nri");
  });
});

describe("agentTrustItems", () => {
  it("shows verified only when verified or KYC-verified", () => {
    expect(agentTrustItems(base, false).map((t) => t.id)).toEqual([]);
    expect(agentTrustItems({ ...base, verified: true }, false).map((t) => t.id)).toContain("verified");
    expect(agentTrustItems(base, true).map((t) => t.id)).toContain("certified");
  });

  it("requires real ratings for top-rated", () => {
    const items = agentTrustItems({ ...base, avg_rating: 4.8, total_ratings: 3 }, false);
    expect(items.map((t) => t.id)).not.toContain("top-rated");
    const items2 = agentTrustItems({ ...base, avg_rating: 4.8, total_ratings: 12 }, false);
    expect(items2.map((t) => t.id)).toContain("top-rated");
  });
});

describe("agentProfileStats", () => {
  it("sums sales and rent for properties handled", () => {
    const stats = agentProfileStats({ ...base, sales_count: 7, rent_count: 3, total_ratings: 21 });
    expect(stats.propertiesHandled).toBe(10);
    expect(stats.happyClients).toBe(21);
  });
});

describe("agentAreasList", () => {
  it("dedupes case-insensitively and keeps first spelling", () => {
    const areas = agentAreasList({
      ...base,
      cities_served: "Hyderabad, Secunderabad",
      localities_served: ["hyderabad", "Hitec City"],
      city: "Hyderabad",
      state: "Telangana",
    });
    expect(areas).toEqual(["Hyderabad", "Secunderabad", "Hitec City", "Telangana"]);
  });
});

describe("contact links", () => {
  it("normalises Indian numbers for wa.me", () => {
    expect(phoneDigits("98765 43210")).toBe("919876543210");
    expect(phoneDigits("+91 98765 43210")).toBe("919876543210");
    expect(phoneDigits("09876543210")).toBe("919876543210");
    expect(phoneDigits("123")).toBeNull();
  });

  it("builds a WhatsApp link with encoded message", () => {
    const link = buildWhatsAppLink("9876543210", "Hi there!");
    expect(link).toBe("https://wa.me/919876543210?text=Hi%20there!");
  });

  it("returns null links for missing contact details", () => {
    expect(buildWhatsAppLink(null, "hi")).toBeNull();
    expect(buildTelLink("")).toBeNull();
    expect(buildMailLink("not-an-email", "s", "b")).toBeNull();
    expect(buildMailLink("a@b.com", "Hello", "Body")).toBe(
      "mailto:a@b.com?subject=Hello&body=Body",
    );
  });
});

describe("formatAgentPropertyPrice", () => {
  it("formats crore and lakh values", () => {
    expect(formatAgentPropertyPrice(12500000)).toBe("₹1.25 Cr");
    expect(formatAgentPropertyPrice(450000)).toBe("₹4.50 L");
    expect(formatAgentPropertyPrice(0)).toBe("Price on Request");
    expect(formatAgentPropertyPrice(null)).toBe("Price on Request");
  });
});
