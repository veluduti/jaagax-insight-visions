import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type WsRoom = {
  id: string; room_type: string | null; room_name: string | null; stay_unit: string | null; total_units: number | null;
  base_price: number | null; weekly_price: number | null; monthly_price: number | null; is_active: boolean | null;
};
export type WsUnit = { id: string; room_id: string | null; unit_kind: string | null; label: string | null; floor: string | null; status: string | null };
export type WsBooking = {
  id: string; guest_name: string | null; check_in: string; check_out: string; status: string | null;
  room_type: string | null; total_amount: number | null; actual_check_in_at: string | null; actual_check_out_at: string | null;
  housekeeping_status: string | null;
};

export type WorkspaceData = { rooms: WsRoom[]; units: WsUnit[]; bookings: WsBooking[] };

/** Loads everything a property workspace shows, for one property. */
export async function loadWorkspace(hotelId: string): Promise<WorkspaceData> {
  const [r, u, b] = await Promise.all([
    sb.from("hotel_rooms").select("id,room_type,room_name,stay_unit,total_units,base_price,weekly_price,monthly_price,is_active").eq("hotel_id", hotelId).limit(500),
    sb.from("hotel_inventory_units").select("id,room_id,unit_kind,label,floor,status").eq("hotel_id", hotelId).limit(2000),
    sb.from("hotel_bookings")
      .select("id,guest_name,check_in,check_out,status,room_type,total_amount,actual_check_in_at,actual_check_out_at,housekeeping_status")
      .eq("hotel_id", hotelId).order("check_in", { ascending: false }).limit(300),
  ]);
  return { rooms: r.data ?? [], units: u.data ?? [], bookings: b.data ?? [] };
}
