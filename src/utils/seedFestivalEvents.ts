import { supabase } from "@/integrations/supabase/client";

export const festivalEvents = [
  {
    title: "Bonalu Festival 2025 - Secunderabad",
    description: `Join us for the grand Bonalu celebrations at Ujjaini Mahankali Temple, Secunderabad. This annual festival honors Goddess Mahankali with traditional offerings, processions, and cultural performances.

The festival features:
- Traditional Bonalu procession with decorated pots
- Folk dances and music performances
- Local artisan stalls
- Traditional food vendors
- Cultural exhibitions

Bonalu is a folk festival celebrated in the twin cities of Hyderabad and Secunderabad, dedicated to Goddess Mahakali. The word "Bonam" means a meal or feast in Telugu, and during this festival, women carry pots decorated with neem leaves, turmeric, and vermillion as offerings.`,
    event_date: "2025-07-20",
    event_time: "06:00:00",
    end_date: "2025-07-20",
    end_time: "22:00:00",
    venue: "Ujjaini Mahankali Temple",
    venue_address: "Secunderabad, Hyderabad, Telangana",
    city: "Hyderabad",
    locality: "Secunderabad",
    lat: 17.4399,
    lng: 78.5003,
    category: "festival" as const,
    organizer: "Ujjaini Mahankali Temple Trust",
    organizer_email: "ujjainimahankali@example.com",
    organizer_contact: "+91 40 2784 5678",
    ticket_price: 0,
    max_attendees: 50000,
    verified: true,
    featured: true,
    published_at: new Date().toISOString(),
    tags: ["festival", "cultural", "religious", "traditional", "telangana"],
    language: "Telugu",
    image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    accessibility_features: ["wheelchair_accessible", "sign_language"]
  },
  {
    title: "Bathukamma Festival Celebrations - Gachibowli",
    description: `Experience the vibrant Bathukamma festival, a beautiful floral festival celebrated by the women of Telangana. This nine-day festival is a tribute to Goddess Gauri, symbolizing the cultural identity of Telangana.

Highlights:
- Traditional Bathukamma flower arrangements
- Folk songs and dances
- Cultural competitions
- Traditional Telangana cuisine
- Women's empowerment workshops
- Photography exhibitions

Bathukamma is celebrated for nine days during Dussehra, beginning on the day of Mahalaya Amavasya and ending on Durgashtami. The festival is a symbol of Telangana's culture and identity.`,
    event_date: "2025-10-05",
    event_time: "17:00:00",
    end_date: "2025-10-13",
    end_time: "21:00:00",
    venue: "Gachibowli Stadium",
    venue_address: "Gachibowli, Hyderabad, Telangana",
    city: "Hyderabad",
    locality: "Gachibowli",
    lat: 17.4400,
    lng: 78.3487,
    category: "festival" as const,
    organizer: "Telangana Cultural Department",
    organizer_email: "bathukamma@telangana.gov.in",
    organizer_contact: "+91 40 2345 6789",
    ticket_price: 0,
    max_attendees: 100000,
    verified: true,
    featured: true,
    published_at: new Date().toISOString(),
    tags: ["bathukamma", "festival", "cultural", "women", "telangana", "flowers"],
    language: "Telugu",
    image_url: "https://images.unsplash.com/photo-1609619385002-f40bc4ab7370?w=800",
    accessibility_features: ["wheelchair_accessible", "family_friendly"]
  },
  {
    title: "Vijayawada Dasara Carnival 2025",
    description: `Celebrate the grandeur of Dasara with Vijayawada's biggest cultural carnival! A 10-day extravaganza featuring cultural performances, traditional crafts, food festivals, and entertainment for the entire family.

Event Features:
- Traditional Dandiya & Garba nights
- Cultural performances from across India
- Handicraft & artisan bazaar
- Food festival with regional cuisines
- Kids' zone with activities
- Live music concerts
- Fireworks display on Vijayadashami

The Dasara festival in Vijayawada is celebrated with great pomp at the famous Kanaka Durga Temple situated on the Indrakeeladri hill. Join us for this magnificent celebration of culture and tradition!`,
    event_date: "2025-10-02",
    event_time: "10:00:00",
    end_date: "2025-10-12",
    end_time: "23:00:00",
    venue: "Indira Gandhi Municipal Stadium",
    venue_address: "MG Road, Vijayawada, Andhra Pradesh",
    city: "Vijayawada",
    locality: "MG Road",
    lat: 16.5062,
    lng: 80.6480,
    category: "festival" as const,
    organizer: "Vijayawada Municipal Corporation",
    organizer_email: "dasara@vijayawada.gov.in",
    organizer_contact: "+91 866 257 1234",
    ticket_price: 100,
    max_attendees: 75000,
    verified: true,
    featured: true,
    published_at: new Date().toISOString(),
    tags: ["dasara", "festival", "carnival", "cultural", "entertainment", "family"],
    language: "Telugu",
    image_url: "https://images.unsplash.com/photo-1604608672516-f1b9b1767ec4?w=800",
    accessibility_features: ["wheelchair_accessible", "parking", "family_friendly"]
  },
  {
    title: "Community Health & Wellness Fair - Madhapur",
    description: `A comprehensive health and wellness fair bringing together healthcare providers, fitness experts, and wellness practitioners. Free health screenings, consultations, and educational workshops for the community.

Services include:
- Free health check-ups (BP, Sugar, BMI)
- Dental screenings
- Eye examinations
- Fitness demonstrations
- Yoga and meditation sessions
- Nutrition counseling
- Mental health awareness

Join us for a day dedicated to your well-being!`,
    event_date: "2025-05-15",
    event_time: "08:00:00",
    end_date: "2025-05-15",
    end_time: "18:00:00",
    venue: "Madhapur Community Center",
    venue_address: "Madhapur, Hyderabad, Telangana",
    city: "Hyderabad",
    locality: "Madhapur",
    lat: 17.4485,
    lng: 78.3908,
    category: "community" as const,
    organizer: "Hyderabad Healthcare Initiative",
    organizer_email: "health@hhifoundation.org",
    organizer_contact: "+91 40 4567 8901",
    ticket_price: 0,
    max_attendees: 5000,
    verified: true,
    featured: false,
    published_at: new Date().toISOString(),
    tags: ["health", "wellness", "community", "free", "healthcare"],
    language: "English",
    image_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
    accessibility_features: ["wheelchair_accessible", "parking", "family_friendly"]
  },
  {
    title: "Real Estate Investment Summit - Banjara Hills",
    description: `Premier real estate investment summit bringing together investors, developers, and industry experts. Learn about market trends, investment opportunities, and network with key stakeholders in the real estate sector.

Agenda:
- Market outlook and trends 2025
- Investment strategies panel
- Emerging localities spotlight
- REITs and fractional ownership
- Legal and regulatory updates
- Networking sessions
- Property showcase

Register now to secure your spot!`,
    event_date: "2025-06-20",
    event_time: "09:00:00",
    end_date: "2025-06-20",
    end_time: "18:00:00",
    venue: "Taj Krishna",
    venue_address: "Road No 1, Banjara Hills, Hyderabad",
    city: "Hyderabad",
    locality: "Banjara Hills",
    lat: 17.4239,
    lng: 78.4738,
    category: "cultural" as const,
    organizer: "JaagaX Events",
    organizer_email: "events@jaagax.com",
    organizer_contact: "+91 40 6789 0123",
    ticket_price: 2500,
    max_attendees: 500,
    verified: true,
    featured: true,
    published_at: new Date().toISOString(),
    tags: ["real-estate", "investment", "networking", "professional", "summit"],
    language: "English",
    image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
    accessibility_features: ["wheelchair_accessible", "parking", "wifi"]
  }
];

export async function seedFestivalEvents() {
  try {
    console.log('Seeding festival events...');
    
    const { data, error } = await supabase
      .from('community_events')
      .insert(festivalEvents)
      .select();

    if (error) {
      console.error('Error seeding events:', error);
      return { success: false, error };
    }

    console.log(`✓ Created ${data.length} events`);
    console.log('Festival events seeded successfully!');
    return { success: true, data };
  } catch (error) {
    console.error('Error seeding festival events:', error);
    return { success: false, error };
  }
}
