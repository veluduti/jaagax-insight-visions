import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { readSettings, defaultCode, groupSettingsSchema } from "./propertyGroupsService";
describe("property group settings", () => {
  it("defaults commission to 15% and private visibility", () => { const s = readSettings({}); expect(s.default_commission).toBe(15); expect(s.visibility).toBe("private"); });
  it("rejects commission above 50%", () => { expect(groupSettingsSchema.safeParse({ default_commission: 60 }).success).toBe(false); });
  it("rejects descriptions over 250 characters", () => { expect(groupSettingsSchema.safeParse({ description: "x".repeat(251) }).success).toBe(false); });
  it("builds a code from initials", () => { expect(defaultCode("Raintree Hotels & Resorts")).toBe("RHR"); });
});
