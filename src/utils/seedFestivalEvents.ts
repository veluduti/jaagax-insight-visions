import { supabase } from "@/integrations/supabase/client";

export async function seedFestivalEvents() {
  try {
    console.log('Seeding festival events...');
    
    const festivalEvents = [
      {
        title: "Bonalu Festival 2025 - Secunderabad",
        description: `Join us for the grand Bonalu celebrations at Ujjaini Mahankali Temple, Secunderabad. This annual festival honors Goddess Mahankali with traditional offerings, processions, and cultural performances.

The festival features:
- Traditional Bonalu procession with decorated pots
- Folk dances and music performances
- Local artisan stalls
- Traditional food vendors
- Cultural exhibitions`,
        event_date: "2025-07-20",
        event_time: "06:00:00",
        end_date: "2025-07-20",
        end_time: "22:00:00",
        venue: "Ujjaini Mahankali Temple",
        venue_address: "Secunderabad, Hyderabad, Telangana",
        city: "Hyderabad",
        locality: "Secunderabad",
        latitude: 17.4399,
        longitude: 78.5003,
        category: "festival",
        organizer: "Ujjaini Mahankali Temple Trust",
        organizer_email: "ujjainimahankali@example.com",
        organizer_contact: "+91 40 2784 5678",
        ticket_price: 0,
        max_attendees: 50000,
        verified: true,
        featured: true,
        published_at: new Date().toISOString(),
        tags: ["festival", "cultural", "religious", "traditional", "telangana"],
        image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
        accessibility_features: ["wheelchair_accessible", "sign_language"],
        status: "upcoming"
      },
      {
        title: "Bathukamma Festival Celebrations - Gachibowli",
        description: `Experience the vibrant Bathukamma festival, a beautiful floral festival celebrated by the women of Telangana. This nine-day festival is a tribute to Goddess Gauri, symbolizing the cultural identity of Telangana.

Highlights:
- Traditional Bathukamma flower arrangements
- Folk songs and dances
- Cultural competitions
- Traditional Telangana cuisine
- Women's empowerment workshops`,
        event_date: "2025-10-05",
        event_time: "17:00:00",
        end_date: "2025-10-13",
        end_time: "21:00:00",
        venue: "Gachibowli Stadium",
        venue_address: "Gachibowli, Hyderabad, Telangana",
        city: "Hyderabad",
        locality: "Gachibowli",
        latitude: 17.4400,
        longitude: 78.3487,
        category: "festival",
        organizer: "Telangana Cultural Department",
        organizer_email: "bathukamma@telangana.gov.in",
        organizer_contact: "+91 40 2345 6789",
        ticket_price: 0,
        max_attendees: 100000,
        verified: true,
        featured: true,
        published_at: new Date().toISOString(),
        tags: ["bathukamma", "festival", "cultural", "women", "telangana", "flowers"],
        image_url: "https://images.unsplash.com/photo-1609619385002-f40bc4ab7370?w=800",
        accessibility_features: ["wheelchair_accessible", "family_friendly"],
        status: "upcoming"
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
- Live music concerts`,
        event_date: "2025-10-02",
        event_time: "10:00:00",
        end_date: "2025-10-12",
        end_time: "23:00:00",
        venue: "Indira Gandhi Municipal Stadium",
        venue_address: "MG Road, Vijayawada, Andhra Pradesh",
        city: "Vijayawada",
        locality: "MG Road",
        latitude: 16.5062,
        longitude: 80.6480,
        category: "festival",
        organizer: "Vijayawada Municipal Corporation",
        organizer_email: "dasara@vijayawada.gov.in",
        organizer_contact: "+91 866 257 1234",
        ticket_price: 100,
        max_attendees: 75000,
        verified: true,
        featured: true,
        published_at: new Date().toISOString(),
        tags: ["dasara", "festival", "carnival", "cultural", "entertainment", "family"],
        image_url: "https://images.unsplash.com/photo-1604608672516-f1b9b1767ec4?w=800",
        accessibility_features: ["wheelchair_accessible", "parking", "family_friendly"],
        status: "upcoming"
      },
      {
        title: "Community Health & Wellness Fair - Madhapur",
        description: `A comprehensive health and wellness fair bringing together healthcare providers, fitness experts, and wellness practitioners. Free health screenings, consultations, and educational workshops for the community.

Services include:
- Free health check-ups (BP, Sugar, BMI)
- Dental screenings
- Eye examinations
- Fitness demonstrations
- Yoga and meditation sessions`,
        event_date: "2025-05-15",
        event_time: "08:00:00",
        end_date: "2025-05-15",
        end_time: "18:00:00",
        venue: "Madhapur Community Center",
        venue_address: "Madhapur, Hyderabad, Telangana",
        city: "Hyderabad",
        locality: "Madhapur",
        latitude: 17.4485,
        longitude: 78.3908,
        category: "community",
        organizer: "Hyderabad Healthcare Initiative",
        organizer_email: "health@hhifoundation.org",
        organizer_contact: "+91 40 4567 8901",
        ticket_price: 0,
        max_attendees: 5000,
        verified: true,
        featured: false,
        published_at: new Date().toISOString(),
        tags: ["health", "wellness", "community", "free", "healthcare"],
        image_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
        accessibility_features: ["wheelchair_accessible", "parking", "family_friendly"],
        status: "upcoming"
      },
      {
        title: "Real Estate Investment Summit - Banjara Hills",
        description: `Premier real estate investment summit bringing together investors, developers, and industry experts. Learn about market trends, investment opportunities, and network with key stakeholders in the real estate sector.

Agenda:
- Market outlook and trends 2025
- Investment strategies panel
- Emerging localities spotlight
- REITs and fractional ownership
- Legal and regulatory updates`,
        event_date: "2025-06-20",
        event_time: "09:00:00",
        end_date: "2025-06-20",
        end_time: "18:00:00",
        venue: "Taj Krishna",
        venue_address: "Road No 1, Banjara Hills, Hyderabad",
        city: "Hyderabad",
        locality: "Banjara Hills",
        latitude: 17.4239,
        longitude: 78.4738,
        category: "cultural",
        organizer: "JaagaX Events",
        organizer_email: "events@jaagax.com",
        organizer_contact: "+91 40 6789 0123",
        ticket_price: 2500,
        max_attendees: 500,
        verified: true,
        featured: true,
        published_at: new Date().toISOString(),
        tags: ["real-estate", "investment", "networking", "professional", "summit"],
        image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
        accessibility_features: ["wheelchair_accessible", "parking", "wifi"],
        status: "upcoming"
      }
    ];
    
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
