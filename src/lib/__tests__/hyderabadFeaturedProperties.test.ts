import { describe, expect, it, vi } from "vitest";

const rows = [
  { id: "moosapet", title: "Moosapet flat", city: "Medchal", type: null, verified: true, is_live: true },
  { id: "balanagar", title: "Balanagar flat", city: "Medchal", type: null, verified: false, is_live: false },
  { id: "dilsukhnagar", title: "Dilsukhnagar penthouse", city: "Hyderabad", type: null, verified: true, is_live: true },
];

vi.mock("@/integrations/supabase/client", () => {
  const query: Record<string, any> = {};
  for (const name of ["select", "neq", "not", "order", "limit"]) query[name] = () => query;
  query.then = (resolve: any) => Promise.resolve({ data: rows, error: null }).then(resolve);
  return { supabase: { from: () => query, rpc: vi.fn(async () => ({ data: [], error: null })) } };
});

import { getFeaturedProperties } from "@/services/propertyService";

describe("Hyderabad approved featured listings", () => {
  it("includes approved nearby legacy listings even when type is missing, but excludes pending approval", async () => {
    expect((await getFeaturedProperties("Hyderabad")).map(p => p.id)).toEqual(["moosapet", "dilsukhnagar"]);
  });
});