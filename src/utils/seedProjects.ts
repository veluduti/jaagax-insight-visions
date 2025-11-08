import { supabase } from "@/integrations/supabase/client";

export const projectsData = [
  {
    name: "MyHome Avatar",
    builder_name: "MyHome Group",
    city: "Hyderabad",
    locality: "Kokapet",
    avg_price: 9500000,
    verified: true,
    trust_score: 95,
    image: "https://images.unsplash.com/photo-1596484553601-01d6c1b6e8e3",
    overview: "Premium residential project by MyHome Group in the heart of Kokapet",
    rera_id: "P02400001234"
  },
  {
    name: "Ramky One Astra",
    builder_name: "Ramky Estates",
    city: "Hyderabad",
    locality: "Narsingi",
    avg_price: 8700000,
    verified: true,
    trust_score: 93,
    image: "https://images.unsplash.com/photo-1600585154356-596af9009b7d",
    overview: "Modern living spaces by Ramky Estates in Narsingi with world-class amenities",
    rera_id: "P02400001235"
  },
  {
    name: "Sree City Homes",
    builder_name: "Sree Infra",
    city: "Vijayawada",
    locality: "Benz Circle",
    avg_price: 6800000,
    verified: true,
    trust_score: 89,
    image: "https://images.unsplash.com/photo-1600585154223-9019e5ff3c7d",
    overview: "Affordable luxury homes in prime Benz Circle location by Sree Infra",
    rera_id: "P02400001236"
  },
  {
    name: "Pacific Towers",
    builder_name: "UrbanKey Developers",
    city: "Hyderabad",
    locality: "Gachibowli",
    avg_price: 11200000,
    verified: true,
    trust_score: 91,
    image: "https://images.unsplash.com/photo-1600585154240-10b76b12c7e2",
    overview: "Premium office and residential spaces in Gachibowli IT corridor",
    rera_id: "P02400001237"
  },
  {
    name: "Green Valley Villas",
    builder_name: "GreenLine Infra",
    city: "Vijayawada",
    locality: "Poranki",
    avg_price: 12500000,
    verified: true,
    trust_score: 96,
    image: "https://images.unsplash.com/photo-1600585154141-10b76b12c7e2",
    overview: "Luxurious villa community with green spaces and modern amenities in Poranki",
    rera_id: "P02400001238"
  }
];

export async function seedProjects() {
  try {
    // Note: builder_id is left as null since we don't have builder user accounts
    // In a real scenario, you'd need to create builder accounts first
    const projectsToInsert = projectsData.map(project => ({
      name: project.name,
      city: project.city,
      locality: project.locality,
      avg_price: project.avg_price,
      verified: project.verified,
      trust_score: project.trust_score,
      image: project.image,
      overview: project.overview,
      rera_id: project.rera_id,
      builder_id: null, // Will need to be updated with actual builder user IDs
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
