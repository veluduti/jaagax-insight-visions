/** Mark up original room tariffs once, retaining two currency decimals. */
export function markedPrice(amount: number, percentage: number): number {
  if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(percentage) || percentage < 0) throw new Error("Invalid hotel price or markup");
  return Math.round((amount * (1 + percentage / 100) + Number.EPSILON) * 100) / 100;
}

export async function loadHotelMarkup(sb: any, hotelId: string): Promise<number> {
  const { data, error } = await sb.rpc("effective_hotel_markup", { _hotel_id: hotelId });
  if (error || data == null) throw new Error("Hotel pricing is temporarily unavailable");
  return Number(data);
}

export function supplierMarkupCollectable(percentage: number): boolean {
  // charge=false forwards a guarantee, not collection of JaagaX's margin.
  return percentage === 0;
}