import { supabase } from "@/integrations/supabase/client";

function toPropertyType(type: string): "apartment" | "villa" | "plot" | "commercial" {
  switch (type) {
    case "villa":
      return "villa";
    case "plot":
      return "plot";
    case "commercial":
      return "commercial";
    default:
      return "apartment";
  }
}

async function resolveBuilderId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("get_builder_id", { _user_id: user.id });
  if (error) return null;
  return data ?? null;
}

// Quick seed function - call this from browser console if button doesn't work
export async function quickSeedData() {
  console.log("🌱 Starting quick seed...");
  
  // Seed 10 properties
  const properties = [
    {
      title: "4BHK Luxury Penthouse", city: "Hyderabad", locality: "Gachibowli",
      lat: 17.4402, lng: 78.3487, price: 25000000, area: 3500, type: "apartment",
      beds: 4, baths: 4, bhk: 4, status: "Ready", verified: true, trust_score: 98,
      images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c"],
      description: "Ultra-luxury penthouse"
    },
    {
      title: "3BHK Premium Apartment", city: "Hyderabad", locality: "Gachibowli",
      lat: 17.4419, lng: 78.3494, price: 15000000, area: 2200, type: "apartment",
      beds: 3, baths: 3, bhk: 3, status: "Ready", verified: true, trust_score: 96,
      images: ["https://images.unsplash.com/photo-1600607686046-6bf4b1df4d8a"],
      description: "Premium apartment near tech parks"
    },
    {
      title: "2BHK Smart Home", city: "Hyderabad", locality: "Hitech City",
      lat: 17.4475, lng: 78.3742, price: 9500000, area: 1450, type: "apartment",
      beds: 2, baths: 2, bhk: 2, status: "Ready", verified: true, trust_score: 92,
      images: ["https://images.unsplash.com/photo-1600585154526-990dced4db0d"],
      description: "Modern smart home"
    },
    {
      title: "5BHK Villa with Pool", city: "Hyderabad", locality: "Jubilee Hills",
      lat: 17.4326, lng: 78.4071, price: 45000000, area: 5500, type: "villa",
      beds: 5, baths: 5, bhk: 5, status: "Ready", verified: true, trust_score: 99,
      images: ["https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf"],
      description: "Luxury villa with pool"
    },
    {
      title: "Commercial Office", city: "Hyderabad", locality: "Financial District",
      lat: 17.4239, lng: 78.3373, price: 85000000, area: 12000, type: "commercial",
      beds: 0, baths: 4, bhk: 0, status: "Ready", verified: true, trust_score: 94,
      images: ["https://images.unsplash.com/photo-1600585154240-10b76b12c7e2"],
      description: "Grade-A office space"
    },
    {
      title: "3BHK Riverfront", city: "Vijayawada", locality: "Tadepalli",
      lat: 16.483, lng: 80.593, price: 12000000, area: 1800, type: "apartment",
      beds: 3, baths: 3, bhk: 3, status: "Ready", verified: true, trust_score: 95,
      images: ["https://images.unsplash.com/photo-1600585154141-10b76b12c7e2"],
      description: "River view apartment"
    },
    {
      title: "2BHK Budget Flat", city: "Vijayawada", locality: "Kanuru",
      lat: 16.514, lng: 80.648, price: 4500000, area: 1100, type: "apartment",
      beds: 2, baths: 2, bhk: 2, status: "Ready", verified: true, trust_score: 85,
      images: ["https://images.unsplash.com/photo-1560185127-6ed189bf02b6"],
      description: "Affordable housing"
    },
    {
      title: "4BHK Duplex Villa", city: "Vijayawada", locality: "Poranki",
      lat: 16.486, lng: 80.676, price: 18000000, area: 2800, type: "villa",
      beds: 4, baths: 4, bhk: 4, status: "Ready", verified: true, trust_score: 97,
      images: ["https://images.unsplash.com/photo-1600585154223-9019e5ff3c7d"],
      description: "Spacious duplex"
    },
    {
      title: "1BHK Compact Flat", city: "Hyderabad", locality: "Kukatpally",
      lat: 17.4948, lng: 78.3990, price: 3200000, area: 650, type: "apartment",
      beds: 1, baths: 1, bhk: 1, status: "Ready", verified: false, trust_score: 72,
      images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"],
      description: "Compact starter home"
    },
    {
      title: "3BHK Lake View", city: "Hyderabad", locality: "Madhapur",
      lat: 17.4475, lng: 78.3908, price: 11500000, area: 1650, type: "apartment",
      beds: 3, baths: 2, bhk: 3, status: "Ready", verified: true, trust_score: 91,
      images: ["https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3"],
      description: "Serene lake view"
    }
  ];

  const builderId = await resolveBuilderId();
  if (!builderId) {
    const error = new Error(
      "Cannot seed properties: no builder profile for the current user. Log in as a Builder (with a builders row) and try again."
    );
    console.error("❌ Error:", error);
    return { success: false, error };
  }

  const rows = properties.map((p) => ({
    active: true,
    builder_id: builderId,
    title: p.title,
    address: `${p.locality}, ${p.city}`,
    city: p.city,
    locality: p.locality,
    latitude: p.lat,
    longitude: p.lng,
    price: p.price,
    area_sqft: p.area,
    bedrooms: p.beds,
    bathrooms: p.baths,
    bhk: p.bhk,
    completion_stage: p.status,
    verified: p.verified,
    trust_score: p.trust_score,
    images: p.images,
    description: p.description,
    type: p.type,
    property_type: toPropertyType(p.type),
  }));

  const { data, error } = await supabase
    .from("properties")
    .insert(rows as any)
    .select();

  if (error) {
    console.error("❌ Error:", error);
    return { success: false, error };
  }

  console.log("✅ Successfully seeded", data?.length, "properties!");
  return { success: true, count: data?.length };
}

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).quickSeedData = quickSeedData;
}
