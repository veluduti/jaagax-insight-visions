import { supabase } from "@/integrations/supabase/client";

/** Counts from the canonical block calendar; reservation locks remain authoritative. */
export async function loadDiscoveryAvailability(roomIds: string[], checkIn: string, checkOut: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (let offset = 0; offset < roomIds.length; offset += 8) {
    await Promise.all(roomIds.slice(offset, offset + 8).map(async id => {
      const { data, error } = await supabase.rpc("room_free_units", { _room_id: id, _check_in: checkIn, _check_out: checkOut });
      if (error) throw error;
      counts[id] = Math.max(0, Number(data) || 0);
    }));
  }
  return counts;
}