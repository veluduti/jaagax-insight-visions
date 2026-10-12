// Events module backend: booking (free/paid/VIP), Razorpay payment verification,
// cancellations, admin review and organizer broadcast. All writes run server-side.
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const APP = Deno.env.get("APP_BASE_URL") || "https://jaagax.com";
const UUID = /^[0-9a-f-]{36}$/i;
const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const hhmm = (t?: string | null) => (t ? String(t).slice(0, 5) : "");

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// deno-lint-ignore no-explicit-any
type Admin = any;

async function notify(admin: Admin, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const { error } = await admin.from("notifications").insert(rows.map((r) => ({ is_read: false, ...r })));
  if (error) console.error("notify failed", error.message);
}

async function onConfirmed(admin: Admin, bookingId: string) {
  const { data: b } = await admin.from("event_bookings")
    .select("*, event:events(*), ticket:event_ticket_types(name, kind, benefits)").eq("id", bookingId).single();
  if (!b) return;
  const e = b.event, t = b.ticket;
  const paid = Number(b.total_amount) > 0;
  await notify(admin, [
    { user_id: b.customer_id, type: "event_booking", title: "Event booking confirmed",
      message: `${t.name} × ${b.quantity} for "${e.title}" on ${fmtDate(e.event_date)}. Ref ${b.booking_reference}.`,
      link: `/events/booking/${b.id}`, metadata: { booking_id: b.id, event_id: e.id } },
    { user_id: e.organizer_id, type: "event_booking", title: "New event registration",
      message: `${b.customer_name || "A customer"} booked ${t.name} × ${b.quantity}${paid ? ` (${inr(b.total_amount)})` : ""} for "${e.title}".`,
      link: `/events/manage/${e.id}`, metadata: { booking_id: b.id, event_id: e.id } },
  ]);
  if (b.customer_email) {
    try {
      await sendTemplateEmail("event-booking-confirmation", b.customer_email, {
        idempotencyKey: `event-booking-confirmation-${b.id}`,
        templateData: {
          name: b.customer_name, eventTitle: e.title, eventDate: fmtDate(e.event_date),
          startTime: hhmm(e.start_time), endTime: hhmm(e.end_time), venue: e.venue, address: e.address || e.city,
          ticketName: t.name, quantity: b.quantity, reference: b.booking_reference, paid,
          unitPrice: Number(b.unit_price), total: Number(b.total_amount), paymentId: b.razorpay_payment_id,
          benefits: t.benefits || [], link: `${APP}/events/booking/${b.id}`,
        },
      });
    } catch (err) { console.error("event confirmation email failed", (err as Error).message); }
  }
}

async function releaseSeats(admin: Admin, b: { ticket_type_id: string; quantity: number }) {
  const { data: t } = await admin.from("event_ticket_types").select("sold").eq("id", b.ticket_type_id).single();
  if (t) await admin.from("event_ticket_types").update({ sold: Math.max(0, t.sold - b.quantity) }).eq("id", b.ticket_type_id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Please sign in" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) return json({ error: "Your session has expired. Please sign in again." }, 401);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    // ---------- Customer: reserve tickets ----------
    if (action === "book") {
      const ticketId = String(body.ticket_type_id || "");
      const qty = Number(body.quantity);
      const phone = typeof body.phone === "string" ? body.phone.replace(/[^\d+]/g, "").slice(0, 15) : "";
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
      if (!UUID.test(ticketId) || !Number.isInteger(qty) || qty < 1 || qty > 50) return json({ error: "Invalid ticket selection" }, 400);
      const { data: prof } = await admin.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle();
      const { data: b, error } = await admin.rpc("event_reserve", {
        _uid: user.id, _ticket_id: ticketId, _qty: qty,
        _name: name || prof?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "Guest",
        _email: user.email || "", _phone: phone || prof?.phone || user.phone || "",
      });
      if (error) {
        const msg = error.code === "23505" ? "You already have a booking for this event" : error.message;
        return json({ error: msg }, 400);
      }
      if (b.status === "confirmed") await onConfirmed(admin, b.id);
      return json({ booking: b, needs_payment: b.status === "pending_payment" });
    }

    // ---------- Customer: payment ----------
    if (action === "pay_create" || action === "pay_verify") {
      const KEY = Deno.env.get("RAZORPAY_KEY_ID"), SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
      if (!KEY || !SECRET) return json({ error: "Payment gateway not configured" }, 500);
      const id = String(body.booking_id || "");
      if (!UUID.test(id)) return json({ error: "Invalid booking" }, 400);
      const { data: b } = await admin.from("event_bookings").select("*, event:events(title)").eq("id", id).maybeSingle();
      if (!b || b.customer_id !== user.id) return json({ error: "Booking not found" }, 404);
      if (b.status === "confirmed") return json({ success: true, already: true, booking: b });
      if (b.status !== "pending_payment") return json({ error: "This booking expired. Please book again." }, 400);

      if (action === "pay_create") {
        if (Date.now() - new Date(b.created_at).getTime() > 14 * 60_000) return json({ error: "Seat hold expired. Please book again." }, 400);
        const amount = Math.round(Number(b.total_amount) * 100);
        const r = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Basic ${btoa(`${KEY}:${SECRET}`)}` },
          body: JSON.stringify({ amount, currency: "INR", receipt: `ev_${id.slice(0, 8)}_${Date.now()}`, notes: { purpose: "event_ticket", booking_id: id } }),
        });
        const order = await r.json();
        if (!r.ok || !order.id) return json({ error: order?.error?.description || "Could not start payment" }, 502);
        await admin.from("event_bookings").update({ razorpay_order_id: order.id, updated_at: new Date().toISOString() }).eq("id", id);
        return json({ order_id: order.id, amount, currency: "INR", key_id: KEY, title: b.event?.title });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return json({ error: "Missing payment fields" }, 400);
      if (razorpay_order_id !== b.razorpay_order_id) return json({ error: "Order mismatch" }, 400);
      const expected = await hmacHex(SECRET, `${razorpay_order_id}|${razorpay_payment_id}`);
      if (expected !== razorpay_signature) {
        await admin.from("event_bookings").update({ payment_status: "failed", status: "failed" }).eq("id", id).eq("status", "pending_payment");
        await releaseSeats(admin, b);
        return json({ error: "Payment could not be verified" }, 400);
      }
      const now = new Date().toISOString();
      const { data: upd } = await admin.from("event_bookings").update({
        status: "confirmed", payment_status: "paid", razorpay_payment_id, paid_at: now, confirmed_at: now, updated_at: now,
      }).eq("id", id).eq("status", "pending_payment").select().maybeSingle();
      if (!upd) return json({ error: "Seat hold expired before payment. Contact support for a refund.", payment_id: razorpay_payment_id }, 409);
      await onConfirmed(admin, id);
      return json({ success: true, booking: upd });
    }

    // ---------- Customer: cancel own booking ----------
    if (action === "cancel_booking") {
      const id = String(body.booking_id || "");
      if (!UUID.test(id)) return json({ error: "Invalid booking" }, 400);
      const { data: b } = await admin.from("event_bookings").select("*, event:events(title, event_date, start_time, organizer_id)").eq("id", id).maybeSingle();
      if (!b || b.customer_id !== user.id) return json({ error: "Booking not found" }, 404);
      if (!["confirmed", "pending_payment"].includes(b.status)) return json({ error: "Booking is not active" }, 400);
      if (new Date(`${b.event.event_date}T${b.event.start_time}+05:30`).getTime() < Date.now()) return json({ error: "The event has already started" }, 400);
      const now = new Date().toISOString();
      await admin.from("event_bookings").update({
        status: "cancelled", cancelled_at: now, updated_at: now, cancel_reason: String(body.reason || "Cancelled by customer").slice(0, 300),
        payment_status: b.payment_status === "paid" ? "refund_pending" : b.payment_status === "pending" ? "failed" : b.payment_status,
      }).eq("id", id);
      await releaseSeats(admin, b);
      if (b.status === "confirmed") {
        await notify(admin, [
          { user_id: b.customer_id, type: "event_cancelled", title: "Event booking cancelled",
            message: `Your booking ${b.booking_reference} for "${b.event.title}" was cancelled.${b.payment_status === "paid" ? " Your refund will be processed by our team." : ""}`,
            link: `/events/booking/${b.id}` },
          { user_id: b.event.organizer_id, type: "event_cancelled", title: "Registration cancelled",
            message: `${b.customer_name || "A customer"} cancelled ${b.quantity} ticket(s) for "${b.event.title}".`, link: `/events/manage/${b.event_id}` },
        ]);
      }
      return json({ success: true });
    }

    // ---------- Organizer: event submitted → notify admins ----------
    if (action === "submitted") {
      const id = String(body.event_id || "");
      const { data: e } = await admin.from("events").select("id, title, organizer_id, status").eq("id", id).maybeSingle();
      if (!e || e.organizer_id !== user.id || e.status !== "pending_approval") return json({ error: "Event not found" }, 404);
      const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
      await notify(admin, (admins || []).map((a: any) => ({
        user_id: a.user_id, type: "event_review", title: "Event awaiting approval",
        message: `"${e.title}" was submitted for approval.`, link: "/admin/events", metadata: { event_id: e.id },
      })));
      return json({ success: true });
    }

    const loadOwnedEvent = async (id: string) => {
      if (!UUID.test(id)) return null;
      const { data: e } = await admin.from("events").select("*").eq("id", id).maybeSingle();
      if (!e) return null;
      const { data: isAdmin } = await userClient.rpc("is_global_admin", { _uid: user.id });
      if (e.organizer_id !== user.id && !isAdmin) return null;
      return { e, isAdmin: !!isAdmin };
    };

    // ---------- Global admin: approve / reject ----------
    if (action === "review") {
      const { data: isAdmin } = await userClient.rpc("is_global_admin", { _uid: user.id });
      if (!isAdmin) return json({ error: "Only the global admin can review events" }, 403);
      const id = String(body.event_id || "");
      const approve = body.approve === true;
      const reason = String(body.reason || "").trim().slice(0, 1000);
      if (!approve && reason.length < 5) return json({ error: "Please give a rejection reason (at least 5 characters)" }, 400);
      const { data: e } = await admin.from("events").select("*").eq("id", id).maybeSingle();
      if (!e) return json({ error: "Event not found" }, 404);
      if (e.status !== "pending_approval") return json({ error: "This event is not waiting for approval" }, 400);
      const { count } = await admin.from("event_ticket_types").select("id", { count: "exact", head: true }).eq("event_id", id);
      if (approve && !count) return json({ error: "Event has no ticket types" }, 400);
      const now = new Date().toISOString();
      await admin.from("events").update({
        status: approve ? "approved" : "rejected", rejection_reason: approve ? null : reason, reviewed_by: user.id, reviewed_at: now, updated_at: now,
      }).eq("id", id);
      await notify(admin, [{
        user_id: e.organizer_id, type: approve ? "event_approved" : "event_rejected",
        title: approve ? "Event approved 🎉" : "Event not approved",
        message: approve ? `"${e.title}" is now live for customers.` : `"${e.title}" was not approved: ${reason}`,
        link: approve ? `/events/${e.id}` : `/events/manage/${e.id}`, metadata: { event_id: e.id },
      }]);
      if (!approve) {
        const { data: org } = await admin.auth.admin.getUserById(e.organizer_id);
        const email = org?.user?.email;
        if (email) {
          try {
            await sendTemplateEmail("event-rejected", email, {
              idempotencyKey: `event-rejected-${e.id}-${now}`,
              templateData: { name: e.organizer_name || org.user.user_metadata?.full_name, eventTitle: e.title, reason, link: `${APP}/events/edit/${e.id}` },
            });
          } catch (err) { console.error("rejection email failed", (err as Error).message); }
        }
      }
      return json({ success: true });
    }

    // ---------- Organizer: cancel whole event ----------
    if (action === "cancel_event") {
      const owned = await loadOwnedEvent(String(body.event_id || ""));
      if (!owned) return json({ error: "Event not found" }, 404);
      const { e } = owned;
      if (["cancelled", "completed"].includes(e.status)) return json({ error: "Event already closed" }, 400);
      const reason = String(body.reason || "").trim().slice(0, 500) || "The organizer cancelled this event";
      const now = new Date().toISOString();
      await admin.from("events").update({ status: "cancelled", updated_at: now }).eq("id", e.id);
      const { data: bookings } = await admin.from("event_bookings").select("*").eq("event_id", e.id).in("status", ["confirmed", "pending_payment"]);
      for (const b of bookings || []) {
        await admin.from("event_bookings").update({
          status: "cancelled", cancelled_at: now, updated_at: now, cancel_reason: reason,
          payment_status: b.payment_status === "paid" ? "refund_pending" : b.payment_status === "pending" ? "failed" : b.payment_status,
        }).eq("id", b.id);
        await releaseSeats(admin, b);
      }
      await notify(admin, (bookings || []).filter((b: any) => b.status === "confirmed").map((b: any) => ({
        user_id: b.customer_id, type: "event_cancelled", title: "Event cancelled",
        message: `"${e.title}" on ${fmtDate(e.event_date)} was cancelled. ${reason}${b.payment_status === "paid" ? " Your refund will be processed by our team." : ""}`,
        link: `/events/booking/${b.id}`,
      })));
      return json({ success: true, cancelled: bookings?.length || 0 });
    }

    // ---------- Organizer: send update / follow-up to attendees ----------
    if (action === "notify_attendees") {
      const owned = await loadOwnedEvent(String(body.event_id || ""));
      if (!owned) return json({ error: "Event not found" }, 404);
      const msg = String(body.message || "").trim();
      if (msg.length < 5 || msg.length > 500) return json({ error: "Message must be 5–500 characters" }, 400);
      const onlyAttended = body.audience === "attended";
      let q = admin.from("event_bookings").select("id, customer_id").eq("event_id", owned.e.id).eq("status", "confirmed");
      if (onlyAttended) q = q.gt("checked_in_count", 0);
      const { data: bookings } = await q;
      await notify(admin, (bookings || []).map((b: any) => ({
        user_id: b.customer_id, type: "event_update", title: `Update: ${owned.e.title}`, message: msg,
        link: `/events/${owned.e.id}`, metadata: { event_id: owned.e.id },
      })));
      return json({ success: true, sent: bookings?.length || 0 });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Something went wrong" }, 500);
  }
});
