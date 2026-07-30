// Occupancy-aware room selection helpers for the hotel booking engine.
// Pure functions — no DB / React dependencies so they can be unit tested and
// reused by the checkout flow.

export interface OccupancyRoom {
  id: string;
  room_type: string;
  max_occupancy: number;
  /** Rooms of this type actually bookable for the selected dates. */
  available: number;
  /** Effective per-night price (after pricing rules) for one room. */
  perNight: number;
}

export interface ComboItem {
  room: OccupancyRoom;
  quantity: number;
}

export interface RoomCombination {
  items: ComboItem[];
  totalRooms: number;
  /** Sum of perNight across all rooms in the combination (per night). */
  perNightTotal: number;
  capacity: number;
  /** capacity - guests. Lower is a better fit. */
  wastedCapacity: number;
  key: string;
}

/** Rooms that can host all guests on their own (with the requested room count). */
export function roomsFittingGuests<T extends { max_occupancy: number }>(
  rooms: T[],
  guests: number,
  roomsWanted = 1,
): T[] {
  const perRoom = Math.max(1, Math.ceil(guests / Math.max(1, roomsWanted)));
  return rooms.filter((r) => Number(r.max_occupancy || 0) >= perRoom);
}

/**
 * Generate valid multi-room combinations that seat `guests`, respecting each
 * room type's available inventory. Combinations are minimal: removing any one
 * room would drop capacity below the guest count.
 */
export function buildRoomCombinations(
  rooms: OccupancyRoom[],
  guests: number,
  opts: { maxRooms?: number; limit?: number } = {},
): RoomCombination[] {
  const maxRooms = opts.maxRooms ?? 4;
  const limit = opts.limit ?? 6;

  const pool = rooms
    .filter((r) => Number(r.max_occupancy) > 0 && Number(r.available) > 0)
    .sort((a, b) => b.max_occupancy - a.max_occupancy);

  if (!pool.length || guests <= 0) return [];

  const results: RoomCombination[] = [];
  const seen = new Set<string>();

  const walk = (startIdx: number, counts: number[], roomCount: number, capacity: number, price: number) => {
    if (results.length > 400) return;
    if (capacity >= guests) {
      const items: ComboItem[] = [];
      counts.forEach((c, i) => { if (c > 0) items.push({ room: pool[i], quantity: c }); });
      // Minimality: dropping any single room must break the capacity requirement.
      const minimal = items.every((it) => capacity - it.room.max_occupancy < guests);
      if (minimal) {
        const key = items.map((i) => `${i.room.id}x${i.quantity}`).join("|");
        if (!seen.has(key)) {
          seen.add(key);
          results.push({
            items, totalRooms: roomCount, perNightTotal: price,
            capacity, wastedCapacity: capacity - guests, key,
          });
        }
      }
      return;
    }
    if (roomCount >= maxRooms) return;
    for (let i = startIdx; i < pool.length; i++) {
      if (counts[i] >= pool[i].available) continue;
      counts[i] += 1;
      walk(i, counts, roomCount + 1, capacity + pool[i].max_occupancy, price + pool[i].perNight);
      counts[i] -= 1;
    }
  };

  walk(0, new Array(pool.length).fill(0), 0, 0, 0);

  results.sort((a, b) =>
    a.totalRooms - b.totalRooms ||
    a.perNightTotal - b.perNightTotal ||
    a.wastedCapacity - b.wastedCapacity,
  );

  return results.slice(0, limit);
}

export function comboLabel(combo: RoomCombination): string {
  return combo.items.map((i) => `${i.room.room_type} ×${i.quantity}`).join(" + ");
}
