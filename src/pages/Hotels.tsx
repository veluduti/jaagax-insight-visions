import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Hotel, MapPin, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import HotelCard from "@/components/hotels/HotelCard";
import HotelFilters from "@/components/hotels/HotelFilters";
import HotelDetailModal from "@/components/hotels/HotelDetailModal";
import HotelTrustBanner from "@/components/hotels/HotelTrustBanner";
import PackageShowcase from "@/components/hotels/PackageShowcase";
import { VisitStayPlanner } from "@/components/booking/VisitStayPlanner";
import { HotelOnlyBooking } from "@/components/hotels/HotelOnlyBooking";
interface PartnerHotel {
  id: string;
  name: string;
  city: string;
  locality: string;
  address: string | null;
  star_rating: number | null;
  price_per_night: number;
  discount_percentage: number | null;
  amenities: string[] | null;
  images: string[] | null;
  contact_phone: string | null;
  contact_email: string | null;
  partner_since: string | null;
  is_active: boolean | null;
}

interface VisitPackage {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  includes_airport_pickup: boolean | null;
  includes_meals: boolean | null;
  includes_local_transport: boolean | null;
  base_discount_percentage: number | null;
  is_active: boolean | null;
}

const Hotels = () => {
  const [hotels, setHotels] = useState<PartnerHotel[]>([]);
  const [packages, setPackages] = useState<VisitPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [selectedCity, setSelectedCity] = useState("all");
  const [starRating, setStarRating] = useState(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);

  // Modal state
  const [selectedHotel, setSelectedHotel] = useState<PartnerHotel | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVisitStayModal, setShowVisitStayModal] = useState(false);
  const [showHotelOnlyModal, setShowHotelOnlyModal] = useState(false);
  const [preSelectedPackage, setPreSelectedPackage] = useState<VisitPackage | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [hotelsRes, packagesRes] = await Promise.all([
        supabase
          .from('partner_hotels')
          .select('*')
          .eq('is_active', true)
          .order('star_rating', { ascending: false }),
        supabase
          .from('visit_packages')
          .select('*')
          .eq('is_active', true)
          .order('duration_days', { ascending: true })
      ]);

      if (hotelsRes.error) throw hotelsRes.error;
      if (packagesRes.error) throw packagesRes.error;

      setHotels(hotelsRes.data || []);
      setPackages(packagesRes.data || []);

      // Set max price based on data
      if (hotelsRes.data && hotelsRes.data.length > 0) {
        const maxHotelPrice = Math.max(...hotelsRes.data.map(h => h.price_per_night));
        setPriceRange([0, maxHotelPrice]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load hotels');
    } finally {
      setLoading(false);
    }
  };

  // Get unique cities for filter
  const cities = useMemo(() => {
    return [...new Set(hotels.map(h => h.city))].sort();
  }, [hotels]);

  // Calculate max price for slider
  const maxPrice = useMemo(() => {
    return hotels.length > 0 ? Math.max(...hotels.map(h => h.price_per_night)) : 20000;
  }, [hotels]);

  // Filter hotels
  const filteredHotels = useMemo(() => {
    return hotels.filter(hotel => {
      const matchesCity = selectedCity === "all" || hotel.city === selectedCity;
      const matchesRating = starRating === 0 || (hotel.star_rating && hotel.star_rating >= starRating);
      const matchesPrice = hotel.price_per_night >= priceRange[0] && hotel.price_per_night <= priceRange[1];
      return matchesCity && matchesRating && matchesPrice;
    });
  }, [hotels, selectedCity, starRating, priceRange]);

  const handleViewDetails = (hotel: PartnerHotel) => {
    setSelectedHotel(hotel);
    setShowDetailModal(true);
  };

  const handleBookNow = (hotel: PartnerHotel) => {
    // Default to Visit+Stay for better value
    setSelectedHotel(hotel);
    setShowDetailModal(false);
    setShowVisitStayModal(true);
  };

  const handleBookWithVisit = (hotel: PartnerHotel) => {
    // Opens full VisitStayPlanner with package selection and site visit scheduling
    setSelectedHotel(hotel);
    setShowDetailModal(false);
    setShowVisitStayModal(true);
  };

  const handleBookHotelOnly = (hotel: PartnerHotel) => {
    // Opens simplified HotelOnlyBooking - just dates, guests, rooms
    setSelectedHotel(hotel);
    setShowDetailModal(false);
    setShowHotelOnlyModal(true);
  };

  const handleSelectPackage = (pkg: VisitPackage) => {
    setPreSelectedPackage(pkg);
    // Open Visit+Stay modal with package pre-selected
    if (filteredHotels.length > 0) {
      setSelectedHotel(filteredHotels[0]);
      setShowVisitStayModal(true);
    } else {
      toast.info('Please select a hotel first');
    }
  };

  const resetFilters = () => {
    setSelectedCity("all");
    setStarRating(0);
    setPriceRange([0, maxPrice]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-24 pb-16">
        <div className="container-padding">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 px-4 py-1.5 mb-4">
              <Hotel className="h-4 w-4 mr-2" />
              Partner Hotels
            </Badge>
            
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Stay Near Your <span className="text-gradient">Dream Properties</span>
            </h1>
            
            <p className="text-lg text-muted-foreground">
              Book curated stays near your shortlisted properties. Experience the neighborhood 
              before making your decision, with exclusive discounts for JaagaX users.
            </p>
          </motion.div>

          {/* Trust Banner */}
          <HotelTrustBanner />

          {/* Filters */}
          <div className="mt-8 mb-6">
            <HotelFilters
              cities={cities}
              selectedCity={selectedCity}
              onCityChange={setSelectedCity}
              starRating={starRating}
              onStarRatingChange={setStarRating}
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              maxPrice={maxPrice}
              onReset={resetFilters}
              totalResults={filteredHotels.length}
            />
          </div>

          {/* Hotels Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredHotels.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Hotels Found</h3>
              <p className="text-muted-foreground">
                {hotels.length === 0 
                  ? "We're onboarding partner hotels. Check back soon!"
                  : "Try adjusting your filters to see more options"}
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredHotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  onViewDetails={handleViewDetails}
                  onBookNow={handleBookNow}
                />
              ))}
            </motion.div>
          )}

          {/* Package Showcase */}
          <PackageShowcase 
            packages={packages} 
            onSelectPackage={handleSelectPackage} 
          />
        </div>
      </main>

      <Footer />

      {/* Hotel Detail Modal */}
      <HotelDetailModal
        hotel={selectedHotel}
        open={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onBookWithVisit={handleBookWithVisit}
        onBookHotelOnly={handleBookHotelOnly}
      />

      {/* Visit + Stay Booking Modal (with package & site visit) */}
      {selectedHotel && (
        <VisitStayPlanner
          open={showVisitStayModal}
          onClose={() => {
            setShowVisitStayModal(false);
            setPreSelectedPackage(null);
          }}
          propertyId={0}
          propertyTitle="Hotel Booking"
          propertyCity={selectedHotel.city}
          propertyLocality={selectedHotel.locality}
          mode="visit_stay"
          preSelectedHotel={selectedHotel}
          preSelectedPackage={preSelectedPackage}
        />
      )}

      {/* Hotel Only Booking Modal (simple booking) */}
      {selectedHotel && (
        <HotelOnlyBooking
          open={showHotelOnlyModal}
          onClose={() => setShowHotelOnlyModal(false)}
          hotel={selectedHotel}
        />
      )}
    </div>
  );
};

export default Hotels;
