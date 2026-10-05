import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type RoomType = {
  id: string; room_type: string | null; room_name: string | null; total_units: number | null;
  base_price: number | null; weekly_price: number | null; monthly_price: number | null;
  min_stay_nights: number | null; sell_by: string; max_occupancy: number | null;
};
export type InventoryUnit = { id: string; room_id: string; unit_kind: string; label: string; floor: string | null; status: string };
export type AvailabilityBlock = { id: string; room_id: string; unit_id: string | null; start_date: string; end_date: string; units: number; reason: string; booking_id: string | null };

export async function listRoomTypes(hotelId: string): Promise<RoomType[]> {
  const { data, error } = await sb.from("hotel_rooms")
    .select("id,room_type,room_name,total_units,base_price,weekly_price,monthly_price,min_stay_nights,sell_by,max_occupancy")
    .eq("hotel_id", hotelId).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function updateRoomPricing(roomId: string, patch: Partial<Pick<RoomType, "base_price" | "weekly_price" | "monthly_price" | "min_stay_nights" | "sell_by" | "total_units">>) {
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === "number" && (Number.isNaN(v) || v < 0)) throw new Error(`Invalid value for ${k}`);
  }
  const { error } = await sb.from("hotel_rooms").update(patch).eq("id", roomId);
  if (error) throw error;
}

export async function listUnits(hotelId: string): Promise<InventoryUnit[]> {
  const { data, error } = await sb.from("hotel_inventory_units").select("*").eq("hotel_id", hotelId).order("label");
  if (error) throw error;
  return data ?? [];
}

/** Bulk-creates labelled units, e.g. prefix "Bed " count 4 → Bed 1..Bed 4. */
export async function addUnits(hotelId: string, roomId: string, kind: string, prefix: string, count: number, startAt = 1) {
  if (count < 1 || count > 200) throw new Error("Add between 1 and 200 at a time");
  const rows = Array.from({ length: count }, (_, i) => ({
    hotel_id: hotelId, room_id: roomId, unit_kind: kind, label: `${prefix}${startAt + i}`.trim(),
  }));
  const { error } = await sb.from("hotel_inventory_units").upsert(rows, { onConflict: "room_id,label", ignoreDuplicates: true });
  if (error) throw error;
}

export async function setUnitStatus(unitId: string, status: "active" | "maintenance" | "inactive") {
  const { error } = await sb.from("hotel_inventory_units").update({ status }).eq("id", unitId);
  if (error) throw error;
}

export async function deleteUnit(unitId: string) {
  const { error } = await sb.from("hotel_inventory_units").delete().eq("id", unitId);
  if (error) throw error;
}
