import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const seedAdvertisements = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please login to seed advertisements");
      return;
    }

    // Get some properties and projects to link
    const { data: properties } = await supabase
      .from('properties')
      .select('id, title, locality, city')
      .limit(5);

    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, locality, city')
      .limit(5);

    const sampleAds = [
      {
        builder_id: user.id,
        property_id: properties?.[0]?.id || null,
        ad_type: 'property' as const,
        title: 'Premium 3BHK in Gachibowli - Limited Offer!',
        tagline: 'Your Dream Home Awaits',
        description: 'Spacious 3BHK apartment with world-class amenities. Book now and get exclusive festive discounts!',
        images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
        highlights: ['Swimming Pool', 'Gym', 'Clubhouse', '24/7 Security'],
        offer_text: '20% Off!',
        cta_text: 'Book Now',
        status: 'active' as const,
        featured: true,
        priority: 10,
        impressions: 1250,
        clicks: 89,
        saves: 45,
        contacts: 12,
      },
      {
        builder_id: user.id,
        project_id: projects?.[0]?.id || null,
        ad_type: 'project' as const,
        title: 'New Launch: Skyline Residences',
        tagline: 'Redefining Luxury Living',
        description: 'Pre-launch prices available! 2, 3, 4 BHK apartments starting from ₹85 Lac. RERA approved project.',
        images: ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'],
        highlights: ['RERA Approved', 'Smart Homes', 'Green Building', 'Metro Connectivity'],
        offer_text: 'Pre-Launch Prices',
        cta_text: 'Register Interest',
        status: 'active' as const,
        featured: true,
        priority: 9,
        impressions: 2100,
        clicks: 156,
        saves: 78,
        contacts: 23,
      },
      {
        builder_id: user.id,
        property_id: properties?.[1]?.id || null,
        ad_type: 'property' as const,
        title: 'Luxurious Villa in Jubilee Hills',
        tagline: 'Live Like Royalty',
        description: 'Independent 4BHK villa with private garden. Premium location, premium lifestyle.',
        images: ['https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800'],
        highlights: ['Private Garden', 'Home Theater', 'Smart Home', 'Vastu Compliant'],
        offer_text: 'No Brokerage',
        cta_text: 'Schedule Visit',
        status: 'active' as const,
        featured: false,
        priority: 7,
        impressions: 890,
        clicks: 67,
        saves: 34,
        contacts: 8,
      },
      {
        builder_id: user.id,
        project_id: projects?.[1]?.id || null,
        ad_type: 'project' as const,
        title: 'Green Valley Township - Nature Meets City',
        tagline: 'Breathe Fresh, Live Young',
        description: 'Eco-friendly township with 70% open space. Premium apartments surrounded by greenery.',
        images: ['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800'],
        highlights: ['70% Open Space', 'Solar Powered', 'Rainwater Harvesting', 'Organic Farm'],
        offer_text: '₹5 Lac Off',
        cta_text: 'Explore Now',
        status: 'active' as const,
        featured: true,
        priority: 8,
        impressions: 1650,
        clicks: 112,
        saves: 56,
        contacts: 15,
      },
      {
        builder_id: user.id,
        property_id: properties?.[2]?.id || null,
        ad_type: 'property' as const,
        title: 'Ready to Move 2BHK - HITEC City',
        tagline: 'Walk to Work',
        description: 'Fully furnished 2BHK apartment near IT hub. Ideal for young professionals.',
        images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
        highlights: ['Fully Furnished', 'Near IT Hub', 'Modular Kitchen', 'Covered Parking'],
        offer_text: 'Zero Down Payment',
        cta_text: 'View Details',
        status: 'active' as const,
        featured: false,
        priority: 6,
        impressions: 720,
        clicks: 48,
        saves: 22,
        contacts: 6,
      },
      {
        builder_id: user.id,
        ad_type: 'builder_brand' as const,
        title: 'Premium Developers - 25 Years of Trust',
        tagline: 'Building Dreams Since 1999',
        description: 'Awarded "Best Builder 2024". Over 50 projects delivered. 10,000+ happy families.',
        images: ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800'],
        highlights: ['25+ Years', '50+ Projects', '10K+ Families', 'Award Winning'],
        offer_text: 'Trusted Brand',
        cta_text: 'View Projects',
        status: 'active' as const,
        featured: true,
        priority: 10,
        impressions: 3200,
        clicks: 234,
        saves: 89,
        contacts: 34,
      },
      {
        builder_id: user.id,
        property_id: properties?.[3]?.id || null,
        ad_type: 'property' as const,
        title: 'Penthouse with Terrace - Banjara Hills',
        tagline: 'Sky-High Living',
        description: 'Exclusive penthouse with private terrace and infinity pool access. Limited units available.',
        images: ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800'],
        highlights: ['Private Terrace', 'Infinity Pool', 'City Views', 'Concierge Service'],
        offer_text: 'Last 3 Units',
        cta_text: 'Inquire Now',
        status: 'active' as const,
        featured: false,
        priority: 7,
        impressions: 560,
        clicks: 42,
        saves: 28,
        contacts: 9,
      },
      {
        builder_id: user.id,
        project_id: projects?.[2]?.id || null,
        ad_type: 'project' as const,
        title: 'Metro Edge Apartments - Direct Metro Access',
        tagline: 'Connected Living',
        description: 'Apartments with direct metro connectivity. Say goodbye to traffic!',
        images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'],
        highlights: ['Metro Connected', 'Shopping Mall', 'Sports Complex', 'Premium School'],
        offer_text: 'Early Bird Offer',
        cta_text: 'Book Site Visit',
        status: 'active' as const,
        featured: false,
        priority: 5,
        impressions: 980,
        clicks: 76,
        saves: 38,
        contacts: 11,
      },
      {
        builder_id: user.id,
        property_id: properties?.[4]?.id || null,
        ad_type: 'property' as const,
        title: 'Budget-Friendly 1BHK in Miyapur',
        tagline: 'First Home, Best Home',
        description: 'Perfect starter home for young couples. EMI less than rent! Bank approved.',
        images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
        highlights: ['Bank Approved', 'Low EMI', 'Good Schools', 'Hospital Nearby'],
        offer_text: 'Under ₹35 Lac',
        cta_text: 'Calculate EMI',
        status: 'active' as const,
        featured: false,
        priority: 4,
        impressions: 1100,
        clicks: 92,
        saves: 67,
        contacts: 19,
      },
      {
        builder_id: user.id,
        project_id: projects?.[3]?.id || null,
        ad_type: 'project' as const,
        title: 'Luxury Villas - Shamshabad',
        tagline: 'Airport Vicinity Living',
        description: 'Gated community of luxury villas near the airport. Perfect for frequent flyers.',
        images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'],
        highlights: ['Near Airport', 'Gated Community', 'Private Pool Option', 'Golf Course'],
        offer_text: 'Festive Discount',
        cta_text: 'Download Brochure',
        status: 'active' as const,
        featured: true,
        priority: 8,
        impressions: 1450,
        clicks: 98,
        saves: 52,
        contacts: 14,
      },
    ];

    const { error } = await supabase
      .from('advertisements')
      .insert(sampleAds);

    if (error) throw error;

    toast.success(`Successfully seeded ${sampleAds.length} advertisements!`);
  } catch (error: any) {
    console.error('Seed error:', error);
    toast.error(error.message || "Failed to seed advertisements");
  }
};

export default seedAdvertisements;