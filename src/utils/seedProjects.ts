import { supabase } from "@/integrations/supabase/client";

export const projectsData = [
  // Hyderabad Projects
  {
    name: "Aparna Sarovar Zenith",
    builder_name: "Aparna Constructions",
    city: "Hyderabad",
    locality: "Nallagandla",
    avg_price: 8900000,
    verified: true,
    trust_score: 96,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00",
    overview: "Premium 3 & 4 BHK apartments with world-class amenities in Nallagandla",
    rera_id: "P02400005001"
  },
  {
    name: "My Home Bhooja",
    builder_name: "My Home Group",
    city: "Hyderabad",
    locality: "Gachibowli",
    avg_price: 12500000,
    verified: true,
    trust_score: 98,
    image: "https://images.unsplash.com/photo-1560179707-f14e90ef3623",
    overview: "Luxury high-rise apartments in the heart of IT corridor",
    rera_id: "P02400005002"
  },
  {
    name: "Ramky One Galaxia",
    builder_name: "Ramky Estates",
    city: "Hyderabad",
    locality: "Kokapet",
    avg_price: 9800000,
    verified: true,
    trust_score: 95,
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab",
    overview: "Modern living spaces with smart home features in Kokapet",
    rera_id: "P02400005003"
  },
  {
    name: "Prestige Lakeside Habitat",
    builder_name: "Prestige Group",
    city: "Hyderabad",
    locality: "Varthur",
    avg_price: 14200000,
    verified: true,
    trust_score: 97,
    image: "https://images.unsplash.com/photo-1582407947304-fd86f028f716",
    overview: "Ultra-luxury villas and apartments overlooking scenic lake views",
    rera_id: "P02400005004"
  },
  {
    name: "Hallmark Tranquil",
    builder_name: "Hallmark Builders",
    city: "Hyderabad",
    locality: "Tellapur",
    avg_price: 7500000,
    verified: true,
    trust_score: 93,
    image: "https://images.unsplash.com/photo-1577495508048-b635879837f1",
    overview: "Affordable luxury homes in peaceful Tellapur locality",
    rera_id: "P02400005005"
  },
  {
    name: "Praneeth Pranav Solitaire",
    builder_name: "Praneeth Group",
    city: "Hyderabad",
    locality: "Bachupally",
    avg_price: 6800000,
    verified: true,
    trust_score: 94,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
    overview: "Spacious 2 & 3 BHK flats with modern amenities",
    rera_id: "P02400005006"
  },
  {
    name: "Aparna Kanopy Marigold",
    builder_name: "Aparna Constructions",
    city: "Hyderabad",
    locality: "Miyapur",
    avg_price: 5900000,
    verified: true,
    trust_score: 96,
    image: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099",
    overview: "Well-designed apartments with excellent connectivity",
    rera_id: "P02400005007"
  },
  {
    name: "Ramky Tranquillas",
    builder_name: "Ramky Estates",
    city: "Hyderabad",
    locality: "Narsingi",
    avg_price: 8700000,
    verified: true,
    trust_score: 95,
    image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d",
    overview: "Serene living with state-of-the-art facilities in Narsingi",
    rera_id: "P02400005008"
  },
  {
    name: "My Home Avatar",
    builder_name: "My Home Group",
    city: "Hyderabad",
    locality: "Kokapet",
    avg_price: 11200000,
    verified: true,
    trust_score: 98,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00",
    overview: "Premium residential project with luxury amenities",
    rera_id: "P02400005009"
  },
  {
    name: "Prestige Falcon City",
    builder_name: "Prestige Group",
    city: "Hyderabad",
    locality: "Kondapur",
    avg_price: 10500000,
    verified: true,
    trust_score: 97,
    image: "https://images.unsplash.com/photo-1577495508048-b635879837f1",
    overview: "Integrated township with villas and apartments",
    rera_id: "P02400005010"
  },
  
  // Vijayawada Projects
  {
    name: "Bhavishya Homes Pride",
    builder_name: "Bhavishya Homes",
    city: "Vijayawada",
    locality: "Benz Circle",
    avg_price: 5800000,
    verified: true,
    trust_score: 92,
    image: "https://images.unsplash.com/photo-1600585154240-10b76b12c7e2",
    overview: "Premium apartments in the heart of Vijayawada",
    rera_id: "P02400006001"
  },
  {
    name: "Abhinandana Sai Dwaraka",
    builder_name: "Abhinandana Housing",
    city: "Vijayawada",
    locality: "Benz Circle",
    avg_price: 6200000,
    verified: true,
    trust_score: 91,
    image: "https://images.unsplash.com/photo-1600585154223-9019e5ff3c7d",
    overview: "Luxury living with modern amenities in prime location",
    rera_id: "P02400006002"
  },
  {
    name: "Dhatri Greenlands",
    builder_name: "Dhatri Housing",
    city: "Vijayawada",
    locality: "Poranki",
    avg_price: 7500000,
    verified: true,
    trust_score: 90,
    image: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3",
    overview: "Premium villas and plots in serene environment",
    rera_id: "P02400006003"
  },
  {
    name: "Metro Homes Jasmine",
    builder_name: "Metro Homes",
    city: "Vijayawada",
    locality: "Patamata",
    avg_price: 4900000,
    verified: true,
    trust_score: 89,
    image: "https://images.unsplash.com/photo-1600585154141-10b76b12c7e2",
    overview: "Affordable 2 & 3 BHK apartments with great connectivity",
    rera_id: "P02400006004"
  },
  {
    name: "Bhavishya Nandanavanam",
    builder_name: "Bhavishya Homes",
    city: "Vijayawada",
    locality: "Tadepalli",
    avg_price: 8200000,
    verified: true,
    trust_score: 92,
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
    overview: "Gated community with premium amenities",
    rera_id: "P02400006005"
  },
  {
    name: "Abhinandana Heights",
    builder_name: "Abhinandana Housing",
    city: "Vijayawada",
    locality: "Gunadala",
    avg_price: 5500000,
    verified: true,
    trust_score: 91,
    image: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099",
    overview: "Modern high-rise apartments with panoramic views",
    rera_id: "P02400006006"
  },
  {
    name: "Dhatri Emerald",
    builder_name: "Dhatri Housing",
    city: "Vijayawada",
    locality: "Gollapudi",
    avg_price: 6800000,
    verified: true,
    trust_score: 90,
    image: "https://images.unsplash.com/photo-1600585154526-990dced4db0d",
    overview: "Spacious apartments with world-class facilities",
    rera_id: "P02400006007"
  },
  {
    name: "Metro Elite",
    builder_name: "Metro Homes",
    city: "Vijayawada",
    locality: "Satyanarayana Puram",
    avg_price: 4200000,
    verified: true,
    trust_score: 89,
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00",
    overview: "Budget-friendly homes with essential amenities",
    rera_id: "P02400006008"
  }
];

export async function seedProjects() {
  try {
    // First check if projects already exist
    const { count } = await supabase
      .from("projects")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      console.log("Projects already seeded");
      return { success: true, message: "Projects already exist" };
    }

    // Note: builder_id is left as null since we may not have builder user accounts for seed data
    const projectsToInsert = projectsData.map(project => ({
      name: project.name,
      builder_name: project.builder_name,
      city: project.city,
      locality: project.locality,
      avg_price: project.avg_price,
      verified: project.verified,
      trust_score: project.trust_score,
      image: project.image,
      description: project.overview,
      rera_id: project.rera_id,
      builder_id: null,
    }));

    const { data, error } = await supabase
      .from("projects")
      .insert(projectsToInsert)
      .select();

    if (error) {
      console.error("Error seeding projects:", error);
      return { success: false, error };
    }

    console.log("Successfully seeded projects:", data);
    return { success: true, data };
  } catch (err) {
    console.error("Exception seeding projects:", err);
    return { success: false, error: err };
  }
}
