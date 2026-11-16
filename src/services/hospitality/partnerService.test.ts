import { beforeEach, describe, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ error: null as null | { message: string }, insert: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => {
    const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: null, error: fixture.error }),
      insert: fixture.insert };
    return q;
  },
} }));
import { getOrCreatePartnerAccount } from "./partnerService";
beforeEach(() => fixture.insert.mockClear());
describe("portfolio account read failures", () => {
  it("does not create duplicate accounts after a failed read", async () => {
    fixture.error = { message: "Temporary read failure" };
    await expect(getOrCreatePartnerAccount("owner", "Hotel group")).rejects.toEqual(fixture.error);
    expect(fixture.insert).not.toHaveBeenCalled();
  });
});