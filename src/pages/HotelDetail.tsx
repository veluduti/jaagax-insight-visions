import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Star, MapPin, Phone, Mail, Calendar, Clock, Shield,
  Wifi, Car, Coffee, Dumbbell, Waves, Utensils, Tv, Wind, ShieldCheck,
  BedDouble, Users, Maximize, ChevronLeft, ChevronRight, Check, X,
  Sparkles, Building2, Globe, CreditCard, ParkingCircle, Baby,
  Accessibility, Cigarette, Dog, Heart, Share2, Navigation2,
  Sun, Moon, Info, Banknote, BadgeCheck, Landmark, TreePine
} from "lucide-react";
import { toast } from "sonner";
import HotelSpecsGrid from "@/components/hotels/HotelSpecsGrid";
import HotelRoomTypes from "@/components/hotels/HotelRoomTypes";
import HotelPolicies from "@/components/hotels/HotelPolicies";
import HotelNearbyAttractions from "@/components/hotels/HotelNearbyAttractions";
import HotelBookingModal from "@/components/hotels/HotelBookingModal";

interface HotelData {
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
  description?: string;
  total_rooms?: number;
  check_in_time?: string;
  check_out_time?: string;
  languages_spoken?: string[];
  accepts_cards?: boolean;
  pet_friendly?: boolean;
  wheelchair_accessible?: boolean;
  smoking_allowed?: boolean;
}

const HotelDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingType, setBookingType] = useState<"hotel_only" | "with_visit">("hotel_only");

  useEffect(() => {
    if (!id) return;
    const fetchHotel = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("partner_hotels")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !data) {
        console.error("Error fetching hotel:", error);
        setHotel(null);
      } else {
        setHotel(data as HotelData);
      }
      setLoading(false);
    };
    fetchHotel();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 pt-20 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Hotel Not Found</h1>
            <Button onClick={() => navigate("/hotels")}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Hotels
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const images = hotel.images || [];
  const discountedPrice = hotel.discount_percentage
    ? hotel.price_per_night * (1 - hotel.discount_percentage / 100)
    : hotel.price_per_night;

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
    ));

  const nextImage = () => setCurrentImageIndex((p) => (p + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((p) => (p - 1 + images.length) % images.length);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1 pt-20">
        {/* Breadcrumb */}
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <button onClick={() => navigate("/hotels")} className="hover:text-foreground transition-colors">Hotels</button>
            <span>/</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">{hotel.city}</span>
            <span>/</span>
            <span className="text-foreground font-medium">{hotel.name}</span>
          </div>
        </div>

        {/* Hero Image Gallery */}
        <section className="container mx-auto max-w-7xl px-4">
          <div className="relative rounded-2xl overflow-hidden group">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[300px] md:h-[420px]">
              {/* Main Image */}
              <div className="col-span-1 md:col-span-2 relative overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImageIndex}
                    src={images[currentImageIndex] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200"}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  />
                </AnimatePresence>
                {/* Nav arrows */}
                <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background">
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setCurrentImageIndex(i)} className={`h-2 rounded-full transition-all ${i === currentImageIndex ? "w-6 bg-primary" : "w-2 bg-background/60"}`} />
                  ))}
                </div>
              </div>
              {/* Side images */}
              <div className="hidden md:flex flex-col gap-2 col-span-1">
                {images.slice(1, 3).map((img, i) => (
                  <div key={i} className="flex-1 overflow-hidden cursor-pointer" onClick={() => setCurrentImageIndex(i + 1)}>
                    <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ))}
              </div>
              <div className="hidden md:flex flex-col gap-2 col-span-1">
                {images.slice(3, 5).map((img, i) => (
                  <div key={i} className="flex-1 overflow-hidden cursor-pointer" onClick={() => setCurrentImageIndex(i + 3)}>
                    <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ))}
                {images.length <= 3 && (
                  <div className="flex-1 bg-muted/50 flex items-center justify-center rounded-br-2xl">
                    <Building2 className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            </div>

            {/* Floating badges */}
            {hotel.discount_percentage && hotel.discount_percentage > 0 && (
              <Badge className="absolute top-4 left-4 bg-emerald-500 hover:bg-emerald-600 border-0 text-sm px-3 py-1.5 shadow-lg">
                {hotel.discount_percentage}% JaagaX Exclusive
              </Badge>
            )}
            <Badge variant="secondary" className="absolute top-4 right-4 gap-1.5 bg-background/90 backdrop-blur-sm shadow-lg">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" />
              Verified Partner
            </Badge>
          </div>
        </section>

        {/* Main Content Grid */}
        <section className="container mx-auto max-w-7xl px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">{hotel.name}</h1>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <div className="flex gap-0.5">{renderStars(hotel.star_rating || 3)}</div>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {hotel.locality}, {hotel.city}
                      </span>
                      {hotel.total_rooms && (
                        <>
                          <Separator orientation="vertical" className="h-4" />
                          <span className="text-sm text-muted-foreground">{hotel.total_rooms} Rooms</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => { setLiked(!liked); toast.success(liked ? "Removed from wishlist" : "Added to wishlist"); }}>
                      <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {hotel.description && (
                  <p className="text-muted-foreground leading-relaxed">{hotel.description}</p>
                )}
              </div>

              <Separator />

              {/* Quick Info Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: <Sun className="h-5 w-5" />, label: "Check-in", value: hotel.check_in_time || "14:00" },
                  { icon: <Moon className="h-5 w-5" />, label: "Check-out", value: hotel.check_out_time || "12:00" },
                  { icon: <Globe className="h-5 w-5" />, label: "Languages", value: (hotel.languages_spoken || []).slice(0, 2).join(", ") },
                  { icon: <CreditCard className="h-5 w-5" />, label: "Payment", value: hotel.accepts_cards ? "Cards Accepted" : "Cash Only" },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">{item.icon}</div>
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold">{item.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Tabs */}
              <Tabs defaultValue="specs" className="w-full">
                <TabsList className="w-full grid grid-cols-4 h-12">
                  <TabsTrigger value="specs" className="text-xs sm:text-sm">Specifications</TabsTrigger>
                  <TabsTrigger value="rooms" className="text-xs sm:text-sm">Room Types</TabsTrigger>
                  <TabsTrigger value="nearby" className="text-xs sm:text-sm">Nearby</TabsTrigger>
                  <TabsTrigger value="policies" className="text-xs sm:text-sm">Policies</TabsTrigger>
                </TabsList>

                <TabsContent value="specs" className="mt-6">
                  <HotelSpecsGrid hotel={hotel} />
                </TabsContent>

                <TabsContent value="rooms" className="mt-6">
                  <HotelRoomTypes hotelId={hotel.id} hotelName={hotel.name} basePrice={hotel.price_per_night} discount={hotel.discount_percentage || 0} />
                </TabsContent>

                <TabsContent value="nearby" className="mt-6">
                  <HotelNearbyAttractions city={hotel.city} locality={hotel.locality} />
                </TabsContent>

                <TabsContent value="policies" className="mt-6">
                  <HotelPolicies hotel={hotel} />
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Sticky Booking Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <Card className="overflow-hidden border-primary/20 shadow-xl">
                  <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 space-y-4">
                    <div className="flex items-baseline gap-2">
                      {hotel.discount_percentage && hotel.discount_percentage > 0 && (
                        <span className="text-lg text-muted-foreground line-through">₹{hotel.price_per_night.toLocaleString()}</span>
                      )}
                      <span className="text-4xl font-bold text-foreground">₹{Math.round(discountedPrice).toLocaleString()}</span>
                      <span className="text-muted-foreground">/night</span>
                    </div>
                    {hotel.discount_percentage && hotel.discount_percentage > 0 && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        You save ₹{Math.round(hotel.price_per_night - discountedPrice).toLocaleString()} per night
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <Button className="w-full h-12 text-base gap-2" onClick={() => { setBookingType("with_visit"); setBookingModalOpen(true); }}>
                      <Calendar className="h-5 w-5" />
                      Book with Site Visit
                    </Button>
                    <Button variant="outline" className="w-full h-12 text-base gap-2" onClick={() => { setBookingType("hotel_only"); setBookingModalOpen(true); }}>
                      <BedDouble className="h-5 w-5" />
                      Book Hotel Only
                    </Button>
                    <Separator />
                    <div className="space-y-3">
                      {hotel.contact_phone && (
                        <a href={`tel:${hotel.contact_phone}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                          <Phone className="h-4 w-4 text-primary" />
                          <span className="text-sm">{hotel.contact_phone}</span>
                        </a>
                      )}
                      {hotel.contact_email && (
                        <a href={`mailto:${hotel.contact_email}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                          <Mail className="h-4 w-4 text-primary" />
                          <span className="text-sm truncate">{hotel.contact_email}</span>
                        </a>
                      )}
                    </div>
                    {hotel.partner_since && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
                        <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                        JaagaX Partner since {new Date(hotel.partner_since).toLocaleDateString("en-IN", { year: "numeric", month: "short" })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Property Explorer CTA */}
                <Card className="bg-gradient-to-br from-accent/30 to-primary/10 border-primary/10">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-sm">Exploring properties in {hotel.city}?</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">Browse nearby properties and book your visit + stay together for exclusive discounts.</p>
                    <Button variant="outline" size="sm" className="w-full gap-1" onClick={() => navigate(`/search?city=${hotel.city}`)}>
                      <Navigation2 className="h-3.5 w-3.5" />
                      Explore Properties
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HotelDetail;
