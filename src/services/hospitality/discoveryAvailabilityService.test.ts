import { describe, it, expect, vi } from "vitest";
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { loadDiscoveryAvailability } from "./discoveryAvailabilityService";

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
});