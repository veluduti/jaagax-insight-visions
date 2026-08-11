// Occupancy-aware room selection engine for the hotel booking flow.
// Pure functions — no DB / React dependency so they can be unit-tested and
// reused by both the search results and the checkout flow.
//
// Every rule here comes from the Hotel Manager room configuration:
//   max_adults, max_children, max_occupancy, available inventory.
// Nothing is hard-coded.

export interface OccupancyRoom {
  id: string;
  room_type: string;
  /** Max adults per unit (falls back to max_occupancy when not configured). */
  maxAdults: number;
  /** Max children per unit (falls back to max_occupancy - 1, min 0). */
  maxChildren: number;
  /** Max total guests per unit. */
  maxTotal: number;
  /** Units actually bookable for EVERY night of the stay. */
  available: number;
  /** Effective per-night price for one unit (rate calendar aware). */
  perNight: number;
  extraBedAllowed?: boolean;
  extraBedPrice?: number;
  maxExtraBeds?: number;
  photo?: string | null;
  raw?: any;
}

export interface UnitAllocation {
  roomId: string;
  roomType: string;
  adults: number;
  children: number;
}

export interface ComboItem {
  room: OccupancyRoom;
  quantity: number;
  /** Per-unit guest allocation for this room type. */
  units: UnitAllocation[];
  adults: number;
  children: number;
}

export interface RoomCombination {
  items: ComboItem[];
  totalRooms: number;
  /** Sum of perNight across every unit in the combination. */
  perNightTotal: number;
  capacity: number;
  /** capacity - guests. Lower is a better fit. */
  wastedCapacity: number;
  key: string;
}

/** Normalises a raw `hotel_rooms` row into the occupancy model. */
export function toOccupancyRoom(
  row: any,
  opts: { available: number; perNight: number },
): OccupancyRoom {
  const maxTotal = Number(row.max_occupancy) || Number(row.max_adults) || 1;
  const maxAdults = Number(row.max_adults) || maxTotal;
  const maxChildren = row.max_children == null ? Math.max(0, maxTotal - 1) : Number(row.max_children);
  return {
    id: row.id,
    room_type: row.room_type,
    maxAdults: Math.min(maxAdults, maxTotal),
    maxChildren: Math.min(maxChildren, maxTotal),
    maxTotal,
    available: Math.max(0, Number(opts.available) || 0),
    perNight: Number(opts.perNight) || Number(row.base_price) || 0,
    extraBedAllowed: !!row.extra_bed_allowed,
    extraBedPrice: Number(row.extra_bed_price) || 0,
    maxExtraBeds: Number(row.max_extra_beds) || 0,
    photo: Array.isArray(row.photos) ? row.photos[0] : null,
    raw: row,
  };
}

interface UnitSlot { room: OccupancyRoom; adults: number; children: number }

/**
 * Allocates adults + children across the given units without ever exceeding a
 * unit's max adults / max children / max total. Returns null when the guests
 * cannot legally fit.
 */
export function allocateGuests(
  units: OccupancyRoom[],
  adults: number,
  children: number,
): UnitAllocation[] | null {
  const attempt = (childrenFirst: boolean): UnitAllocation[] | null => {
    const slots: UnitSlot[] = units.map((room) => ({ room, adults: 0, children: 0 }));
    let a = adults;
    let c = children;

    const placeChildren = () => {
      // Prefer units with the largest child allowance first.
      const order = [...slots].sort((x, y) => y.room.maxChildren - x.room.maxChildren);
      for (const s of order) {
        if (c <= 0) break;
        const room = s.room;
        const free = Math.min(
          room.maxChildren - s.children,
          room.maxTotal - s.adults - s.children,
          c,
        );
        if (free > 0) { s.children += free; c -= free; }
      }
    };
    const placeAdults = () => {
      const order = [...slots].sort((x, y) => y.room.maxAdults - x.room.maxAdults);
      for (const s of order) {
        if (a <= 0) break;
        const room = s.room;
        const free = Math.min(
          room.maxAdults - s.adults,
          room.maxTotal - s.adults - s.children,
          a,
        );
        if (free > 0) { s.adults += free; a -= free; }
      }
    };

    if (childrenFirst) { placeChildren(); placeAdults(); }
    else { placeAdults(); placeChildren(); }

    if (a > 0 || c > 0) return null;
    // Every unit in a combination must host at least one guest.
    if (slots.some((s) => s.adults + s.children === 0)) return null;
    return slots.map((s) => ({
      roomId: s.room.id, roomType: s.room.room_type, adults: s.adults, children: s.children,
    }));
  };

  return attempt(true) || attempt(false);
}

/** True when a single unit of this room type can host all requested guests. */
export function roomFitsAlone(room: OccupancyRoom, adults: number, children: number): boolean {
  return (
    room.available >= 1 &&
    adults <= room.maxAdults &&
    children <= room.maxChildren &&
    adults + children <= room.maxTotal
  );
}

function expand(counts: number[], pool: OccupancyRoom[]): OccupancyRoom[] {
  const units: OccupancyRoom[] = [];
  counts.forEach((n, i) => { for (let k = 0; k < n; k++) units.push(pool[i]); });
  return units;
}

/**
 * Generates valid room combinations that legally seat the requested guests,
 * respecting per-room-type inventory. Combinations are minimal: removing any
 * single unit makes the allocation impossible.
 */
export function buildRoomCombinations(
  rooms: OccupancyRoom[],
  adults: number,
  children: number,
  opts: { maxRooms?: number; limit?: number; exactRooms?: number } = {},
): RoomCombination[] {
  const guests = adults + children;
  const maxRooms = opts.exactRooms ?? opts.maxRooms ?? 6;
  const limit = opts.limit ?? 6;

  const pool = rooms
    .filter((r) => r.maxTotal > 0 && r.available > 0)
    .sort((a, b) => b.maxTotal - a.maxTotal);
  if (!pool.length || guests <= 0) return [];

  const results: RoomCombination[] = [];
  const seen = new Set<string>();
  let visited = 0;

  const consider = (counts: number[], roomCount: number, capacity: number, price: number) => {
    const key = counts.map((c, i) => (c ? `${pool[i].id}x${c}` : "")).filter(Boolean).join("|");
    if (seen.has(key)) return;
    const units = expand(counts, pool);
    const allocation = allocateGuests(units, adults, children);
    if (!allocation) return;
    seen.add(key);

    // Group the per-unit allocation back by room type.
    const items: ComboItem[] = [];
    let idx = 0;
    counts.forEach((n, i) => {
      if (!n) return;
      const unitAllocs = allocation.slice(idx, idx + n);
      idx += n;
      items.push({
        room: pool[i],
        quantity: n,
        units: unitAllocs,
        adults: unitAllocs.reduce((s, u) => s + u.adults, 0),
        children: unitAllocs.reduce((s, u) => s + u.children, 0),
      });
    });

    results.push({
      items, totalRooms: roomCount, perNightTotal: price,
      capacity, wastedCapacity: capacity - guests, key,
    });
  };

  const walk = (
    startIdx: number,
    counts: number[],
    roomCount: number,
    capacity: number,
    price: number,
    adultCap: number,
    childCap: number,
  ) => {
    if (visited++ > 4000 || results.length > 300) return;
    if (roomCount > 0) {
      const exact = opts.exactRooms;
      if (exact == null || roomCount === exact) consider(counts, roomCount, capacity, price);
      // Minimality: stop growing only when the current set can actually seat the
      // group — total capacity AND per-type adult / child limits must all cover
      // the request. (A 2-adult room pair has capacity 6 but seats 4 adults.)
      if (
        exact == null &&
        capacity >= guests &&
        adultCap >= adults &&
        childCap >= children
      ) return;
    }
    if (roomCount >= maxRooms) return;
    for (let i = startIdx; i < pool.length; i++) {
      if (counts[i] >= pool[i].available) continue;
      counts[i] += 1;
      walk(
        i,
        counts,
        roomCount + 1,
        capacity + pool[i].maxTotal,
        price + pool[i].perNight,
        adultCap + pool[i].maxAdults,
        childCap + pool[i].maxChildren,
      );
      counts[i] -= 1;
    }
  };

  walk(0, new Array(pool.length).fill(0), 0, 0, 0, 0, 0);


  results.sort((a, b) =>
    a.totalRooms - b.totalRooms ||
    a.perNightTotal - b.perNightTotal ||
    a.wastedCapacity - b.wastedCapacity,
  );

  return results.slice(0, limit);
}

/** Minimum number of rooms needed for the group, or null when impossible. */
export function minimumRoomsRequired(
  rooms: OccupancyRoom[],
  adults: number,
  children: number,
  maxRooms = 6,
): number | null {
  const combos = buildRoomCombinations(rooms, adults, children, { maxRooms, limit: 1 });
  return combos.length ? combos[0].totalRooms : null;
}

export function comboLabel(combo: RoomCombination): string {
  return combo.items.map((i) => `${i.room.room_type} ×${i.quantity}`).join(" + ");
}

export function allocationLabel(a: { adults: number; children: number }): string {
  const parts = [`${a.adults} Adult${a.adults === 1 ? "" : "s"}`];
  if (a.children > 0) parts.push(`${a.children} Child${a.children === 1 ? "" : "ren"}`);
  return parts.join(" + ");
}

/** Legacy helper kept for existing callers. */
export function roomsFittingGuests<T extends { max_occupancy: number }>(
  rooms: T[],
  guests: number,
  roomsWanted = 1,
): T[] {
  const perRoom = Math.max(1, Math.ceil(guests / Math.max(1, roomsWanted)));
  return rooms.filter((r) => Number(r.max_occupancy || 0) >= perRoom);
}
