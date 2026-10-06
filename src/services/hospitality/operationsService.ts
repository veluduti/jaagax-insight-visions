import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export type OpsBooking = {
  id: string; guest_name: string | null; guest_phone: string | null; check_in: string; check_out: string;
  status: string | null; room_type: string | null; room_number: string | null; num_guests: number | null;
  payment_status: string | null; actual_check_in_at: string | null; actual_check_out_at: string | null;
  special_requests: string | null;
};
export type OpsTask = {
  id: string; hotel_id: string; kind: "housekeeping" | "maintenance"; title: string; room_label: string | null;
  booking_id: string | null; priority: string; status: string; notes: string | null; created_at: string; completed_at: string | null;
};

const today = () => new Date().toISOString().slice(0, 10);

/** Bookings touching today: arrivals, departures and in-house guests. */
export async function loadFrontDesk(hotelId: string) {
  const t = today();
  const { data, error } = await sb.from("hotel_bookings")
    .select("id,guest_name,guest_phone,check_in,check_out,status,room_type,room_number,num_guests,payment_status,actual_check_in_at,actual_check_out_at,special_requests")
    .eq("hotel_id", hotelId).lte("check_in", t).gte("check_out", t)
    .not("status", "in", "(cancelled,canceled,rejected)").limit(300);
  if (error) throw error;
  const rows: OpsBooking[] = data ?? [];
  return {
    arrivals: rows.filter((b) => b.check_in === t && !b.actual_check_in_at),
    inHouse: rows.filter((b) => !!b.actual_check_in_at && !b.actual_check_out_at),
    departures: rows.filter((b) => b.check_out === t && !b.actual_check_out_at),
  };
}

export async function checkIn(b: OpsBooking, roomNumber?: string) {
  const { error } = await sb.from("hotel_bookings").update({
    actual_check_in_at: new Date().toISOString(), status: "checked_in",
    ...(roomNumber ? { room_number: roomNumber } : {}),
  }).eq("id", b.id);
  if (error) throw error;
}

/** Check-out also opens a cleaning task so housekeeping sees it immediately. */
export async function checkOut(hotelId: string, b: OpsBooking) {
  const { error } = await sb.from("hotel_bookings").update({
    actual_check_out_at: new Date().toISOString(), status: "checked_out", housekeeping_status: "dirty",
  }).eq("id", b.id);
  if (error) throw error;
  await createTask({ hotel_id: hotelId, kind: "housekeeping", title: "Clean after check-out",
    room_label: b.room_number || b.room_type, booking_id: b.id, priority: "high" });
}

export async function loadTasks(hotelId: string, kind: OpsTask["kind"]) {
  const { data, error } = await sb.from("hotel_ops_tasks").select("*")
    .eq("hotel_id", hotelId).eq("kind", kind).order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return (data ?? []) as OpsTask[];
}

export async function createTask(t: Partial<OpsTask> & { hotel_id: string; kind: OpsTask["kind"]; title: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await sb.from("hotel_ops_tasks").insert({ ...t, created_by: user?.id });
  if (error) throw error;
}

export async function setTaskStatus(task: OpsTask, status: "open" | "in_progress" | "done") {
  const { error } = await sb.from("hotel_ops_tasks").update({
    status, completed_at: status === "done" ? new Date().toISOString() : null,
  }).eq("id", task.id);
  if (error) throw error;
  if (status === "done" && task.kind === "housekeeping" && task.booking_id) {
    await sb.from("hotel_bookings").update({ housekeeping_status: "clean", room_cleaned_at: new Date().toISOString() }).eq("id", task.booking_id);
  }
}
