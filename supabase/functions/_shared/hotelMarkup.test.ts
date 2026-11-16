import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { markedPrice, loadHotelMarkup, supplierMarkupCollectable } from "./hotelMarkup";
import { customerPrice } from "./channel/travelRules";
import { markRoom } from "../../../src/services/hospitality/markupService";
import { buildServerQuote } from "./hotelQuote";

describe("Hotel markup pricing", () => {
  it("applies a hotel percentage to its room price", () => expect(markedPrice(1000, 15)).toBe(1150));
  it("applies the global percentage to hotels without overrides", () => expect(markRoom({ hotel_id: "manual", base_price: 1000 }, { manual: 10 }).base_price).toBe(1100));
  it("uses a zero-percent hotel override without adding the global markup", () => expect(markRoom({ hotel_id: "manual", base_price: 1000 }, { manual: 0 }).base_price).toBe(1000));
  it("recalculates updates from original tariffs rather than compounded prices", () => { const room = { hotel_id: "h", base_price: 1000 }; expect(markRoom(room, { h: 10 }).base_price).toBe(1100); expect(markRoom(room, { h: 20 }).base_price).toBe(1200); expect(room.base_price).toBe(1000); });
  it("retains currency decimals", () => expect(markedPrice(1999, 18)).toBe(2358.82));
  it("applies the same percentage to weekly and monthly room rent", () => expect(markRoom({ hotel_id: "h", weekly_price: 1000, monthly_price: 4000 }, { h: 10 })).toMatchObject({ weekly_price: 1100, monthly_price: 4400 }));
  it("fails closed if authoritative pricing cannot be read", async () => { await expect(loadHotelMarkup({ rpc: async () => ({ error: { message: "offline" }, data: null }) }, "h")).rejects.toThrow("unavailable"); });
  it("uses server-marked HyperGuest retail without replacing supplier payable amounts", () => { const rate = { prices: { sell: { price: 100, currency: "USD" }, bar: { price: 110, currency: "USD" } }, payment: { chargeAmount: { price: 100, currency: "USD" } }, jaagaxRetail: { amount: 121, currency: "USD" } }; expect(customerPrice(rate, "USD")).toEqual({ amount: 121, currency: "USD" }); expect(rate.payment.chargeAmount.price).toBe(100); });
  it("keeps nonzero supplier markup collection blocked", () => expect(supplierMarkupCollectable(10)).toBe(false));
  it("retains existing zero-markup supplier booking path", () => expect(supplierMarkupCollectable(0)).toBe(true));
  it("rejects negative markups", () => expect(() => markedPrice(1000, -1)).toThrow("Invalid"));
  it("uses marked tariffs in authoritative quote totals before tax", async () => {
    const rows: Record<string, any> = { hotel_rooms: { id: "r", hotel_id: "h", base_price: 1000, max_occupancy: 2, max_adults: 2, total_units: 1, is_active: true }, partner_hotels: { id: "h", is_active: true, gst_rate: 12 } };
    const sb = { from: (table: string) => { const chain: any = { select: () => chain, eq: () => chain, gte: () => chain, lte: () => chain, maybeSingle: async () => ({ data: rows[table] }), then: (resolve: any) => Promise.resolve({ data: [] }).then(resolve) }; return chain; }, rpc: async (name: string) => ({ data: name === "effective_hotel_markup" ? 10 : 1 }) };
    const result = await buildServerQuote(sb, { hotel_id: "h", room_id: "r", check_in: "2026-11-20", check_out: "2026-11-21", adults: 2 });
    expect(result.result?.perNight).toBe(1100);
    expect(result.result?.grandTotal).toBe(1232);
    expect(rows.hotel_rooms.base_price).toBe(1000);
  });
});