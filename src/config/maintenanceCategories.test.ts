import { describe, it, expect } from "vitest";
import { categoriesForModes, dueFrom, slaOnTime, ticketState } from "./maintenanceCategories";

describe("maintenance config", () => {
  it("PG gets water purifier, resort gets pool, hotel gets neither", () => {
    expect(categoriesForModes(["pg"]).map(c => c.key)).toContain("water_purifier");
    expect(categoriesForModes(["resort"]).map(c => c.key)).toContain("pool");
    const h = categoriesForModes(["hotel"]).map(c => c.key);
    expect(h).not.toContain("pool"); expect(h).not.toContain("water_purifier");
  });
  it("high priority is due in 4 hours", () => {
    expect(dueFrom(new Date("2026-11-18T10:00:00Z"), "high").toISOString()).toBe("2026-11-18T14:00:00.000Z");
  });
  it("open ticket past due is overdue; done is completed", () => {
    expect(ticketState({ status: "open", due_at: "2020-01-01", completed_at: null })).toBe("overdue");
    expect(ticketState({ status: "done", due_at: "2020-01-01", completed_at: "2021-01-01" })).toBe("completed");
  });
  it("SLA on-time percentage", () => {
    expect(slaOnTime([{ status: "done", due_at: "2026-01-02", completed_at: "2026-01-01" }, { status: "done", due_at: "2026-01-01", completed_at: "2026-01-02" }])).toBe(50);
  });
});
