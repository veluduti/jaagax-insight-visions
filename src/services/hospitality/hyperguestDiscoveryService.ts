import { supabase } from "@/integrations/supabase/client";

export interface HyperGuestHotel {
  id: number;
  name: string;
  rating?: number;
  location?: { address?: string; city?: { name?: string }; country?: { name?: string } };
  images?: { uri?: string }[];
  rooms?: { images?: { uri?: string }[] }[];
  facilities?: { id: number; name: string; type?: string }[];
  descriptions?: { language: string; type: string; description: string }[];
}

export async function loadHyperGuestHotels(): Promise<HyperGuestHotel[]> {
  const data = await hyperguestRequest({ action: "marketplace" });
  return (data.hotels ?? []).map((h: any) => ({ id: Number(h.hyperguest_property_id), name: h.name, rating: h.star_rating, location: { address: h.locality, city: { name: h.city }, country: { name: h.country } }, images: (h.images ?? []).map((uri: string) => ({ uri })) }));
}

export async function hyperguestRequest(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("hyperguest", { body });
  if (error) {
    let message = "Hotel service could not complete the request. Please try again.";
    try { message = (await error.context.json())?.error ?? message; } catch { /* non-JSON response */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function loadSupplierAvailability(checkIn: string, nights: number, rooms: { adults: number; childAges: number[] }[], nationality = "IN", currency = "INR") {
  const data = await hyperguestRequest({ action: "marketplace-search", checkIn, nights, rooms, nationality, currency });
  return data.availability as { propertyId: number; available: boolean; price: number | null }[];
}

export async function loadSupplierAdmin() {
  const [hotels, logs] = await Promise.all([
    supabase.from("partner_hotels").select("id,name,city,hyperguest_property_id,supplier_synced_at,supplier_sync_error,is_active").eq("source_channel", "hyperguest").order("name"),
    supabase.from("hyperguest_sync_logs").select("*").order("created_at", { ascending: false }).limit(100),
  ]);
  if (hotels.error || logs.error) throw new Error("Could not load supplier management");
  return { hotels: hotels.data ?? [], logs: logs.data ?? [] };
}