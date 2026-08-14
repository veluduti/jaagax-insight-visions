import { describe, expect, it } from "vitest";
import {
  ESCALATION_CHAIN,
  SUBMIT_LEVEL,
  levelRole,
  lifecycleStatusForLevel,
  nextLevel,
  simulateEscalation,
} from "@/lib/workflowEscalation";

describe("property review escalation ladder", () => {
  it("submits into the district queue (district is the operational owner)", () => {
    expect(SUBMIT_LEVEL).toBe("district");
    expect(ESCALATION_CHAIN[0]).toBe("district");
  });

  it("escalates district -> state -> country -> super admin", () => {
    expect(nextLevel("district")).toBe("state");
    expect(nextLevel("state")).toBe("country");
    expect(nextLevel("country")).toBeNull();
  });

  it("maps each queue level to its admin role and lifecycle status", () => {
    expect(levelRole("district")).toBe("district_admin");
    expect(levelRole("state")).toBe("state_admin");
    expect(levelRole("country")).toBe("country_admin");
    expect(lifecycleStatusForLevel("district")).toBe("district_queue");
    expect(lifecycleStatusForLevel("state")).toBe("state_queue");
    expect(lifecycleStatusForLevel("country")).toBe("country_queue");
  });

  it("walks every level then reaches super admin when nobody acts", () => {
    const res = simulateEscalation({ district: 2, state: 1, country: 1 });
    expect(res.visited).toEqual(["district", "state", "country"]);
    expect(res.skipped).toEqual([]);
    expect(res.finalTarget).toBe("super_admin");
  });

  it("stops at the level where an admin acts", () => {
    expect(simulateEscalation({ district: 1, state: 1, country: 1 }, { actsAt: "district" })).toEqual({
      visited: ["district"],
      skipped: [],
      finalTarget: "district",
    });
    expect(simulateEscalation({ district: 1, state: 1, country: 1 }, { actsAt: "state" }).finalTarget).toBe("state");
  });

  it("skips levels that have no eligible admins", () => {
    const res = simulateEscalation({ district: 0, state: 0, country: 1 }, { actsAt: "country" });
    expect(res.skipped).toEqual(["district", "state"]);
    expect(res.visited).toEqual(["country"]);
    expect(res.finalTarget).toBe("country");
  });

  it("goes straight to super admin when no admins exist anywhere", () => {
    const res = simulateEscalation({});
    expect(res.visited).toEqual([]);
    expect(res.skipped).toEqual(["district", "state", "country"]);
    expect(res.finalTarget).toBe("super_admin");
  });

  it("never routes a fresh submission to the country admin first", () => {
    const res = simulateEscalation({ district: 1, state: 1, country: 1 }, { actsAt: null });
    expect(res.visited[0]).not.toBe("country");
    expect(res.visited[0]).toBe("district");
  });
});
