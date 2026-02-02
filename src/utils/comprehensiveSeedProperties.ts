import { supabase } from "@/integrations/supabase/client";

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

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

// Comprehensive real estate data for Hyderabad and Vijayawada
export const comprehensiveProperties = [
  // Premium Hyderabad Properties - Gachibowli/Financial District
  {
    title: "4BHK Luxury Penthouse in Gachibowli",
    city: "Hyderabad",
    locality: "Gachibowli",
    lat: 17.4402,
    lng: 78.3487,
    price: 25000000,
    area: 3500,
    type: "apartment" as const,
    beds: 4,
    baths: 4,
    bhk: 4,
    status: "Ready",
    verified: true,
    trust_score: 98,
    images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c"],
    description: "Ultra-luxury penthouse with panoramic city views in IT corridor"
  },
  {
    title: "3BHK Premium Apartment near DLF Cybercity",
    city: "Hyderabad",
    locality: "Gachibowli",
    lat: 17.4419,
    lng: 78.3494,
    price: 15000000,
    area: 2200,
    type: "apartment" as const,
    beds: 3,
    baths: 3,
    bhk: 3,
    status: "Ready",
    verified: true,
    trust_score: 96,
    images: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00"],
    description: "Modern apartment with smart home features near tech parks"
  },
  
  // Kokapet Luxury
  {
    title: "3BHK Spacious Apartment in Kokapet",
    city: "Hyderabad",
    locality: "Kokapet",
    lat: 17.3850,
    lng: 78.4030,
    price: 9500000,
    area: 1650,
    type: "apartment" as const,
    beds: 3,
    baths: 3,
    bhk: 3,
    status: "Ready",
    verified: true,
    trust_score: 95,
    images: ["https://images.unsplash.com/photo-1592595896551-c4231b9928d1"],
    description: "Premium apartment in emerging Kokapet with excellent connectivity"
  },
  {
    title: "4BHK Villa with Private Garden Kokapet",
    city: "Hyderabad",
    locality: "Kokapet",
    lat: 17.3865,
    lng: 78.4045,
    price: 18000000,
    area: 3000,
    type: "villa" as const,
    beds: 4,
    baths: 4,
    bhk: 4,
    status: "Ready",
    verified: true,
    trust_score: 97,
    images: ["https://images.unsplash.com/photo-1600585154240-10b76b12c7e2"],
    description: "Luxurious independent villa with modern amenities"
  },

  // Kondapur
  {
    title: "2BHK Apartment Near Kondapur Metro",
    city: "Hyderabad",
    locality: "Kondapur",
    lat: 17.4600,
    lng: 78.3560,
    price: 6200000,
    area: 1250,
    type: "apartment" as const,
    beds: 2,
    baths: 2,
    bhk: 2,
    status: "Ready",
    verified: true,
    trust_score: 88,
    images: ["https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3"],
    description: "Well-connected flat near Metro station and IT hubs"
  },
  {
    title: "3BHK Ready to Move Flat Kondapur",
    city: "Hyderabad",
    locality: "Kondapur",
    lat: 17.4615,
    lng: 78.3575,
    price: 8500000,
    area: 1550,
    type: "apartment" as const,
    beds: 3,
    baths: 2,
    bhk: 3,
    status: "Ready",
    verified: true,
    trust_score: 91,
    images: ["https://images.unsplash.com/photo-1600585154141-10b76b12c7e2"],
    description: "Spacious flat in prime Kondapur location"
  },

  // Narsingi/Financial District
  {
    title: "3BHK Smart Home in Narsingi",
    city: "Hyderabad",
    locality: "Narsingi",
    lat: 17.3710,
    lng: 78.3650,
    price: 8700000,
    area: 1600,
    type: "apartment" as const,
    beds: 3,
    baths: 2,
    bhk: 3,
    status: "Ready",
    verified: true,
    trust_score: 93,
    images: ["https://images.unsplash.com/photo-1600585154223-9019e5ff3c7d"],
    description: "AI-powered smart home near Financial District"
  },

  // Miyapur
  {
    title: "2BHK Affordable Flat in Miyapur",
    city: "Hyderabad",
    locality: "Miyapur",
    lat: 17.4969,
    lng: 78.3585,
    price: 5900000,
    area: 1100,
    type: "apartment" as const,
    beds: 2,
    baths: 2,
    bhk: 2,
    status: "Ready",
    verified: true,
    trust_score: 86,
    images: ["https://images.unsplash.com/photo-1600585154363-67eb9e2e2099"],
    description: "Budget-friendly apartment with Metro connectivity"
  },

  // Bachupally
  {
    title: "3BHK Gated Community Bachupally",
    city: "Hyderabad",
    locality: "Bachupally",
    lat: 17.5438,
    lng: 78.3811,
    price: 6800000,
    area: 1450,
    type: "apartment" as const,
    beds: 3,
    baths: 2,
    bhk: 3,
    status: "Ready",
    verified: true,
    trust_score: 89,
    images: ["https://images.unsplash.com/photo-1600585154526-990dced4db0d"],
    description: "Spacious flat in secure gated community"
  },

  // Tellapur
  {
    title: "3BHK Modern Apartment Tellapur",
    city: "Hyderabad",
    locality: "Tellapur",
    lat: 17.4800,
    lng: 78.2800,
    price: 7500000,
    area: 1500,
    type: "apartment" as const,
    beds: 3,
    baths: 2,
    bhk: 3,
    status: "Under Construction",
    verified: true,
    trust_score: 90,
    images: ["https://images.unsplash.com/photo-1577495508048-b635879837f1"],
    description: "Upcoming project in peaceful Tellapur"
  },

  // Commercial Hyderabad
  {
    title: "Premium Office Space Gachibowli",
    city: "Hyderabad",
    locality: "Gachibowli",
    lat: 17.4425,
    lng: 78.3445,
    price: 32000000,
    area: 5200,
    type: "commercial" as const,
    beds: 0,
    baths: 2,
    bhk: 0,
    status: "Ready",
    verified: true,
    trust_score: 92,
    images: ["https://images.unsplash.com/photo-1486406146926-c627a92ad1ab"],
    description: "Grade-A office space in IT corridor"
  },

  // Vijayawada Properties
  // Benz Circle
  {
    title: "3BHK Premium Flat Benz Circle",
    city: "Vijayawada",
    locality: "Benz Circle",
    lat: 16.5062,
    lng: 80.6480,
    price: 5800000,
    area: 1400,
    type: "apartment" as const,
    beds: 3,
    baths: 2,
    bhk: 3,
    status: "Ready",
    verified: true,
    trust_score: 92,
    images: ["https://images.unsplash.com/photo-1582407947304-fd86f028f716"],
    description: "Prime location apartment in heart of Vijayawada"
  },
  {
    title: "2BHK Ready Apartment Benz Circle",
    city: "Vijayawada",
    locality: "Benz Circle",
    lat: 16.5075,
    lng: 80.6495,
    price: 4500000,
    area: 1100,
    type: "apartment" as const,
    beds: 2,
    baths: 2,
    bhk: 2,
    status: "Ready",
    verified: true,
    trust_score: 88,
    images: ["https://images.unsplash.com/photo-1560179707-f14e90ef3623"],
    description: "Well-maintained flat in central location"
  },

  // Poranki
  {
    title: "4BHK Villa with Garden Poranki",
    city: "Vijayawada",
    locality: "Poranki",
    lat: 16.4830,
    lng: 80.5930,
    price: 12500000,
    area: 2800,
    type: "villa" as const,
    beds: 4,
    baths: 4,
    bhk: 4,
    status: "Ready",
    verified: true,
    trust_score: 96,
    images: ["https://images.unsplash.com/photo-1600585154141-10b76b12c7e2"],
    description: "Luxurious villa in serene Poranki location"
  },
  {
    title: "3BHK Independent House Poranki",
    city: "Vijayawada",
    locality: "Poranki",
    lat: 16.4845,
    lng: 80.5945,
    price: 8200000,
    area: 1900,
    type: "villa" as const,
    beds: 3,
    baths: 3,
    bhk: 3,
    status: "Ready",
    verified: true,
    trust_score: 91,
    images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c"],
    description: "Spacious independent house with modern amenities"
  },

  // Tadepalli
  {
    title: "4BHK River View Apartment Tadepalli",
    city: "Vijayawada",
    locality: "Tadepalli",
    lat: 16.4830,
    lng: 80.5930,
    price: 9500000,
    area: 2100,
    type: "apartment" as const,
    beds: 4,
    baths: 3,
    bhk: 4,
    status: "Ready",
    verified: true,
    trust_score: 94,
    images: ["https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf"],
    description: "Premium flat overlooking Krishna River"
  },

  // Patamata
  {
    title: "2BHK Budget Flat Patamata",
    city: "Vijayawada",
    locality: "Patamata",
    lat: 16.5128,
    lng: 80.6561,
    price: 3900000,
    area: 950,
    type: "apartment" as const,
    beds: 2,
    baths: 1,
    bhk: 2,
    status: "Ready",
    verified: false,
    trust_score: 72,
    images: ["https://images.unsplash.com/photo-1560185127-6ed189bf02b6"],
    description: "Affordable housing option in Patamata"
  },

  // Gunadala
  {
    title: "3BHK Modern Flat Gunadala",
    city: "Vijayawada",
    locality: "Gunadala",
    lat: 16.5200,
    lng: 80.6450,
    price: 5500000,
    area: 1300,
    type: "apartment" as const,
    beds: 3,
    baths: 2,
    bhk: 3,
    status: "Ready",
    verified: true,
    trust_score: 85,
    images: ["https://images.unsplash.com/photo-1600585154363-67eb9e2e2099"],
    description: "Contemporary apartment with good connectivity"
  },

  // Gollapudi
  {
    title: "3BHK Spacious Apartment Gollapudi",
    city: "Vijayawada",
    locality: "Gollapudi",
    lat: 16.5450,
    lng: 80.6200,
    price: 6800000,
    area: 1550,
    type: "apartment" as const,
    beds: 3,
    baths: 2,
    bhk: 3,
    status: "Ready",
    verified: true,
    trust_score: 87,
    images: ["https://images.unsplash.com/photo-1600585154526-990dced4db0d"],
    description: "Well-designed flat in developing locality"
  },

  // Kanuru
  {
    title: "1BHK Affordable Flat Kanuru",
    city: "Vijayawada",
    locality: "Kanuru",
    lat: 16.5140,
    lng: 80.6480,
    price: 2900000,
    area: 800,
    type: "apartment" as const,
    beds: 1,
    baths: 1,
    bhk: 1,
    status: "Ready",
    verified: false,
    trust_score: 61,
    images: ["https://images.unsplash.com/photo-1560185127-6ed189bf02b6"],
    description: "Budget-friendly starter home in Kanuru"
  }
];

export async function clearAllData() {
  try {
    // Delete in reverse order of dependencies
    await supabase.from("properties").delete().neq("id", ZERO_UUID);
    await supabase.from("agents").delete().neq("id", ZERO_UUID);
    await supabase.from("projects").delete().neq("id", ZERO_UUID);
    
    console.log("All data cleared successfully");
    return { success: true };
  } catch (err) {
    console.error("Error clearing data:", err);
    return { success: false, error: err };
  }
}

export async function seedComprehensiveProperties() {
  try {
    const { count } = await supabase
      .from("properties")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      console.log("Properties already seeded");
      return { success: true, message: "Properties already exist" };
    }

    const builderId = await resolveBuilderId();
    if (!builderId) {
      const error = new Error(
        "Cannot seed properties: no builder profile for the current user. Log in as a Builder (with a builders row) and try again."
      );
      console.error(error);
      return { success: false, error };
    }

    const rows = comprehensiveProperties.map((p) => ({
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
      console.error("Error seeding properties:", error);
      return { success: false, error };
    }

    console.log("Successfully seeded properties:", data);
    return { success: true, data };
  } catch (err) {
    console.error("Exception seeding properties:", err);
    return { success: false, error: err };
  }
}
