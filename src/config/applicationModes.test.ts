import { describe, it, expect } from "vitest";
import { applicationConfig, pipelineCounts, findDuplicate } from "./applicationModes";

describe("applications & leads", () => {
  it("PG pipeline includes verification, waitlist and dropped", () => {
    const keys = applicationConfig("pg").stages.map(s => s.key);
    expect(keys).toEqual(["new", "contacted", "visit", "application", "verification", "approved", "converted", "waitlist", "dropped"]);
  });
  it("hotels use booking stages", () => {
    expect(applicationConfig("hotel").stages.map(s => s.key)).toContain("quoted");
    expect(applicationConfig("hotel").long).toBe(false);
  });
  it("counts KPIs by stage", () => {
    const c = pipelineCounts(["new", "application", "visit", "dropped", "lost", "waitlist"], 2);
    expect(c).toMatchObject({ total: 6, inProcess: 1, visits: 1, dropped: 2, waitlist: 1, converted: 2 });
  });
  it("detects duplicates by phone digits or email", () => {
    const rows = [{ id: "a", phone: "+91 98765 43210", email: null }, { id: "b", phone: null, email: "X@y.com" }];
    expect(findDuplicate(rows, "9876543210")?.id).toBe("a");
    expect(findDuplicate(rows, null, "x@Y.com")?.id).toBe("b");
    expect(findDuplicate(rows, "9876543210", null, "a")).toBeUndefined();
  });
});
