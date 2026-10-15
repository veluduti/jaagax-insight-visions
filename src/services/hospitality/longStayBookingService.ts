import { supabase } from "@/integrations/supabase/client";
import { loadRazorpay } from "@/services/smartStayService";

const sb = supabase as any;

export type ServerQuote = {
  plan: "weekly" | "monthly"; duration: number; occupants: number; weekly: number; monthly: number;
  period_rent: number; extras: number; one_time_fees: number; tax_percent: number; tax: number;
  advance: number; deposit: number; due_at_booking: number; recurring: number;
};

const msg = (e: any) => String(e?.message || e || "Something went wrong").replace(/^.*?ERROR:\s*/, "");

/** Authoritative price from the server (same maths used when charging). */
export async function quoteLongStay(roomId: string, plan: "weekly" | "monthly", duration: number, occupants: number) {
  const { data, error } = await sb.rpc("long_stay_quote", { _room_id: roomId, _plan: plan, _duration: duration, _occupants: occupants });
  if (error) throw new Error(msg(error));
  return data as ServerQuote;
}

export async function reserveLongStay(p: {
  room_id: string; move_in: string; plan: "weekly" | "monthly"; duration: number; occupants: number;
  name: string; phone?: string; email?: string; requests?: string;
}) {
  const { data, error } = await sb.rpc("long_stay_reserve", {
    _room_id: p.room_id, _move_in: p.move_in, _plan: p.plan, _duration: p.duration, _occupants: p.occupants,
    _name: p.name, _phone: p.phone ?? "", _email: p.email ?? "", _requests: p.requests ?? null,
  });
  if (error) throw new Error(msg(error));
  if (!data?.ok) throw new Error(data?.error || "Not available");
  return data as { stay_id: string; quote: ServerQuote; move_out: string };
}

export async function payLongStay(stayId: string, title: string, prefill: { name?: string; email?: string; contact?: string }) {
  await loadRazorpay();
  const { data: order, error } = await supabase.functions.invoke("long-stay-pay", { body: { action: "create", stay_id: stayId } });
  if (error || order?.error) throw new Error(order?.error || "Could not start payment");
  if (order?.already) return order.booking_ref as string;
  return await new Promise<string>((resolve, reject) => {
    const r = new (window as any).Razorpay({
      key: order.key_id, amount: order.amount, currency: order.currency, order_id: order.order_id,
      name: "JAAGA X Long Stay", description: title, prefill, theme: { color: "#10b981" },
      handler: async (resp: any) => {
        const { data, error: e } = await supabase.functions.invoke("long-stay-pay", { body: { action: "verify", stay_id: stayId, ...resp } });
        if (e || !data?.success) reject(new Error(data?.error || "Payment could not be verified")); else resolve(data.booking_ref);
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled — your hold stays for 20 minutes")) },
    });
    r.on("payment.failed", (x: any) => reject(new Error(x?.error?.description || "Payment failed")));
    r.open();
  });
}

export async function loadMyLongStays() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await sb.from("hotel_long_stays")
    .select("id,booking_ref,hotel_id,unit_label,move_in,move_out,rent_plan,duration,occupants,amount_due,deposit,advance,status,payment_status,quote,hold_expires_at,partner_hotels(name,city)")
    .eq("user_id", user.id).not("status", "eq", "expired").order("created_at", { ascending: false }).limit(50);
  const ids = (data ?? []).map((s: any) => s.id);
  const { data: dues } = ids.length
    ? await sb.from("hotel_rent_dues").select("stay_id,period_month,amount,due_date,status").in("stay_id", ids).order("due_date")
    : { data: [] };
  return (data ?? []).map((s: any) => ({ ...s, dues: (dues ?? []).filter((d: any) => d.stay_id === s.id) }));
}
