// Persists the complete canonical JAAGA booking graph.
// Used by direct JAAGA bookings AND HyperGuest-connected bookings so that both
// produce exactly the same internal representation.

export interface PersistRoomInput {
  room_id?: string | null;
  rate_plan_id?: string | null;
  external_item_id?: string | null;
  external_room_id?: string | null;
  external_rate_plan_id?: string | null;
  room_code?: string | null;
  room_name?: string | null;
  rate_code?: string | null;
  rate_plan_name?: string | null;
  board?: string | null;
  status?: string;
  quantity?: number;
  adults?: number;
  children?: number;
  infants?: number;
  child_ages?: number[] | null;
  extra_beds?: number;
  meals?: unknown;
  expected_price?: number | null;
  expected_currency?: string | null;
  final_price?: number | null;
  final_currency?: string | null;
  cancellation_policy_snapshot?: unknown;
  guests?: any[];
  special_requests?: string[];
  taxes?: any[];
  fees?: any[];
  nightly?: any[];
  raw?: unknown;
}

const guestRow = (g: any, bookingId: string, roomId: string | null, lead = false) => ({
  booking_id: bookingId,
  booking_room_id: roomId,
  external_guest_id: g?.external_guest_id ?? g?.externalGuestId ?? null,
  is_lead_guest: lead,
  guest_type: g?.guestType ?? g?.guest_type ?? "adult",
  title: g?.title ?? null,
  first_name: g?.firstName ?? g?.first_name ?? null,
  last_name: g?.lastName ?? g?.last_name ?? null,
  birth_date: g?.birthDate ?? g?.birth_date ?? null,
  age: g?.age ?? null,
  address: g?.address ?? null,
  city: g?.city ?? null,
  country: g?.country ?? null,
  nationality: g?.nationality ?? null,
  email: g?.email ?? null,
  phone: g?.phone ?? null,
  state: g?.state ?? null,
  zip: g?.zip ?? null,
  raw: g ?? null,
});

const taxFeeRow = (t: any, bookingId: string, roomId: string | null) => ({
  booking_id: bookingId,
  booking_room_id: roomId,
  code: t?.code ?? null,
  name: t?.name ?? null,
  description: t?.description ?? null,
  amount: Number(t?.amount ?? 0),
  currency: t?.currency ?? "INR",
  search_currency: t?.searchCurrency ?? null,
  relation: t?.relation ?? null,
  scope: t?.scope ?? null,
  frequency: t?.frequency ?? null,
  calculation_type: t?.calculationType ?? null,
  calculation_value: t?.calculationValue ?? null,
  raw: t?.raw ?? t ?? null,
});

export async function persistBookingGraph(supabase: any, bookingId: string, input: {
  rooms: PersistRoomInput[];
  lead_guest?: any;
  special_requests?: string[];
  references?: { reference_type: string; reference_value: string }[];
  meta?: { key: string; value: string }[];
  status?: string;
  status_source?: string;
  status_reason?: string | null;
  financial_model?: { source?: string; items: any[]; raw?: unknown } | null;
}) {
  // Lead guest (booking level)
  if (input.lead_guest) {
    await supabase.from("booking_guests").insert(guestRow(input.lead_guest, bookingId, null, true));
  }

  for (const r of input.rooms || []) {
    const { data: br } = await supabase.from("booking_rooms").insert({
      booking_id: bookingId,
      room_id: r.room_id ?? null,
      rate_plan_id: r.rate_plan_id ?? null,
      external_item_id: r.external_item_id ?? null,
      external_room_id: r.external_room_id ?? null,
      external_rate_plan_id: r.external_rate_plan_id ?? null,
      room_code: r.room_code ?? null,
      room_name: r.room_name ?? null,
      rate_code: r.rate_code ?? null,
      rate_plan_name: r.rate_plan_name ?? null,
      board: r.board ?? null,
      status: r.status ?? "confirmed",
      quantity: r.quantity ?? 1,
      adults: r.adults ?? 1,
      children: r.children ?? 0,
      infants: r.infants ?? 0,
      child_ages: r.child_ages ?? null,
      extra_beds: r.extra_beds ?? 0,
      meals: r.meals ?? null,
      expected_price: r.expected_price ?? null,
      expected_currency: r.expected_currency ?? "INR",
      final_price: r.final_price ?? r.expected_price ?? null,
      final_currency: r.final_currency ?? r.expected_currency ?? "INR",
      cancellation_policy_snapshot: r.cancellation_policy_snapshot ?? null,
      raw: r.raw ?? null,
    }).select().single();

    const roomRowId = br?.id ?? null;
    if (r.guests?.length) {
      await supabase.from("booking_guests").insert(r.guests.map((g) => guestRow(g, bookingId, roomRowId)));
    }
    if (r.special_requests?.length) {
      await supabase.from("booking_special_requests").insert(
        r.special_requests.map((request) => ({ booking_id: bookingId, booking_room_id: roomRowId, request })),
      );
    }
    if (r.taxes?.length) {
      await supabase.from("booking_taxes").insert(r.taxes.map((t) => taxFeeRow(t, bookingId, roomRowId)));
    }
    if (r.fees?.length) {
      await supabase.from("booking_fees").insert(r.fees.map((f) => taxFeeRow(f, bookingId, roomRowId)));
    }
    if (r.nightly?.length) {
      await supabase.from("booking_nightly_breakdown").insert(r.nightly.map((nb: any) => ({
        booking_id: bookingId, booking_room_id: roomRowId, date: nb.date,
        net_price: nb.net?.price ?? null, net_currency: nb.net?.currency ?? null,
        sell_price: nb.sell?.price ?? null, sell_currency: nb.sell?.currency ?? null,
        commission_price: nb.commission?.price ?? null, commission_currency: nb.commission?.currency ?? null,
        bar_price: nb.bar?.price ?? null, bar_currency: nb.bar?.currency ?? null,
        taxes: nb.taxes ?? null, fees: nb.fees ?? null, raw: nb.raw ?? nb,
      })));
    }
  }

  if (input.special_requests?.length) {
    await supabase.from("booking_special_requests").insert(
      input.special_requests.map((request) => ({ booking_id: bookingId, request })),
    );
  }
  if (input.references?.length) {
    await supabase.from("booking_references").insert(
      input.references.filter((r) => r.reference_value)
        .map((r) => ({ booking_id: bookingId, ...r })),
    );
  }
  if (input.meta?.length) {
    await supabase.from("booking_metadata").insert(
      input.meta.map((m) => ({ booking_id: bookingId, key: m.key, value: String(m.value ?? "") })),
    );
  }
  if (input.status) {
    await supabase.from("booking_status_history").insert({
      booking_id: bookingId, status: input.status,
      source: input.status_source ?? "jaaga", reason: input.status_reason ?? null,
    });
  }
  if (input.financial_model) {
    const { data: fm } = await supabase.from("booking_financial_models").insert({
      booking_id: bookingId, model_type: "booking",
      source: input.financial_model.source ?? "jaaga",
      raw: input.financial_model.raw ?? null,
    }).select().single();
    if (fm?.id && input.financial_model.items?.length) {
      for (const [idx, item] of input.financial_model.items.entries()) {
        const { data: fi } = await supabase.from("booking_financial_model_items").insert({
          financial_model_id: fm.id,
          key: item.key ?? null, value: item.value != null ? String(item.value) : null,
          item_order: item.order ?? idx,
          price: item.price ?? null, currency: item.currency ?? "INR",
          highlight: Boolean(item.highlight), description: item.description ?? null,
          calculation_type: item.calculation?.type ?? null,
          calculation_relation: item.calculation?.relation ?? null,
          calculation_value: item.calculation?.value ?? null,
          calculation_currency: item.calculation?.currency ?? null,
          raw: item,
        }).select().single();
        if (fi?.id && item.tags?.length) {
          await supabase.from("booking_financial_item_tags").insert(
            item.tags.map((tag: string) => ({ financial_item_id: fi.id, tag })),
          );
        }
      }
    }
  }
}

/** Standard JAAGA financial model derived from a pricing result. */
export function jaagaFinancialItems(result: any, currency = "INR") {
  const items = [
    { key: "room_charges", value: "Room charges", price: result.roomCharges, currency, order: 0 },
    { key: "meal_total", value: "Meals", price: result.mealTotal, currency, order: 1 },
    { key: "extra_bed_total", value: "Extra beds", price: result.extraBedTotal, currency, order: 2 },
    { key: "addon_total", value: "Add-ons", price: result.addonTotal, currency, order: 3 },
    { key: "discount", value: "Discount", price: -Math.abs(result.discount || 0), currency, order: 4, tags: ["discount"] },
    { key: "taxable_subtotal", value: "Taxable subtotal", price: result.taxableSubtotal, currency, order: 5 },
    {
      key: "tax_amount", value: `GST @ ${result.gstRate}%`, price: result.taxAmount, currency, order: 6,
      tags: ["tax"], calculation: { type: "percent", relation: "taxable_subtotal", value: result.gstRate, currency },
    },
    { key: "grand_total", value: "Grand total", price: result.grandTotal, currency, order: 7, highlight: true, tags: ["total"] },
  ];
  return items.filter((i) => i.price != null);
}
