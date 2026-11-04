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

// The existing connector is certified against this property; it does not yet
// expose a full catalog endpoint. Hotel content always comes from HyperGuest.
const CERTIFICATION_PROPERTY_ID = 19912;

export async function loadHyperGuestHotels(): Promise<HyperGuestHotel[]> {
  const { data, error } = await supabase.functions.invoke("hyperguest", {
    body: { action: "static", propertyId: CERTIFICATION_PROPERTY_ID },
  });
  if (error || data?.error) throw new Error("HyperGuest hotels could not be loaded. Please try again.");
  if (!data || !Number.isInteger(data.id) || typeof data.name !== "string") {
    throw new Error("HyperGuest returned incomplete hotel details. Please try again.");
  }
  return [data as HyperGuestHotel];
}