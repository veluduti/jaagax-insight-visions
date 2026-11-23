import { supabase } from "@/integrations/supabase/client";
import { proratedRent, type Line } from "@/config/billingModes";

const sb = supabase as any;
export type Invoice = {
  id: string; hotel_id: string; invoice_no: string; kind: string; party_name: string; party_phone: string | null; party_email: string | null;
  long_stay_id: string | null; booking_id: string | null; room_label: string | null; room_type: string | null; period_start: string | null; period_end: string | null;
  lines: Line[]; subtotal: number; discount: number; tax: number; adjustments: number; total: number; paid_amount: number; refunded_amount: number;
  status: string; due_date: string; notes: string | null; created_at: string;
};
export type InvPayment = { id: string; invoice_id: string; kind: "payment" | "refund" | "adjustment"; amount: number; method: string; reference: string | null; note: string | null; receipt_no: string; created_at: string };

export async function loadBilling(hotelId: string) {
  const [i, p, s] = await Promise.all([
    sb.from("hotel_invoices").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(2000),
    sb.from("hotel_invoice_payments").select("*").eq("hotel_id", hotelId).order("created_at", { ascending: false }).limit(5000),
    sb.from("hotel_long_stays").select("id,resident_name,resident_phone,resident_email,unit_label,room_id,monthly_rent,deposit,rent_due_day,move_in,move_out,status").eq("hotel_id", hotelId).in("status", ["active", "notice"]),
  ]);
  if (i.error) throw i.error; if (p.error) throw p.error;
  return { invoices: (i.data ?? []) as Invoice[], payments: (p.data ?? []) as InvPayment[], stays: (s.data ?? []) as any[] };
}

export async function createInvoice(inv: Partial<Invoice>) {
  const { data, error } = await sb.from("hotel_invoices").insert(inv).select().single();
  if (error) throw error; return data as Invoice;
}
export async function voidInvoice(id: string) { const { error } = await sb.from("hotel_invoices").update({ status: "void" }).eq("id", id); if (error) throw error; }

/** One key per submit, so a double-click never records the payment twice. */
export async function addPayment(p: { hotel_id: string; invoice_id: string; kind: InvPayment["kind"]; amount: number; method: string; reference?: string; note?: string; key: string }) {
  const { key, ...row } = p;
  const { error } = await sb.from("hotel_invoice_payments").insert({ ...row, idempotency_key: key });
  if (error && error.code === "23505") return; // already recorded
  if (error) throw error;
}

/** This month's rent invoice for every current resident, prorated on move-in, deposit on first invoice. Safe to rerun. */
export async function generateRentInvoices(hotelId: string, stays: any[], existing: Invoice[], taxPct = 0) {
  const t = new Date(); const ms = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-01`;
  const end = new Date(t.getFullYear(), t.getMonth() + 1, 0).toISOString().slice(0, 10);
  const { data: meals } = await sb.from("hotel_meal_subscriptions").select("long_stay_id,price,status").eq("hotel_id", hotelId).eq("status", "active");
  let n = 0;
  for (const s of stays) {
    if (s.move_in > end || existing.some(i => i.long_stay_id === s.id && i.period_start === ms && i.kind === "rent")) continue;
    const lines: Line[] = [{ label: "Monthly rent", category: "rent", amount: proratedRent(Number(s.monthly_rent), s.move_in, ms) }];
    if (!existing.some(i => i.long_stay_id === s.id) && Number(s.deposit) > 0) lines.push({ label: "Security deposit (refundable)", category: "deposit", amount: Number(s.deposit) });
    const meal = (meals ?? []).find((x: any) => x.long_stay_id === s.id); if (meal && Number(meal.price) > 0) lines.push({ label: "Mess charges", category: "mess", amount: Number(meal.price) });
    const sub = lines.reduce((a, l) => a + l.amount, 0);
    const { error } = await sb.from("hotel_invoices").insert({ hotel_id: hotelId, kind: "rent", party_name: s.resident_name, party_phone: s.resident_phone, party_email: s.resident_email, long_stay_id: s.id, room_label: s.unit_label, period_start: ms, period_end: end, lines, subtotal: sub, tax: Math.round(sub * taxPct) / 100, due_date: `${ms.slice(0, 8)}${String(Math.min(28, Math.max(1, s.rent_due_day || 5))).padStart(2, "0")}` });
    if (error && error.code !== "23505") throw error; if (!error) n++;
  }
  return n;
}

/** Invoices for confirmed bookings, carrying over what the guest already paid online. Safe to rerun. */
export async function importBookings(hotelId: string, existing: Invoice[]) {
  const { data, error } = await sb.from("hotel_bookings").select("id,guest_name,guest_phone,guest_email,room_type,room_number,check_in,check_out,room_charges,meal_total,addon_total,extra_bed_total,fees_total,discount_total,taxes_total,tax_amount,total_amount,amount_paid,status,booking_reference")
    .eq("hotel_id", hotelId).in("status", ["confirmed", "checked_in", "checked_out", "completed"]).limit(500);
  if (error) throw error; let n = 0;
  for (const b of data ?? []) {
    if (existing.some(i => i.booking_id === b.id)) continue;
    const lines: Line[] = [["Room charges", "room", b.room_charges], ["Meals", "restaurant", b.meal_total], ["Add-ons", "service", b.addon_total], ["Extra bed", "extra_guest", b.extra_bed_total], ["Fees", "service", b.fees_total]]
      .filter(([, , a]) => Number(a) > 0).map(([label, category, a]) => ({ label: label as string, category: category as string, amount: Number(a) }));
    if (!lines.length) lines.push({ label: "Booking", category: "room", amount: Number(b.total_amount) || 0 });
    const { data: inv, error: e } = await sb.from("hotel_invoices").insert({ hotel_id: hotelId, kind: "booking", booking_id: b.id, party_name: b.guest_name || "Guest", party_phone: b.guest_phone, party_email: b.guest_email, room_label: b.room_number, room_type: b.room_type, period_start: b.check_in, period_end: b.check_out, lines, subtotal: lines.reduce((a, l) => a + l.amount, 0), discount: Number(b.discount_total) || 0, tax: Number(b.taxes_total || b.tax_amount) || 0, due_date: b.check_in, notes: b.booking_reference ? `Booking ${b.booking_reference}` : null }).select().single();
    if (e) { if (e.code === "23505") continue; throw e; }
    n++;
    const paid = Math.min(Number(b.amount_paid) || 0, Number(inv.total));
    if (paid > 0) await addPayment({ hotel_id: hotelId, invoice_id: inv.id, kind: "payment", amount: paid, method: "online", reference: b.booking_reference ?? undefined, note: "Paid at booking", key: `booking-${b.id}` });
  }
  return n;
}
