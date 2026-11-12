// Pure helpers that turn HyperGuest static content into customer-facing lines.
// Every helper drops empty/zero values so absent supplier data is never shown.
const num = (v: unknown) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function englishDescription(descriptions: any[] | undefined, type = "general"): string | null {
  const list = Array.isArray(descriptions) ? descriptions : [];
  const pick = list.find(d => d?.language === "en_US" && d?.type === type) ?? list.find(d => String(d?.language ?? "").startsWith("en")) ?? list[0];
  return text(pick?.description);
}

export function hotelCoordinates(stat: any): { lat: number; lng: number } | null {
  const lat = Number(stat?.coordinates?.latitude), lng = Number(stat?.coordinates?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function roomOccupancy(settings: any): { label: string; value: number }[] {
  const s = settings ?? {};
  return ([
    ["Max guests", s.maxOccupancy],
    ["Adults", s.adultsNumber ?? s.maxAdultsNumber ?? s.maxAdults],
    ["Children", s.childrenNumber ?? s.maxChildrenNumber ?? s.maxChildren],
    ["Infants", s.infantsNumber ?? s.maxInfantsNumber ?? s.maxInfants],
    ["Bedrooms", s.numberOfBedrooms],
    ["Beds", s.numberOfBeds],
  ] as const).flatMap(([label, v]) => (num(v) ? [{ label, value: num(v)! }] : []));
}

export function roomBeds(st: any, live: any): string | null {
  const beds = (Array.isArray(st?.beds) && st.beds.length ? st.beds : live?.settings?.beddingConfigurations) ?? [];
  const parts = beds.map((b: any) => `${num(b?.quantity) ?? 1} × ${text(b?.type) ?? text(b?.size) ?? "bed"}`);
  return parts.length ? parts.join(", ") : null;
}

/** Static hotel-level policies (non-rate). Cancellation rules stay with each rate. */
export function hotelPolicies(stat: any): { title: string; body: string }[] {
  const list = Array.isArray(stat?.policies) ? stat.policies : [];
  return list.flatMap((p: any) => {
    if (p?.type === "cancellation") return [];
    const title = text(p?.name) ?? text(p?.type);
    const body = text(p?.description) ?? text(p?.text) ?? (typeof p?.result === "string" ? text(p.result) : null);
    return title && body ? [{ title, body }] : [];
  });
}
