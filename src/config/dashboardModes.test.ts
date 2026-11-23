import { describe, it, expect } from "vitest";
import { modesForTypes, resolveMode, navForMode } from "./dashboardModes";

describe("dashboard modes", () => {
  it("PG property opens the PG dashboard", () => expect(resolveMode(["pg"], null)).toBe("pg"));
  it("hostel property opens the hostel dashboard", () => expect(resolveMode(["hostel"], null)).toBe("hostel"));
  it("property with no types falls back to hotel", () => expect(resolveMode([], null)).toBe("hotel"));
  it("saved choice is used only when the property supports it", () => {
    expect(resolveMode(["hotel", "pg"], "pg")).toBe("pg");
    expect(resolveMode(["hotel"], "pg")).toBe("hotel");
  });
  it("lists each supported dashboard once", () => expect(modesForTypes(["hotel", "boutique", "hostel"])).toEqual(["hotel", "hostel"]));
  it("PG sidebar has residents and mess, not banquets", () => {
    const labels = navForMode("pg").map(i => i.label);
    expect(labels).toContain("Residents");
    expect(labels).toContain("Mess / Dining");
    expect(labels).not.toContain("Events & Banquets");
  });
});
