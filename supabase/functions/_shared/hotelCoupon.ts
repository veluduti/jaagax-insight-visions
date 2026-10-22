export async function validateCoupon(sb: any, code: string, hotelId: string, roomIds: string[], checkIn: string, checkOut: string, roomTotal: number) {
  const { data, error } = await sb.rpc("validate_hotel_coupon", {
    _code: code, _hotel_id: hotelId, _room_ids: roomIds,
    _check_in: checkIn, _check_out: checkOut, _room_total: roomTotal,
  });
  if (error || !data?.id) throw new Error(error?.message || "Coupon could not be validated");
  return data as { id: string; code: string; discount: number };
}

export function distributeCouponDiscount(amount: number, roomCharges: number[]) {
  let remaining = Math.round(amount * 100);
  const total = roomCharges.reduce((s, n) => s + n, 0);
  return roomCharges.map((n, i) => {
    const cents = i === roomCharges.length - 1 ? remaining : Math.min(remaining, Math.round(amount * 100 * n / total));
    remaining -= cents;
    return cents / 100;
  });
}