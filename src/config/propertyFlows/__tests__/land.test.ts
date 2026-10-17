import { describe, expect, it } from "vitest";
import { landFlow } from "../land";
import { agriculturalFlow } from "../agriculture";
import { createRuleEngine } from "../../../engines/ruleEngine";
import type { ConversationState } from "../../../engines/types";

describe("List Your Land category rules", () => {
  it("keeps multiple applicable farming land types available", () => {
    expect(landFlow.fields.agricultural_land_type.type).toBe("multi_select");
    expect(landFlow.fields.agricultural_land_type.options).toEqual(
      agriculturalFlow.fields.agricultural_land_type.options,
    );
  });

  it("keeps sale pricing visible for Sale and legacy Buy answers, not rentals", () => {
    const engine = createRuleEngine(landFlow);
    for (const fieldId of ["total_price", "price_per_unit"]) {
      const rule = landFlow.fields[fieldId].visibleIf;
      if (!rule) throw new Error(`${fieldId} needs a visibility rule`);
      for (const intent of ["Sale", "Buy", "Rent", "Lease", "Partnership"]) {
        const state = { answers: { listing_type: intent } } as ConversationState;
        expect(engine.evaluateVisibilityRule(rule, state)).toBe(["Sale", "Buy"].includes(intent));
      }
    }
  });
});