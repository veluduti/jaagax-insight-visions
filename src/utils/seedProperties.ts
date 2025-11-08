import { supabase } from "@/integrations/supabase/client";

export const propertyData = [
  {
    title: "3BHK Luxury Apartment in Kokapet",
    city: "Hyderabad",
    locality: "Kokapet",
    lat: 17.385,
    lng: 78.403,
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
    description: "Luxury apartment in prime Kokapet location with modern amenities"
  },
  {
    title: "2BHK Flat Near Kondapur Metro",
    city: "Hyderabad",
    locality: "Kondapur",
    lat: 17.46,
    lng: 78.356,
    price: 6200000,
    area: 1250,
    type: "apartment" as const,
    beds: 2,
    baths: 2,
    bhk: 2,
    status: "Ready",
    verified: true,
    trust_score: 88,
    images: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c"],
    description: "Well-connected flat near Kondapur Metro station"
  },
  {
    title: "4BHK Villa Riverfront View",
    city: "Vijayawada",
    locality: "Tadepalli",
    lat: 16.483,
    lng: 80.593,
    price: 18500000,
    area: 3200,
    type: "villa" as const,
    beds: 4,
    baths: 4,
    bhk: 4,
    status: "Ready",
    verified: true,
    trust_score: 97,
    images: ["https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf"],
    description: "Stunning villa with riverfront views in Tadepalli"
  },
  {
    title: "Premium Office Space in Gachibowli",
    city: "Hyderabad",
    locality: "Gachibowli",
    lat: 17.442,
    lng: 78.344,
    price: 32000000,
    area: 5200,
    type: "commercial" as const,
    beds: 0,
    baths: 2,
    bhk: 0,
    status: "Ready",
    verified: true,
    trust_score: 91,
    images: ["https://images.unsplash.com/photo-1600585154240-10b76b12c7e2"],
    description: "Premium office space in Gachibowli's IT hub"
  },
  {
    title: "Affordable 1BHK in Kanuru",
    city: "Vijayawada",
    locality: "Kanuru",
    lat: 16.514,
    lng: 80.648,
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
    description: "Affordable housing option in Kanuru"
  },
  {
    title: "3BHK Smart Home with Voice AI",
    city: "Hyderabad",
    locality: "Narsingi",
    lat: 17.371,
    lng: 78.365,
    price: 8700000,
    area: 1600,
    type: "apartment" as const,
    beds: 3,
    baths: 3,
    bhk: 3,
    status: "Under Construction",
    verified: true,
    trust_score: 93,
    images: ["https://images.unsplash.com/photo-1600607686046-6bf4b1df4d8a"],
    description: "Smart home with integrated voice AI and home automation"
  },
  {
    title: "2BHK River View Apartment",
    city: "Vijayawada",
    locality: "Benz Circle",
    lat: 16.518,
    lng: 80.635,
    price: 5800000,
    area: 1150,
    type: "apartment" as const,
    beds: 2,
    baths: 2,
    bhk: 2,
    status: "Ready",
    verified: true,
    trust_score: 89,
    images: ["https://images.unsplash.com/photo-1600585154141-10b76b12c7e2"],
    description: "Beautiful river view apartment in Benz Circle"
  },
  {
    title: "Independent House near Charminar",
    city: "Hyderabad",
    locality: "Old City",
    lat: 17.36,
    lng: 78.474,
    price: 4200000,
    area: 950,
    type: "villa" as const,
    beds: 2,
    baths: 1,
    bhk: 2,
    status: "Ready",
    verified: false,
    trust_score: 55,
    images: ["https://images.unsplash.com/photo-1593784991656-d6d67fbdc7a5"],
    description: "Independent house near historic Charminar"
  },
  {
    title: "3BHK Lake View Flat",
    city: "Hyderabad",
    locality: "Tellapur",
    lat: 17.469,
    lng: 78.298,
    price: 7900000,
    area: 1450,
    type: "apartment" as const,
    beds: 3,
    baths: 3,
    bhk: 3,
    status: "Ready",
    verified: true,
    trust_score: 94,
    images: ["https://images.unsplash.com/photo-1600585154356-596af9009b7d"],
    description: "Serene lake view flat in Tellapur"
  },
  {
    title: "Duplex Villa with Rooftop Garden",
    city: "Vijayawada",
    locality: "Poranki",
    lat: 16.486,
    lng: 80.676,
    price: 13000000,
    area: 2600,
    type: "villa" as const,
    beds: 4,
    baths: 4,
    bhk: 4,
    status: "Ready",
    verified: true,
    trust_score: 96,
    images: ["https://images.unsplash.com/photo-1600585154223-9019e5ff3c7d"],
    description: "Luxurious duplex villa with rooftop garden in Poranki"
  }
];

export async function seedProperties() {
  try {
    const { data, error } = await supabase
      .from("properties")
      .insert(propertyData)
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
