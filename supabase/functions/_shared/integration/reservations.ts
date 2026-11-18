import { z } from "npm:zod@3.25.76";
import { buildServerQuote, type ServerQuote } from "../hotelQuote.ts";
import type { PricingResult } from "../hotelPricing.ts";

export const reservationSchema = z.object({
  external_booking_id: z.string().trim().min(1).max(160),
  external_reference: z.string().trim().max(160).optional(),
  external_version: z.number().int().min(1).default(1),
  room_id: z.string().uuid(),
  rate_plan_id: z.string().uuid().nullable().optional(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(20),
  children: z.number().int().min(0).max(20).default(0),
  child_ages: z.array(z.number().int().min(0).max(17)).max(20).default([]),
  num_rooms: z.number().int().min(1).max(10).default(1),
  guest_name: z.string().trim().min(1).max(160),
  guest_email: z.string().trim().email().max(255),
  guest_phone: z.string().trim().max(40).optional(),
  special_requests: z.string().trim().max(2000).optional(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  lead_guest: z.record(z.unknown()).optional(),
  cancellation_policy_snapshot: z.record(z.unknown()).optional(),
}).superRefine((value, ctx) => {
  if (value.check_in >= value.check_out) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Check-out must be after check-in" });
  if (value.child_ages.length !== value.children) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Every child needs an age" });
});

export type IntegrationReservation = z.infer<typeof reservationSchema>;

async function quote(sb: any, connection: any, reservation: IntegrationReservation): Promise<ServerQuote & { result: PricingResult }> {
  const result = await buildServerQuote(sb, {
    hotel_id: connection.hotel_id, room_id: reservation.room_id, rate_plan_id: reservation.rate_plan_id ?? null,
    check_in: reservation.check_in, check_out: reservation.check_out, adults: reservation.adults,
    children: reservation.children, child_ages: reservation.child_ages, num_rooms: reservation.num_rooms,
  });
  if (result.error || !result.result) throw new Error(result.error ?? "A current hotel price is unavailable");
  return { ...result, result: result.result };
}

function persistencePayload(input: IntegrationReservation, quoted: any) {
  return {
    ...input,
    room_type: quoted.room?.room_type ?? quoted.room?.room_name ?? "Standard",
    currency: input.currency ?? quoted.hotel?.default_currency ?? "INR",
    cancellation_policy_snapshot: input.cancellation_policy_snapshot ?? { policies: quoted.cancellationPolicies ?? [] },
    lead_guest: input.lead_guest ?? { name: input.guest_name, email: input.guest_email, phone: input.guest_phone },
  };
}

export async function createIntegrationReservation(sb: any, connection: any, input: unknown, idempotencyKey: string) {
  const parsed = reservationSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid reservation");
  const reservation = parsed.data;
  const quoted = await quote(sb, connection, reservation);
  const { data, error } = await sb.rpc("integration_create_reservation", {
    _connection_id: connection.id, _idempotency_key: `${connection.id}:${idempotencyKey}`,
    _reservation: persistencePayload(reservation, quoted), _quote: quoted.result,
  });
  if (error) throw new Error(error.message);
  return { ...data, total: quoted.result.grandTotal, currency: persistencePayload(reservation, quoted).currency };
}

export async function modifyIntegrationReservation(sb: any, connection: any, externalId: string, input: unknown) {
  const parsed = reservationSchema.safeParse({ ...(input as Record<string, unknown>), external_booking_id: externalId });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid reservation modification");
  const reservation = parsed.data;
  const quoted = await quote(sb, connection, reservation);
  const { data, error } = await sb.rpc("integration_modify_reservation", {
    _connection_id: connection.id, _external_booking_id: externalId, _version: reservation.external_version,
    _reservation: persistencePayload(reservation, quoted), _quote: quoted.result,
  });
  if (error) throw new Error(error.message);
  return { ...data, total: quoted.result.grandTotal };
}

export async function cancelIntegrationReservation(sb: any, connection: any, externalId: string, version: number, reason: string) {
  const { data, error } = await sb.rpc("integration_cancel_reservation", {
    _connection_id: connection.id, _external_booking_id: externalId, _version: version, _reason: reason,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function readIntegrationReservation(sb: any, connection: any, externalId: string) {
  const { data: link, error } = await sb.from("integration_booking_links").select("external_version,booking_id").eq("connection_id", connection.id).eq("external_booking_id", externalId).maybeSingle();
  if (error || !link) throw new Error("External reservation not found");
  const { data: booking } = await sb.from("hotel_bookings").select("id,booking_reference,status,external_status,check_in,check_out,room_id,rate_plan_id,num_rooms,adults,children,total_amount,currency,guest_name,guest_email,payment_status").eq("id", link.booking_id).single();
  return { ...booking, external_booking_id: externalId, external_version: link.external_version };
}
