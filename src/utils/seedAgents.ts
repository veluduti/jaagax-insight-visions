import { supabase } from "@/integrations/supabase/client";

export const agentsData = [
  // Hyderabad Agents
  {
    name: "Rajesh Kumar",
    email: "rajesh.kumar@trubrokers.com",
    agency_name: "TruBrokers Realty",
    languages: ["English", "Telugu", "Hindi"],
    cities_served: ["Hyderabad"],
    sales_count: 45,
    rent_count: 28,
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
    specialization: "Luxury Apartments & Villas",
    avg_response_time: "30 minutes"
  },
  {
    name: "Priya Sharma",
    email: "priya.sharma@elitespaces.com",
    agency_name: "Elite Spaces",
    languages: ["English", "Hindi"],
    cities_served: ["Hyderabad"],
    sales_count: 38,
    rent_count: 22,
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
    specialization: "IT Corridor Properties",
    avg_response_time: "45 minutes"
  },
  {
    name: "Srinivas Reddy",
    email: "srini.reddy@primerealty.com",
    agency_name: "Prime Realty Group",
    languages: ["English", "Telugu"],
    cities_served: ["Hyderabad"],
    sales_count: 52,
    rent_count: 31,
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
    specialization: "Commercial & Residential",
    avg_response_time: "1 hour"
  },
  {
    name: "Swetha Naidu",
    email: "swetha.naidu@royalnest.com",
    agency_name: "Royal Nest Properties",
    languages: ["English", "Telugu"],
    cities_served: ["Hyderabad"],
    sales_count: 41,
    rent_count: 19,
    avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
    specialization: "Gated Communities",
    avg_response_time: "30 minutes"
  },
  {
    name: "Arjun Mehta",
    email: "arjun.mehta@urbankey.com",
    agency_name: "UrbanKey Realty",
    languages: ["English", "Hindi", "Telugu"],
    cities_served: ["Hyderabad"],
    sales_count: 36,
    rent_count: 25,
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e",
    specialization: "Investment Properties",
    avg_response_time: "1 hour"
  },
  {
    name: "Lakshmi Devi",
    email: "lakshmi.devi@homesync.com",
    agency_name: "HomeSync Advisors",
    languages: ["English", "Telugu"],
    cities_served: ["Hyderabad"],
    sales_count: 29,
    rent_count: 17,
    avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2",
    specialization: "Affordable Housing",
    avg_response_time: "2 hours"
  },
  {
    name: "Venkat Rao",
    email: "venkat.rao@skyrise.com",
    agency_name: "SkyRise Properties",
    languages: ["English", "Telugu"],
    cities_served: ["Hyderabad"],
    sales_count: 48,
    rent_count: 30,
    avatar_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
    specialization: "High-Rise Apartments",
    avg_response_time: "45 minutes"
  },
  {
    name: "Divya Krishnan",
    email: "divya.k@dreamhomes.com",
    agency_name: "DreamHomes Realty",
    languages: ["English", "Tamil", "Telugu"],
    cities_served: ["Hyderabad"],
    sales_count: 34,
    rent_count: 21,
    avatar_url: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f",
    specialization: "Premium Villas",
    avg_response_time: "1 hour"
  },
  
  // Vijayawada Agents
  {
    name: "John Mathew",
    email: "john.mathew@vmrealty.com",
    agency_name: "VM Realty Solutions",
    languages: ["English", "Telugu"],
    cities_served: ["Vijayawada"],
    sales_count: 32,
    rent_count: 18,
    avatar_url: "https://images.unsplash.com/photo-1519345182560-3f2917c472ef",
    specialization: "Residential Properties",
    avg_response_time: "1 hour"
  },
  {
    name: "Kiran Reddy",
    email: "kiran.reddy@amaravathi.com",
    agency_name: "Amaravathi Estates",
    languages: ["English", "Telugu"],
    cities_served: ["Vijayawada"],
    sales_count: 28,
    rent_count: 15,
    avatar_url: "https://images.unsplash.com/photo-1463453091185-61582044d556",
    specialization: "Commercial Spaces",
    avg_response_time: "2 hours"
  },
  {
    name: "Padma Kumari",
    email: "padma.k@chanakya.com",
    agency_name: "Chanakya Properties",
    languages: ["English", "Telugu"],
    cities_served: ["Vijayawada"],
    sales_count: 25,
    rent_count: 12,
    avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956",
    specialization: "Budget Apartments",
    avg_response_time: "3 hours"
  },
  {
    name: "Ramesh Babu",
    email: "ramesh.babu@homeland.com",
    agency_name: "HomeLand Avenues",
    languages: ["English", "Telugu"],
    cities_served: ["Vijayawada"],
    sales_count: 30,
    rent_count: 16,
    avatar_url: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce",
    specialization: "Plots & Land",
    avg_response_time: "2 hours"
  },
  {
    name: "Sandhya Rani",
    email: "sandhya.rani@metroland.com",
    agency_name: "MetroLand Properties",
    languages: ["English", "Telugu"],
    cities_served: ["Vijayawada"],
    sales_count: 27,
    rent_count: 14,
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
    specialization: "Family Homes",
    avg_response_time: "1 hour"
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

    // Create dummy user IDs (using gen_random_uuid format)
    const dummyUserIds = agentsData.map((_, idx) => 
      `${(idx + 1).toString().padStart(8, '1')}-1111-1111-1111-111111111111`
    );

    // First, insert users into users table
    const usersToInsert = agentsData.map((agent, idx) => ({
      id: dummyUserIds[idx],
      email: agent.email,
      name: agent.name,
      avatar_url: agent.avatar_url,
      verified: true,
      city: agent.cities_served[0] || "Hyderabad",
    }));

    const { error: usersError } = await supabase
      .from("users")
      .insert(usersToInsert);

    if (usersError && !usersError.message.includes("duplicate key")) {
      console.error("Error inserting users:", usersError);
      return { success: false, error: usersError };
    }

    // Then insert agent profiles
    const agentsToInsert = agentsData.map((agent, idx) => ({
      user_id: dummyUserIds[idx],
      agency_name: agent.agency_name,
      languages: agent.languages.join(", "), // Convert array to comma-separated string
      cities_served: agent.cities_served.join(", "), // Convert array to comma-separated string
      sales_count: agent.sales_count,
      rent_count: agent.rent_count,
    }));

    const { data, error } = await supabase
      .from("agents")
      .insert(agentsToInsert)
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
