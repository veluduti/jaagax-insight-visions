import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocation } from "@/contexts/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Hotel, MapPin, Star, Construction, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { VisitStayPlanner } from "@/components/booking/VisitStayPlanner";
import { HotelOnlyBooking } from "@/components/hotels/HotelOnlyBooking";
import { WeekendExplorerWizard } from "@/components/booking/WeekendExplorerWizard";
import MyHotelApplicationsBanner from "@/components/hotels/MyHotelApplicationsBanner";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { detectedLocation } = useLocation();
  
  const [hotels, setHotels] = useState<PartnerHotel[]>([]);
  const [packages, setPackages] = useState<VisitPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from database
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [hotelsRes, packagesRes] = await Promise.all([
          supabase.from("partner_hotels").select("*").eq("is_active", true).order("star_rating", { ascending: false }),
          supabase.from("visit_packages").select("*").eq("is_active", true),
        ]);
        setHotels(hotelsRes.data || []);
        setPackages(packagesRes.data || []);
      } catch (err) {
        console.error("Error fetching hotels:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Search state
  const [location, setLocation] = useState(searchParams.get('city') || "");
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Filter state - default to detected city
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || "all");
  const [starRating, setStarRating] = useState(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000]);
  const [showFilters, setShowFilters] = useState(false);

  // Auto-set city from detected location
  useEffect(() => {
    if (detectedLocation?.city && !searchParams.get('city')) {
      const matchedCity = popularLocations.find(
        c => c.toLowerCase() === detectedLocation.city.toLowerCase()
      );
      if (matchedCity) {
        setSelectedCity(matchedCity);
        setLocation(matchedCity);
      }
    }
  }, [detectedLocation]);

  // Modal state
  const [selectedHotel, setSelectedHotel] = useState<PartnerHotel | null>(null);
  const [showVisitStayModal, setShowVisitStayModal] = useState(false);
  const [showHotelOnlyModal, setShowHotelOnlyModal] = useState(false);
  const [preSelectedPackage, setPreSelectedPackage] = useState<VisitPackage | null>(null);
  const [weekendPackage, setWeekendPackage] = useState<VisitPackage | null>(null);

  const popularLocations = ["Hyderabad", "Vijayawada", "Bangalore", "Mumbai", "Chennai"];

  // Filter hotels
  const filteredHotels = useMemo(() => {
    return hotels.filter(hotel => {
      const matchesCity = selectedCity === "all" || hotel.city.toLowerCase() === selectedCity.toLowerCase();
      const matchesRating = starRating === 0 || (hotel.star_rating && hotel.star_rating >= starRating);
      const matchesPrice = hotel.price_per_night >= priceRange[0] && hotel.price_per_night <= priceRange[1];
      return matchesCity && matchesRating && matchesPrice;
    });
  }, [hotels, selectedCity, starRating, priceRange]);

  const handleSearch = () => {
    if (location) {
      setSelectedCity(location);
      navigate(`/hotels?city=${encodeURIComponent(location)}`);
    }
    setShowSuggestions(false);
  };

  const handleHotelClick = (hotel: PartnerHotel) => {
    navigate(`/hotels/${hotel.id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative py-16 px-4 overflow-hidden bg-gradient-to-br from-background via-primary/5 to-background">
          <div className="container mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <Hotel className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Partner Hotels & Stay Packages</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold">
                Stay Near Your Dream Property
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Book comfortable accommodations near properties you want to visit. 
                Exclusive discounts for JaagaX buyers.
              </p>

              {/* Partner with Us CTA */}
              <Button
                variant="premium"
                size="lg"
                onClick={() => navigate("/hotels/partner")}
                className="gap-2"
              >
                <Hotel className="h-5 w-5" />
                Partner with Us
              </Button>

              {/* Search Bar */}
              <div className="max-w-xl mx-auto relative">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by city..."
                      value={location}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="pl-10"
                    />
                    {showSuggestions && location && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50">
                        {popularLocations
                          .filter(l => l.toLowerCase().includes(location.toLowerCase()))
                          .map((loc) => (
                            <button
                              key={loc}
                              onClick={() => {
                                setLocation(loc);
                                setSelectedCity(loc);
                                setShowSuggestions(false);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-muted transition-colors"
                            >
                              {loc}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                  <Button onClick={handleSearch}>Search</Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* My Hotel Partner Application status (anonymous tracking via localStorage) */}
        <MyHotelApplicationsBanner />

        <section className="py-8 px-4">
          <div className="container mx-auto max-w-7xl">
            <Card className="bg-amber-500/10 border-amber-500/20">
              <CardContent className="py-6">
                <div className="flex items-center gap-4">
                  <Construction className="h-8 w-8 text-amber-500 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-700 dark:text-amber-400">Feature Under Development</h3>
                    <p className="text-sm text-muted-foreground">
                      The partner hotels system is being set up. The hotels shown below are preview data.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Packages Section */}
        <section className="py-8 px-4">
          <div className="container mx-auto max-w-7xl">
            <h2 className="text-2xl font-bold mb-6">Visit + Stay Packages</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{pkg.name}</h3>
                        <p className="text-sm text-muted-foreground">{pkg.description}</p>
                      </div>
                      <Badge variant="secondary">{pkg.duration_days} Days</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {pkg.includes_airport_pickup && (
                        <Badge variant="outline" className="text-xs">Airport Pickup</Badge>
                      )}
                      {pkg.includes_meals && (
                        <Badge variant="outline" className="text-xs">Meals Included</Badge>
                      )}
                      {pkg.includes_local_transport && (
                        <Badge variant="outline" className="text-xs">Local Transport</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-semibold">
                        Save up to {pkg.base_discount_percentage}%
                      </span>
                      <Button 
                        size="sm"
                        onClick={() => {
                          // Weekend Property Explorer (2-day) → premium guided wizard
                          if (pkg.duration_days >= 2 || /weekend/i.test(pkg.name)) {
                            setWeekendPackage(pkg);
                          } else {
                            setPreSelectedPackage(pkg);
                            setShowVisitStayModal(true);
                          }
                        }}
                      >
                        Book Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Hotels Grid */}
        <section className="py-8 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Partner Hotels</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            {/* Filters */}
            {showFilters && (
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">City:</span>
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="all">All Cities</option>
                        <option value="Hyderabad">Hyderabad</option>
                        <option value="Vijayawada">Vijayawada</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Min Rating:</span>
                      <select
                        value={starRating}
                        onChange={(e) => setStarRating(parseInt(e.target.value))}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="0">Any</option>
                        <option value="3">3+ Stars</option>
                        <option value="4">4+ Stars</option>
                        <option value="5">5 Stars</option>
                      </select>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedCity("all");
                        setStarRating(0);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredHotels.map((hotel) => (
                <Card 
                  key={hotel.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleHotelClick(hotel)}
                >
                  <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 relative">
                    {hotel.images && hotel.images[0] ? (
                      <img 
                        src={hotel.images[0]} 
                        alt={hotel.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Hotel className="h-12 w-12 text-primary/50" />
                      </div>
                    )}
                    {hotel.discount_percentage && (
                      <Badge className="absolute top-2 right-2 bg-green-600">
                        {hotel.discount_percentage}% OFF
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{hotel.name}</h3>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm">{hotel.star_rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {hotel.locality}, {hotel.city}
                    </p>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-lg font-bold text-primary">
                          ₹{hotel.price_per_night.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">/night</span>
                      </div>
                      <Button size="sm">Book</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Visit + Stay Booking Modal */}
      <VisitStayPlanner
        open={showVisitStayModal}
        onClose={() => {
          setShowVisitStayModal(false);
          setPreSelectedPackage(null);
        }}
        propertyId="preview"
        propertyTitle="Hotel Booking"
        propertyCity={selectedHotel?.city || "Hyderabad"}
        propertyLocality={selectedHotel?.locality || ""}
        mode="visit_stay"
        preSelectedHotel={selectedHotel}
        preSelectedPackage={preSelectedPackage}
      />

      {/* Hotel Only Booking Modal */}
      {selectedHotel && (
        <HotelOnlyBooking
          open={showHotelOnlyModal}
          onClose={() => {
            setShowHotelOnlyModal(false);
            setSelectedHotel(null);
          }}
          hotel={selectedHotel}
        />
      )}

      {/* Weekend Property Explorer Wizard */}
      <WeekendExplorerWizard
        open={!!weekendPackage}
        onClose={() => setWeekendPackage(null)}
        packageId={weekendPackage?.id}
        packageName={weekendPackage?.name}
        packageDuration={weekendPackage?.duration_days || 2}
        packageDiscount={weekendPackage?.base_discount_percentage || 15}
        defaultCity={selectedCity !== "all" ? selectedCity : "Hyderabad"}
      />
    </div>
  );
};

export default Hotels;
