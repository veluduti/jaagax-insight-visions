import { supabase } from "@/integrations/supabase/client";

export const agentsData = [
  // Hyderabad Agents
  {
    name: "Rajesh Kumar",
    agency_name: "TruBrokers Realty",
    languages: "English, Telugu, Hindi",
    cities_served: "Hyderabad",
    sales_count: 45,
    rent_count: 28,
    photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
    trust_score: 92,
    verified: true
  },
  {
    name: "Priya Sharma",
    agency_name: "Elite Spaces",
    languages: "English, Hindi",
    cities_served: "Hyderabad",
    sales_count: 38,
    rent_count: 22,
    photo_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    trust_score: 89,
    verified: true
  },
  {
    name: "Srinivas Reddy",
    agency_name: "Prime Realty Group",
    languages: "English, Telugu",
    cities_served: "Hyderabad",
    sales_count: 52,
    rent_count: 31,
    photo_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
    trust_score: 94,
    verified: true
  },
  {
    name: "Swetha Naidu",
    agency_name: "Royal Nest Properties",
    languages: "English, Telugu",
    cities_served: "Hyderabad",
    sales_count: 41,
    rent_count: 19,
    photo_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
    trust_score: 87,
    verified: true
  },
  {
    name: "Arjun Mehta",
    agency_name: "UrbanKey Realty",
    languages: "English, Hindi, Telugu",
    cities_served: "Hyderabad",
    sales_count: 36,
    rent_count: 25,
    photo_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e",
    trust_score: 85,
    verified: true
  },
  {
    name: "Lakshmi Devi",
    agency_name: "HomeSync Advisors",
    languages: "English, Telugu",
    cities_served: "Hyderabad",
    sales_count: 29,
    rent_count: 17,
    photo_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
    trust_score: 82,
    verified: true
  },
  {
    name: "Venkat Rao",
    agency_name: "SkyRise Properties",
    languages: "English, Telugu",
    cities_served: "Hyderabad",
    sales_count: 48,
    rent_count: 30,
    photo_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
    trust_score: 91,
    verified: true
  },
  {
    name: "Divya Krishnan",
    agency_name: "DreamHomes Realty",
    languages: "English, Tamil, Telugu",
    cities_served: "Hyderabad",
    sales_count: 34,
    rent_count: 21,
    photo_url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
    trust_score: 88,
    verified: true
  },
  
  // Vijayawada Agents
  {
    name: "John Mathew",
    agency_name: "VM Realty Solutions",
    languages: "English, Telugu",
    cities_served: "Vijayawada",
    sales_count: 32,
    rent_count: 18,
    photo_url: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef",
    trust_score: 84,
    verified: true
  },
  {
    name: "Kiran Reddy",
    agency_name: "Amaravathi Estates",
    languages: "English, Telugu",
    cities_served: "Vijayawada",
    sales_count: 28,
    rent_count: 15,
    photo_url: "https://images.unsplash.com/photo-1463453091185-61582044d556",
    trust_score: 81,
    verified: true
  },
  {
    name: "Padma Kumari",
    agency_name: "Chanakya Properties",
    languages: "English, Telugu",
    cities_served: "Vijayawada",
    sales_count: 25,
    rent_count: 12,
    photo_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956",
    trust_score: 79,
    verified: true
  },
  {
    name: "Ramesh Babu",
    agency_name: "HomeLand Avenues",
    languages: "English, Telugu",
    cities_served: "Vijayawada",
    sales_count: 30,
    rent_count: 16,
    photo_url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce",
    trust_score: 83,
    verified: true
  },
  {
    name: "Sandhya Rani",
    agency_name: "MetroLand Properties",
    languages: "English, Telugu",
    cities_served: "Vijayawada",
    sales_count: 27,
    rent_count: 14,
    photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
    trust_score: 80,
    verified: true
  }
];

export async function seedAgents() {
  try {
    // First check if agents already exist
    const { count } = await supabase
      .from("agents")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      console.log("Agents already seeded");
      return { success: true, message: "Agents already exist" };
    }

    // Insert agents directly - no user_id needed
    const { data, error } = await supabase
      .from("agents")
      .insert(agentsData)
      .select();

    if (error) {
      console.error("Error seeding agents:", error);
      return { success: false, error };
    }

    console.log("Successfully seeded agents:", data);
    return { success: true, data };
  } catch (err) {
    console.error("Exception seeding agents:", err);
    return { success: false, error: err };
  }
}
