import { supabase } from "@/integrations/supabase/client";

export const agentsData = [
  {
    name: "Rajesh Kumar",
    email: "rajesh.kumar@example.com",
    agency_name: "DreamHomes Realty",
    languages: ["English", "Telugu"],
    cities_served: ["Hyderabad"],
    sales_count: 24,
    rent_count: 10,
    avatar_url: "https://images.unsplash.com/photo-1607746882042-944635dfe10e",
    specialization: "Residential Properties",
    avg_response_time: "1 hour"
  },
  {
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    agency_name: "EliteSpaces",
    languages: ["English", "Hindi"],
    cities_served: ["Hyderabad"],
    sales_count: 18,
    rent_count: 8,
    avatar_url: "https://images.unsplash.com/photo-1595152772835-219674b2a8a6",
    specialization: "Luxury Apartments",
    avg_response_time: "2 hours"
  },
  {
    name: "John Mathew",
    email: "john.mathew@example.com",
    agency_name: "SkyRise Properties",
    languages: ["English"],
    cities_served: ["Vijayawada"],
    sales_count: 20,
    rent_count: 11,
    avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
    specialization: "Commercial & Residential",
    avg_response_time: "3 hours"
  },
  {
    name: "Swetha Naidu",
    email: "swetha.naidu@example.com",
    agency_name: "RoyalNest",
    languages: ["English", "Telugu"],
    cities_served: ["Hyderabad"],
    sales_count: 26,
    rent_count: 9,
    avatar_url: "https://images.unsplash.com/photo-1603415526960-f8f0e51e6f5c",
    specialization: "Premium Properties",
    avg_response_time: "1 hour"
  },
  {
    name: "Kiran Reddy",
    email: "kiran.reddy@example.com",
    agency_name: "UrbanKey",
    languages: ["English", "Telugu"],
    cities_served: ["Vijayawada"],
    sales_count: 12,
    rent_count: 7,
    avatar_url: "https://images.unsplash.com/photo-1607746882042-944635dfe10e",
    specialization: "Affordable Housing",
    avg_response_time: "2 hours"
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
    // In production, these would be real auth user IDs
    const dummyUserIds = [
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
      "33333333-3333-3333-3333-333333333333",
      "44444444-4444-4444-4444-444444444444",
      "55555555-5555-5555-5555-555555555555",
    ];

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
      languages: agent.languages,
      cities_served: agent.cities_served,
      sales_count: agent.sales_count,
      rent_count: agent.rent_count,
      specialization: agent.specialization,
      avg_response_time: agent.avg_response_time,
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
