import { describe, expect, it } from "vitest";
import { validateCoupon, distributeCouponDiscount } from "./hotelCoupon";

const rejected = (message: string) => ({ rpc: async () => ({ data: null, error: { message } }) });
describe("Server coupon validation", () => {
  it("uses the booking hotel, rooms, stay dates and amount for global validation", async () => {
    let args: unknown;
    const sb = { rpc: async (name: string, input: unknown) => { expect(name).toBe("validate_hotel_coupon"); args = input; return { data: { id: "coupon", code: "GLOBAL10", discount: 250 }, error: null }; } };
    expect(await validateCoupon(sb, "GLOBAL10", "hotel", ["room"], "2026-11-01", "2026-11-03", 2500)).toEqual({ id: "coupon", code: "GLOBAL10", discount: 250 });
    expect(args).toEqual({ _code: "GLOBAL10", _hotel_id: "hotel", _room_ids: ["room"], _check_in: "2026-11-01", _check_out: "2026-11-03", _room_total: 2500 });
  });
  it("rejects coupons for other hotels", async () => {
    await expect(validateCoupon(rejected("Coupon does not apply to this hotel"), "HOTEL10", "other", ["room"], "2026-11-01", "2026-11-03", 2500)).rejects.toThrow("Coupon does not apply to this hotel");
  });
  it("rejects expired coupons", async () => {
    await expect(validateCoupon(rejected("Coupon is expired or not yet valid"), "OLD10", "hotel", ["room"], "2026-11-01", "2026-11-03", 2500)).rejects.toThrow("Coupon is expired");
  });
  it("rejects exhausted usage limits", async () => {
    await expect(validateCoupon(rejected("Coupon usage limit reached"), "LIMIT10", "hotel", ["room"], "2026-11-01", "2026-11-03", 2500)).rejects.toThrow("usage limit");
  });
  it("rejects unmet booking conditions", async () => {
    await expect(validateCoupon(rejected("Stay does not meet coupon booking conditions"), "LONG10", "hotel", ["room"], "2026-11-01", "2026-11-02", 2500)).rejects.toThrow("booking conditions");
  });
  it("rejects invalid or inactive coupons rather than silently ignoring them", async () => {
    await expect(validateCoupon(rejected("Coupon is invalid or inactive"), "BAD", "hotel", ["room"], "2026-11-01", "2026-11-02", 2500)).rejects.toThrow("invalid or inactive");
  });
  it("applies the discount once across multiple rooms and preserves paise", () => {
    expect(distributeCouponDiscount(359.82, [1000, 1999])).toEqual([119.98, 239.84]);
  });
});