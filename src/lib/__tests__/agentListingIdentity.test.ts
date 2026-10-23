import { describe, expect, it } from "vitest";
import { withAgentListingIdentity } from "../agentListingIdentity";
import { createConversationEngine } from "@/engines/conversationEngine";
import { propertyFlows } from "@/config/propertyFlows";
import type { PropertyCategory } from "@/engines/types";

describe("signed-in agent listing identity", () => {
  it("selects Agent even when a draft or description says Owner", () => {
    expect(withAgentListingIdentity({ listed_by: "Owner" }, true).listed_by).toBe("Agent");
    expect(withAgentListingIdentity({}, true)).toEqual({ listed_by: "Agent" });
  });
  it("preserves identity choices for non-agents", () => {
    expect(withAgentListingIdentity({}, false)).toEqual({});
    expect(withAgentListingIdentity({ listed_by: "Builder" }, false).listed_by).toBe("Builder");
  });
  for (const category of Object.keys(propertyFlows) as PropertyCategory[]) {
    if (!propertyFlows[category].fields.listed_by) continue;
    it(`skips the identity question for ${category}`, () => {
      const engine = createConversationEngine(category);
      engine.applyExtractedFields(withAgentListingIdentity({}, true), { overwrite: true });
      expect(engine.getState().answers.listed_by).toBe("Agent");
      for (const id of Object.keys(engine.flow.fields)) {
        if (id !== "listed_by") engine.skipField(id);
      }
      expect(engine.next().field?.id).not.toBe("listed_by");
    });
  }
});