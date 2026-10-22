import { describe, expect, it } from "vitest";
import { workflowHandoffMessage } from "../workflowHandoff";
import { nextLevel, simulateEscalation } from "../workflowEscalation";

describe("state release handoff", () => {
  it("moves a released state queue to the eligible district queue", () => {
    expect(nextLevel("state")).toBe("district");
    expect(simulateEscalation({ country: 1, state: 1, district: 1 }, { actsAt: "district" }).finalTarget).toBe("district");
  });
  it("does not report a district handoff when the server skipped it", () => {
    expect(workflowHandoffMessage({ escalated_to: "super_admin" })).toContain("Global Admin");
    expect(workflowHandoffMessage({ level: "district" })).toContain("District admin");
  });
  it("does not treat a server error as a successful release", () => {
    expect(() => workflowHandoffMessage({ error: "property_not_found" })).toThrow("property_not_found");
  });
});