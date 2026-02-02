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
