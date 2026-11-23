import { describe, it, expect } from "vitest";
import { residentConfig, bucketOf } from "./residentModes";

describe("residentConfig", () => {
  it("PG uses resident wording and resident lead stages", () => {
    const c = residentConfig("pg");
    expect(c.addLabel).toBe("Add Resident");
    expect(c.stages.map(s => s.label)).toEqual(["New Leads", "Contacted", "Visit Scheduled", "Application", "Converted"]);
  });
  it("hotel uses guest wording, booking stages and bookings only", () => {
    const c = residentConfig("hotel");
    expect(c.person).toBe("Guest");
    expect(c.sources).toEqual(["bookings"]);
    expect(c.stages[c.stages.length - 1].label).toBe("Booking Confirmed");
  });
  it("hybrid hotel + PG also reads long stays", () => {
    expect(residentConfig("hotel", ["hotel", "pg"]).sources).toEqual(["bookings", "stays"]);
  });
});

describe("bucketOf", () => {
  const t = "2026-11-23";
  it("moved-out residents are alumni", () => expect(bucketOf({ kind: "stay", status: "moved_out", start: "2026-01-01", end: "2026-05-01" }, t)).toBe("alumni"));
  it("future confirmed booking is upcoming", () => expect(bucketOf({ kind: "booking", status: "confirmed", start: "2026-12-01", end: "2026-12-03" }, t)).toBe("upcoming"));
  it("pending stay is an application", () => expect(bucketOf({ kind: "stay", status: "pending_payment", start: "2026-12-01", end: null }, t)).toBe("application"));
  it("active resident with open end is current", () => expect(bucketOf({ kind: "stay", status: "active", start: "2026-11-01", end: null }, t)).toBe("current"));
});
