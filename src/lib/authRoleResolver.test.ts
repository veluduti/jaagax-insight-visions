import { beforeEach, describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({
  scope: null as string | null,
  legacy: [] as Array<{ role: string }>,
  requested: "customer",
  missing: true,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: fixtures.scope, error: null })),
    from: (table: string) => {
      const result = table === "user_roles"
        ? { data: fixtures.legacy, error: fixtures.missing ? { code: "PGRST205" } : null }
        : { data: { status: "approved", requested_role: fixtures.requested }, error: null };
      const query: any = {
        select: () => query, eq: () => query, order: () => query,
        limit: () => query, maybeSingle: async () => result,
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
  },
}));

import { resolveUserAccess } from "./authRoleResolver";

beforeEach(() => {
  fixtures.scope = null;
  fixtures.legacy = [];
  fixtures.requested = "customer";
  fixtures.missing = true;
});

describe("authoritative admin dashboard access", () => {
  it("opens global admin access even when the retired role table is absent", async () => {
    fixtures.scope = "global_admin";
    const access = await resolveUserAccess("global-admin");
    expect(access.resolvedRole).toBe("admin");
    expect(access.assignedRoles).toEqual(["admin"]);
    expect(access.hasAssignedRole).toBe(true);
  });
  it.each(["country_admin", "state_admin", "district_admin"])("retains the %s scope", async (scope) => {
    fixtures.scope = scope;
    expect((await resolveUserAccess("regional-admin")).resolvedRole).toBe(scope);
  });
  it("does not grant admin access from a signup request or a legacy assignment", async () => {
    fixtures.requested = "admin";
    fixtures.legacy = [{ role: "admin" }];
    fixtures.missing = false;
    expect((await resolveUserAccess("not-an-admin")).resolvedRole).toBeNull();
  });
  it("preserves an agent identity alongside an active admin scope", async () => {
    fixtures.scope = "district_admin";
    fixtures.legacy = [{ role: "agent" }];
    fixtures.missing = false;
    expect((await resolveUserAccess("dual-role")).assignedRoles).toEqual(["district_admin", "agent"]);
  });
});