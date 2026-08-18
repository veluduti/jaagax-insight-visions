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
  it("submits into the country queue (country is the entry level)", () => {
    expect(SUBMIT_LEVEL).toBe("country");
    expect(ESCALATION_CHAIN[0]).toBe("country");
  });

  it("escalates country -> state -> district -> super admin", () => {
    expect(nextLevel("country")).toBe("state");
    expect(nextLevel("state")).toBe("district");
    expect(nextLevel("district")).toBeNull();
  });

  it("maps each queue level to its admin role and lifecycle status", () => {
    expect(levelRole("district")).toBe("district_admin");
    expect(levelRole("state")).toBe("state_admin");
    expect(levelRole("country")).toBe("country_admin");
    expect(lifecycleStatusForLevel("district")).toBe("district_queue");
    expect(lifecycleStatusForLevel("state")).toBe("state_queue");
    expect(lifecycleStatusForLevel("country")).toBe("country_queue");
  });

  it("walks every level then auto-assigns an agent when nobody acts", () => {
    const res = simulateEscalation({ country: 2, state: 1, district: 1 });
    expect(res.visited).toEqual(["country", "state", "district"]);
    expect(res.skipped).toEqual([]);
    expect(res.finalTarget).toBe("agent");
  });

  it("falls back to super admin after the district level when no agent exists", () => {
    const res = simulateEscalation({ country: 2, state: 1, district: 1 }, { agentAvailable: false });
    expect(res.finalTarget).toBe("super_admin");
  });

  it("stops at the level where an admin acts", () => {
    expect(simulateEscalation({ country: 1, state: 1, district: 1 }, { actsAt: "country" })).toEqual({
      visited: ["country"],
      skipped: [],
      finalTarget: "country",
    });
    expect(simulateEscalation({ country: 1, state: 1, district: 1 }, { actsAt: "state" }).finalTarget).toBe("state");
  });

  it("skips levels that have no eligible admins", () => {
    const res = simulateEscalation({ country: 0, state: 0, district: 1 }, { actsAt: "district" });
    expect(res.skipped).toEqual(["country", "state"]);
    expect(res.visited).toEqual(["district"]);
    expect(res.finalTarget).toBe("district");
  });

  it("skips every empty level and lands on an agent", () => {
    const res = simulateEscalation({});
    expect(res.visited).toEqual([]);
    expect(res.skipped).toEqual(["country", "state", "district"]);
    expect(res.finalTarget).toBe("agent");
  });

  it("auto-assigns the best matched agent when the ladder is exhausted and needs_agent is true", () => {
    const res = simulateEscalation({ country: 1, state: 1, district: 1 }, { needsAgent: true });
    expect(res.visited).toEqual(["country", "state", "district"]);
    expect(res.finalTarget).toBe("agent");
  });

  it("falls back to super admin when needs_agent is true but no agent is available", () => {
    const res = simulateEscalation(
      { country: 1, state: 1, district: 1 },
      { needsAgent: true, agentAvailable: false },
    );
    expect(res.finalTarget).toBe("super_admin");
  });

  it("never routes a fresh submission to the district admin first", () => {
    const res = simulateEscalation({ country: 1, state: 1, district: 1 }, { actsAt: null });
    expect(res.visited[0]).not.toBe("district");
    expect(res.visited[0]).toBe("country");
  });
});
