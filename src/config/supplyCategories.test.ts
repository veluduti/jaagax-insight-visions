import { describe, it, expect } from "vitest";
import { categoriesForModes, stockStatus } from "./supplyCategories";

describe("supply categories", () => {
  it("PG gets mess & kitchen, hotel gets minibar, hybrid gets both", () => {
    expect(categoriesForModes(["pg"]).map(c => c.key)).toContain("kitchen");
    expect(categoriesForModes(["pg"]).map(c => c.key)).not.toContain("minibar");
    const hybrid = categoriesForModes(["hotel", "pg"]).map(c => c.key);
    expect(hybrid).toContain("kitchen"); expect(hybrid).toContain("minibar");
  });
  it("stock status", () => {
    expect(stockStatus({ current_stock: 0, reorder_level: 10, min_level: 5 })).toBe("out");
    expect(stockStatus({ current_stock: 18, reorder_level: 40, min_level: 20 })).toBe("low");
    expect(stockStatus({ current_stock: 120, reorder_level: 100, min_level: 50 })).toBe("healthy");
  });
});
