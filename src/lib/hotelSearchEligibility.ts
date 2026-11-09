import { buildRoomCombinations, type OccupancyRoom } from "./roomOccupancy";

/** Discovery must use dated inventory and the requested room count, never total stock. */
export function hasRequestedRooms(pool: OccupancyRoom[], adults: number, children: number, rooms: number): boolean {
  return buildRoomCombinations(pool, adults, children, { exactRooms: rooms, limit: 1 }).length > 0;
}

/** Selected requirements are mandatory; optional AI preferences only influence sorting. */
export function exactHotelMatches<T extends { miss: number }>(matches: T[]): T[] {
  return matches.filter(match => match.miss === 0);
}