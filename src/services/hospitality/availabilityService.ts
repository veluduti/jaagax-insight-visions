import { supabase } from "@/integrations/supabase/client";
import type { AvailabilityBlock } from "./inventoryService";

const sb = supabase as any;

export async function listBlocks(hotelId: string, from: string, to: string): Promise<AvailabilityBlock[]> {
  const { data, error } = await sb.from("hotel_availability_blocks").select("*")
    .eq("hotel_id", hotelId).lt("start_date", to).gt("end_date", from).order("start_date");
  if (error) throw error;
  return data ?? [];
}

export async function blockDates(p: { hotelId: string; roomId: string; start: string; end: string; units: number; reason?: string; userId: string }) {
  if (!p.start || !p.end || p.end <= p.start) throw new Error("End date must be after start date");
  const free = await freeUnits(p.roomId, p.start, p.end);
  if (free < p.units) throw new Error(`Only ${free} available for those dates`);
  const { error } = await sb.from("hotel_availability_blocks").insert({
    hotel_id: p.hotelId, room_id: p.roomId, start_date: p.start, end_date: p.end,
    units: p.units, reason: p.reason || "blocked", created_by: p.userId,
  });
  if (error) throw error;
}

export async function unblock(blockId: string) {
  const { error } = await sb.from("hotel_availability_blocks").delete().eq("id", blockId).is("booking_id", null);
  if (error) throw error;
}

export async function freeUnits(roomId: string, checkIn: string, checkOut: string): Promise<number> {
  const { data, error } = await sb.rpc("room_free_units", { _room_id: roomId, _check_in: checkIn, _check_out: checkOut });
  if (error) throw error;
  return Number(data ?? 0);
}
