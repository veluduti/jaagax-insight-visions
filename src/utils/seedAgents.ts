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
    const results = [];
    
    for (const agentData of agentsData) {
      // First, create a user account for the agent
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: agentData.email,
        password: "agent123456", // Default password
        options: {
          data: {
            name: agentData.name,
            avatar_url: agentData.avatar_url,
          }
        }
      });

      if (authError) {
        console.error(`Error creating auth user for ${agentData.name}:`, authError);
        // If user already exists, try to get their ID
        const { data: existingUsers } = await supabase
          .from("users")
          .select("id")
          .eq("email", agentData.email)
          .single();
        
        if (existingUsers) {
          // Update existing user
          await supabase
            .from("users")
            .update({
              name: agentData.name,
              avatar_url: agentData.avatar_url,
            })
            .eq("id", existingUsers.id);

          // Create or update agent profile
          const { data: agentProfile, error: agentError } = await supabase
            .from("agents")
            .upsert({
              user_id: existingUsers.id,
              agency_name: agentData.agency_name,
              languages: agentData.languages,
              cities_served: agentData.cities_served,
              sales_count: agentData.sales_count,
              rent_count: agentData.rent_count,
              specialization: agentData.specialization,
              avg_response_time: agentData.avg_response_time,
            })
            .select();

          if (agentError) {
            console.error(`Error creating agent profile for ${agentData.name}:`, agentError);
          } else {
            results.push(agentProfile);
          }
        }
        continue;
      }

      if (authData.user) {
        // Create agent profile
        const { data: agentProfile, error: agentError } = await supabase
          .from("agents")
          .insert({
            user_id: authData.user.id,
            agency_name: agentData.agency_name,
            languages: agentData.languages,
            cities_served: agentData.cities_served,
            sales_count: agentData.sales_count,
            rent_count: agentData.rent_count,
            specialization: agentData.specialization,
            avg_response_time: agentData.avg_response_time,
          })
          .select();

        if (agentError) {
          console.error(`Error creating agent profile for ${agentData.name}:`, agentError);
        } else {
          results.push(agentProfile);
        }
      }
    }

    console.log("Successfully seeded agents:", results);
    return { success: true, data: results };
  } catch (err) {
    console.error("Exception seeding agents:", err);
    return { success: false, error: err };
  }
}
