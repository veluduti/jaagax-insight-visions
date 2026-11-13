import { describe, it, expect, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
const invoke = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc, functions: { invoke } } }));
import { loadDiscoveryAvailability, loadDiscoveryQuotes } from "./discoveryAvailabilityService";

describe("discovery calendar availability", () => {
  it("uses canonical date counts including sold-out rooms", async () => {
    rpc.mockResolvedValueOnce({ data: 0, error: null }).mockResolvedValueOnce({ data: 2, error: null });
    expect(await loadDiscoveryAvailability(["sold-out", "available"], "2026-10-27", "2026-11-27")).toEqual({ "sold-out": 0, available: 2 });
    expect(rpc).toHaveBeenCalledWith("room_free_units", { _room_id: "sold-out", _check_in: "2026-10-27", _check_out: "2026-11-27" });
  });
  it("does not claim availability when the server fails", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: new Error("unavailable") });
    await expect(loadDiscoveryAvailability(["room"], "2026-10-27", "2026-10-28")).rejects.toThrow("unavailable");
  });
  it("uses quoted discounts and included meals rather than legacy hotel claims", async () => {
    invoke.mockResolvedValueOnce({ data: { per_night: 3000, discount: 600, nights: 2, meals: [{ meal_type: "breakfast", included: true }] } });
    const quote = await loadDiscoveryQuotes([{ id: "r", hotel_id: "h", max_occupancy: 2 }], { r: 1 }, "2026-11-20", "2026-11-22", 2, 0);
    expect(quote.r).toEqual({ perNight: 2700, originalPrice: 3000, breakfastIncluded: true, mealsIncluded: true });
  });
  it("hides failed prices and ignores merely optional meals", async () => {
    invoke.mockResolvedValueOnce({ error: new Error("unavailable") });
    expect(await loadDiscoveryQuotes([{ id: "r", hotel_id: "h" }], { r: 1 }, "2026-11-20", "2026-11-21", 2, 0)).toEqual({});
    invoke.mockResolvedValueOnce({ data: { per_night: 2500, meals: [{ meal_type: "breakfast", included: false }] } });
    expect((await loadDiscoveryQuotes([{ id: "r", hotel_id: "h" }], { r: 1 }, "2026-11-20", "2026-11-21", 2, 0)).r.breakfastIncluded).toBe(false);
  });
});