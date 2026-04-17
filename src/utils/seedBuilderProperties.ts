import { supabase } from "@/integrations/supabase/client";

const SAMPLES = [
  {
    title: "3 BHK Premium Apartment in Gachibowli",
    description: "Spacious 3BHK with modern amenities, modular kitchen, balcony with lake view, 24x7 security, swimming pool, gym.",
    type: "Apartment",
    completion_stage: "Ready",
    city: "Hyderabad",
    locality: "Gachibowli",
    address: "Tower B, Prestige Tech Park, Gachibowli",
    latitude: 17.4435,
    longitude: 78.3772,
    price: 9500000,
    area_sqft: 1650,
    bhk: 3,
    bedrooms: 3,
    bathrooms: 3,
    building_name: "Prestige Tower B",
    total_floors: 22,
    total_parking: 2,
    elevators: 4,
    retail_centres: 1,
    images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800"],
  },
  {
    title: "4 BHK Luxury Villa with Private Garden",
    description: "Independent villa in gated community. Private garden, double-height living, premium fittings, smart-home ready.",
    type: "Villa",
    completion_stage: "Ready",
    city: "Hyderabad",
    locality: "Kokapet",
    address: "Plot 24, Kokapet Premium Villas",
    latitude: 17.3850,
    longitude: 78.4030,
    price: 24500000,
    area_sqft: 3400,
    bhk: 4,
    bedrooms: 4,
    bathrooms: 5,
    building_name: "Kokapet Greens",
    total_floors: 3,
    total_parking: 3,
    elevators: 1,
    retail_centres: 0,
    images: ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"],
  },
  {
    title: "2 BHK Smart Home — New Launch",
    description: "Brand-new launch with smart automation, EV-charging, club house, jogging track, kids' play area.",
    type: "Apartment",
    completion_stage: "New Launch",
    city: "Hyderabad",
    locality: "Narsingi",
    address: "Block C, Skyline Heights, Narsingi",
    latitude: 17.3710,
    longitude: 78.3650,
    price: 6800000,
    area_sqft: 1180,
    bhk: 2,
    bedrooms: 2,
    bathrooms: 2,
    building_name: "Skyline Heights",
    total_floors: 18,
    total_parking: 1,
    elevators: 3,
    retail_centres: 1,
    images: ["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"],
  },
];

export async function seedBuilderSampleProperties() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not logged in" } as const;

  const rows = SAMPLES.map((s) => ({
    ...s,
    submitted_by: user.id,
    verification_status: "pending",
    verified: false,
  }));

  const { data, error } = await supabase.from("properties").insert(rows as any).select("id");
  if (error) return { success: false, error: error.message } as const;
  return { success: true, count: data?.length ?? 0 } as const;
}
