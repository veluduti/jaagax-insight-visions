import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AdCard from "@/components/advertisements/AdCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Filter, Sparkles, Building2, Home, 
  Briefcase, SlidersHorizontal, TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

interface Advertisement {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  images: string[];
  offer_text: string | null;
  cta_text: string | null;
  ad_type: string;
  featured: boolean;
  impressions: number;
  saves: number;
  start_date: string | null;
  end_date: string | null;
  property_id: number | null;
  project_id: number | null;
  highlights: any;
  properties?: { title: string; locality: string; city: string; price: number; bhk: number } | null;
  projects?: { name: string; locality: string; city: string; avg_price: number } | null;
}

const Promotions = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [savedAds, setSavedAds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  useEffect(() => {
    fetchAds();
    fetchSavedAds();
  }, []);

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select(`
          *,
          properties(title, locality, city, price, bhk),
          projects(name, locality, city, avg_price)
        `)
        .eq('status', 'active')
        .order('featured', { ascending: false })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedAds = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('saved_advertisements')
      .select('advertisement_id')
      .eq('user_id', user.id);

    if (data) {
      setSavedAds(data.map(s => s.advertisement_id));
    }
  };

  const filteredAds = ads.filter(ad => {
    const matchesSearch = ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ad.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ad.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || ad.ad_type === filterType;
    const matchesFeatured = !showFeaturedOnly || ad.featured;
    return matchesSearch && matchesType && matchesFeatured;
  });

  const featuredAds = filteredAds.filter(ad => ad.featured);
  const regularAds = filteredAds.filter(ad => !ad.featured);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Special Offers & Promotions</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
              Exclusive Property Deals
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Discover special offers, new launches, and exclusive deals from verified builders and developers.
            </p>
          </motion.div>

          {/* Search & Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-4xl mx-auto"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search promotions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 text-lg"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={!filterType ? "default" : "outline"}
                  onClick={() => setFilterType(null)}
                >
                  All
                </Button>
                <Button
                  variant={filterType === 'property' ? "default" : "outline"}
                  onClick={() => setFilterType(filterType === 'property' ? null : 'property')}
                >
                  <Home className="h-4 w-4 mr-2" />
                  Properties
                </Button>
                <Button
                  variant={filterType === 'project' ? "default" : "outline"}
                  onClick={() => setFilterType(filterType === 'project' ? null : 'project')}
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Projects
                </Button>
                <Button
                  variant={showFeaturedOnly ? "default" : "outline"}
                  onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Featured
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Ads Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredAds.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No promotions found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search or filters" : "Check back later for new offers!"}
              </p>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Featured Section */}
              {featuredAds.length > 0 && !showFeaturedOnly && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                      Featured
                    </Badge>
                    <h2 className="text-xl font-semibold">Top Promotions</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featuredAds.map((ad, index) => (
                      <motion.div
                        key={ad.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <AdCard
                          ad={ad}
                          isSaved={savedAds.includes(ad.id)}
                          onSave={fetchSavedAds}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Promotions */}
              <div>
                {featuredAds.length > 0 && !showFeaturedOnly && (
                  <h2 className="text-xl font-semibold mb-6">All Promotions</h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(showFeaturedOnly ? featuredAds : regularAds).map((ad, index) => (
                    <motion.div
                      key={ad.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <AdCard
                        ad={ad}
                        isSaved={savedAds.includes(ad.id)}
                        onSave={fetchSavedAds}
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Promotions;