import { describe, it, expect } from "vitest";
import { bedsInRoom, pgMetrics } from "./pgDashboardMetrics";

describe("PG dashboard metrics", () => {
  it("counts beds per unit for bed-sold rooms and units × occupancy otherwise", () => {
    expect(bedsInRoom({ id: "a", room_type: "Dorm", total_units: 10, max_occupancy: 6, sell_by: "bed" })).toBe(10);
    expect(bedsInRoom({ id: "b", room_type: "Double", total_units: 5, max_occupancy: 2 })).toBe(10);
  });
  it("occupancy and collection come only from current stays and this month's dues", () => {
    const m = pgMetrics([{ id: "b", room_type: "Double", total_units: 5, max_occupancy: 2 }],
      [{ id: "1", room_id: "b", status: "active", move_in: "2026-11-01", move_out: null, created_at: "" },
       { id: "2", room_id: "b", status: "moved_out", move_in: "2026-10-01", move_out: "2026-11-05", created_at: "" }],
      [{ amount: 1000, due_date: "2026-11-05", status: "paid", period_month: "2026-11-01", paid_at: "x" },
       { amount: 1000, due_date: "2026-11-05", status: "due", period_month: "2026-11-01", paid_at: null }], 1, "2026-11-17");
    expect(m).toMatchObject({ totalBeds: 10, occupied: 1, available: 8, occupancyPct: 10, residents: 1, moveOuts: 1, collected: 1000, due: 1000, collectionRate: 50, overdue: 1000 });
  });
});
