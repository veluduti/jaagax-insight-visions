export function roomCapacity(room: { total_units?: number | null; number_of_available_rooms?: number | null }): number {
  return Math.max(0, room.total_units ?? room.number_of_available_rooms ?? 1);
}

export function calendarFreeUnits(
  room: { id: string; total_units?: number | null; number_of_available_rooms?: number | null; is_active?: boolean | null },
  day: string,
  blocks: { room_id: string; unit_id?: string | null; start_date: string; end_date: string; units: number }[],
  units: { id: string; room_id: string; status: string }[],
): number {
  if (room.is_active === false) return 0;
  const occupied = blocks.filter(b => b.room_id === room.id && b.start_date <= day && b.end_date > day);
  const unavailable = units.filter(u => u.room_id === room.id && ["maintenance", "inactive"].includes(u.status)
    && !occupied.some(b => b.unit_id === u.id)).length;
  return Math.max(0, roomCapacity(room) - unavailable - occupied.reduce((sum, b) => sum + b.units, 0));
}

export function savedBasePrice(value: unknown, longStay: boolean): number {
  return longStay ? 0 : Math.max(0, Number(value) || 0);
}

export function discoveryNightlyPrice(room: { base_price?: number | null; monthly_price?: number | null; weekly_price?: number | null }, longStay: boolean): number {
  return longStay
    ? Math.round(Number(room.monthly_price) / 30) || Math.round(Number(room.weekly_price) / 7) || 0
    : savedBasePrice(room.base_price, false);
}