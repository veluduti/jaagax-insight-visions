export const MARKETPLACE_IDS = [111139, 120655, 117810, 119668, 102148, 127194, 100621, 100622, 125400, 126856, 101610, 125492, 101230, 32571, 29212, 100388, 55617];
export const LEGACY_LIVE_IDS = [128382, 126632, 57985];
export function catalogRows(data: any): any[] {
  if (Array.isArray(data)) return data;
  return data?.hotels ?? data?.properties ?? data?.data ?? data?.content?.hotels ?? [];
}
export function propertyFields(p: any) {
  if (!p?.id || !p?.name || !p?.location?.city?.name || p.isTest) throw new Error("Incomplete or test property content; not imported");
  return {
    hyperguest_property_id: String(p.id), source_channel: "hyperguest", name: p.name,
    city: p.location.city.name, locality: p.location.address || p.location.city.name,
    address: p.location.address ?? null, country_code: p.location.countryCode ?? null,
    country: p.location.country?.name ?? p.location.countryCode ?? null, state: p.location.region ?? null,
    city_id: String(p.location.city.id ?? ""), region_name: p.location.region ?? null,
    latitude: p.coordinates?.latitude ?? null, longitude: p.coordinates?.longitude ?? null,
    star_rating: Number(p.rating) || 0, description: p.descriptions?.find((d: any) => d.language === "en_US" && d.type === "general")?.description ?? null,
    images: (p.images ?? []).map((i: any) => i.uri).filter(Boolean), amenities: (p.facilities ?? []).filter((f: any) => f.type !== "room").map((f: any) => f.name),
    contact_phone: p.contact?.phone ?? null, contact_email: p.contact?.email ?? null,
    check_in_time: p.settings?.checkIn ?? null, check_out_time: p.settings?.checkOut ?? null,
    default_currency: p.settings?.currency ?? "INR", total_rooms: p.settings?.numberOfRooms ?? null,
    property_type_name: p.settings?.hotelType?.name ?? null, business_types: ["hotel"],
    supplier_content: p, supplier_synced_at: new Date().toISOString(), supplier_sync_error: null,
    updated_at: new Date().toISOString(),
  };
}
export function availabilitySummary(results: any[], nights: number) {
  return results.map(p => {
    const prices = (p.rooms ?? []).flatMap((r: any) => (r.ratePlans ?? []).map((rate: any) => {
      const sell = rate.prices?.sell;
      const amount = Number(sell?.searchCurrency ?? sell?.price ?? rate.payment?.chargeAmount?.price);
      return amount > 0 && Number(r.numberOfAvailableRooms) > 0 ? amount / nights : null;
    })).filter((n: any) => n != null);
    return { propertyId: Number(p.propertyId ?? p.hotelId ?? p.id), available: prices.length > 0, price: prices.length ? Math.min(...prices) : null };
  });
}
export const certificationRulesApply = (live: boolean, mapped: boolean) => live && !mapped;