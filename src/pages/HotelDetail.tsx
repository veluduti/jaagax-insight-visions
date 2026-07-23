import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  Mail,
  Calendar,
  BedDouble,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Building2,
  Globe,
  CreditCard,
  Heart,
  Share2,
  Navigation2,
  Sun,
  Moon,
  BadgeCheck,
  Images,
  ShieldCheck,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { nextDayISO, CHECKOUT_AFTER_CHECKIN_MSG, isValidDateRangeISO } from "@/lib/dateRange";
import { resolveHotelImages } from "@/lib/hotelImage";
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

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&auto=format&fit=crop&q=70";

const todayISO = () => new Date().toISOString().slice(0, 10);
const plusDaysISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const titleCase = (s?: string | null) =>
  (s || "")
    .toString()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const HotelDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingType, setBookingType] = useState<"hotel_only" | "visit_stay">("hotel_only");

  const [checkIn, setCheckIn] = useState<string>(plusDaysISO(1));
  const [checkOut, setCheckOut] = useState<string>(plusDaysISO(2));
  const [adults, setAdults] = useState<number>(2);
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [roomsWanted, setRoomsWanted] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>("specs");
  const [searchNonce, setSearchNonce] = useState(0);

  useEffect(() => {
    if (!id) return;
    const fetchHotel = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("partner_hotels").select("*").eq("id", id).single();
      if (error || !data) {
        console.error("Error fetching hotel:", error);
        setHotel(null);
      } else {
        const resolved = { ...data, images: await resolveHotelImages((data as any).images) };
        setHotel(resolved as HotelData);
      }
      setLoading(false);
    };
    fetchHotel();
  }, [id]);

  const images = useMemo(() => (hotel?.images && hotel.images.length ? hotel.images : [FALLBACK_IMG]), [hotel]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 pt-2 flex items-center justify-center">
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

  // ---- Safe derived values (fix stray "0" rendering) ----
  const discountPct = Number(hotel.discount_percentage) || 0;
  const hasDiscount = discountPct > 0;
  const basePrice = Number(hotel.price_per_night) || 0;
  const hasPrice = basePrice > 0;
  const discountedPrice = hasDiscount ? basePrice * (1 - discountPct / 100) : basePrice;
  const savings = hasDiscount && hasPrice ? Math.round(basePrice - discountedPrice) : 0;

  const starCount = Math.max(0, Math.min(5, Math.round(Number(hotel.star_rating) || 0)));
  const totalRooms = Number(hotel.total_rooms) || 0;

  const locLocality = titleCase(hotel.locality);
  const locCity = titleCase(hotel.city);
  const locationLine =
    locLocality && locCity && locLocality.toLowerCase() !== locCity.toLowerCase()
      ? `${locLocality}, ${locCity}`
      : locLocality || locCity || "";

  const renderStars = (rating: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`}
      />
    ));

  const nextImage = () => setCurrentImageIndex((p) => (p + 1) % images.length);
  const prevImage = () => setCurrentImageIndex((p) => (p - 1 + images.length) % images.length);

  const quickInfo = [
    { icon: <Sun className="h-4 w-4" />, label: "Check-in", value: hotel.check_in_time || "14:00" },
    { icon: <Moon className="h-4 w-4" />, label: "Check-out", value: hotel.check_out_time || "12:00" },
    {
      icon: <Globe className="h-4 w-4" />,
      label: "Languages",
      value: (hotel.languages_spoken || []).slice(0, 2).join(", ") || "English",
    },
    {
      icon: <CreditCard className="h-4 w-4" />,
      label: "Payment",
      value: hotel.accepts_cards ? "Cards Accepted" : "Cash Only",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="container mx-auto max-w-7xl px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <button onClick={() => navigate("/hotels")} className="hover:text-foreground transition-colors">
              Hotels
            </button>
            <span className="opacity-50">/</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">{locCity}</span>
            <span className="opacity-50">/</span>
            <span className="text-foreground font-medium truncate max-w-[240px]">{hotel.name}</span>
          </div>
        </div>

        {/* Hero Gallery — magazine-style */}
        <section className="container mx-auto max-w-7xl px-4">
          <div className="relative">
            <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[300px] md:h-[460px] rounded-2xl overflow-hidden">
              {/* Main image */}
              <button
                type="button"
                onClick={() => setGalleryOpen(true)}
                className="relative col-span-4 md:col-span-2 row-span-2 group overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImageIndex}
                    src={images[currentImageIndex] || FALLBACK_IMG}
                    alt={hotel.name}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-70 pointer-events-none" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/90 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </button>

              {/* Side tiles */}
              {[1, 2, 3, 4].map((offset, i) => {
                const img = images[offset];
                if (!img) {
                  return (
                    <div
                      key={i}
                      className="hidden md:flex col-span-1 row-span-1 bg-muted items-center justify-center"
                    >
                      <Building2 className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  );
                }
                const isLast = i === 3;
                const extra = images.length - 5;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setCurrentImageIndex(offset);
                      if (isLast && extra > 0) setGalleryOpen(true);
                    }}
                    className="hidden md:block col-span-1 row-span-1 relative overflow-hidden group"
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                    />
                    {isLast && extra > 0 && (
                      <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-semibold text-sm">
                        +{extra} photos
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Floating chips */}
            <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
              {hasDiscount && (
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white border-0 shadow-lg px-3 py-1.5 text-xs font-semibold">
                  {discountPct}% OFF · JaagaX Exclusive
                </Badge>
              )}
            </div>
            <div className="absolute top-4 right-4 flex gap-2">
              <Badge
                variant="secondary"
                className="gap-1.5 bg-background/95 backdrop-blur shadow-md px-2.5 py-1.5"
              >
                <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">Verified Partner</span>
              </Badge>
            </div>

            {/* Bottom-right: view all photos */}
            <button
              onClick={() => setGalleryOpen(true)}
              className="absolute bottom-4 right-4 gap-2 inline-flex items-center px-3.5 py-2 rounded-lg bg-background/95 backdrop-blur shadow-md text-xs font-semibold hover:bg-background transition"
            >
              <Images className="h-3.5 w-3.5" />
              View all {images.length} photos
            </button>

            {/* Mobile dots */}
            <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.slice(0, 6).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentImageIndex ? "w-5 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="container mx-auto max-w-7xl px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* LEFT */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <header className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-tight text-foreground">
                      {titleCase(hotel.name)}
                    </h1>
                    <div className="flex items-center gap-3 flex-wrap text-sm">
                      <div className="flex gap-0.5">{renderStars(starCount)}</div>
                      {starCount > 0 && (
                        <span className="text-muted-foreground">
                          {starCount}-Star Hotel
                        </span>
                      )}
                      {locationLine && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-muted-foreground inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {locationLine}
                          </span>
                        </>
                      )}
                      {totalRooms > 0 && (
                        <>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-muted-foreground">{totalRooms} Rooms</span>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                        <ShieldCheck className="h-3 w-3" /> JaagaX Verified
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600">
                        <Award className="h-3 w-3" /> Preferred Partner
                      </span>
                      {hotel.pet_friendly && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                          Pet Friendly
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-10 w-10"
                      onClick={() => {
                        setLiked(!liked);
                        toast.success(liked ? "Removed from wishlist" : "Added to wishlist");
                      }}
                    >
                      <Heart className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full h-10 w-10"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Link copied!");
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {hotel.description && (
                  <p className="text-muted-foreground leading-relaxed">{hotel.description}</p>
                )}
              </header>

              {/* Quick info chips */}
              <div className="flex flex-wrap gap-2">
                {quickInfo.map((item, i) => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3.5 py-1.5"
                  >
                    <span className="text-primary">{item.icon}</span>
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Availability search */}
              <div className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold">Check availability</h2>
                  <span className="text-[11px] text-muted-foreground">Instant confirmation</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                  <div className="flex flex-col">
                    <label className="text-[11px] text-muted-foreground mb-1">Check-in</label>
                    <input
                      type="date"
                      value={checkIn}
                      min={todayISO()}
                      onChange={(e) => {
                        const v = e.target.value;
                        setCheckIn(v);
                        if (v && checkOut && new Date(checkOut) <= new Date(v)) setCheckOut(nextDayISO(v));
                      }}
                      className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[11px] text-muted-foreground mb-1">Check-out</label>
                    <input
                      type="date"
                      value={checkOut}
                      min={nextDayISO(checkIn) || todayISO()}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v && checkIn && !isValidDateRangeISO(checkIn, v)) {
                          toast.error(CHECKOUT_AFTER_CHECKIN_MSG);
                          return;
                        }
                        setCheckOut(v);
                      }}
                      className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[11px] text-muted-foreground mb-1">Adults</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={adults}
                      onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))}
                      className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[11px] text-muted-foreground mb-1">Children</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={childrenCount}
                      onChange={(e) => setChildrenCount(Math.max(0, Number(e.target.value) || 0))}
                      className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[11px] text-muted-foreground mb-1">Rooms</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={roomsWanted}
                      onChange={(e) => setRoomsWanted(Math.max(1, Number(e.target.value) || 1))}
                      className="h-10 px-3 rounded-lg border border-input bg-background text-sm"
                    />
                  </div>
                  <Button
                    className="h-10 font-semibold"
                    onClick={() => {
                      if (checkOut <= checkIn) {
                        toast.error(CHECKOUT_AFTER_CHECKIN_MSG);
                        return;
                      }
                      setActiveTab("rooms");
                      setSearchNonce((n) => n + 1);
                    }}
                  >
                    Search Rooms
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-4 h-12 rounded-xl bg-muted/60 p-1">
                  <TabsTrigger value="specs" className="text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="rooms" className="text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm">
                    Rooms
                  </TabsTrigger>
                  <TabsTrigger value="nearby" className="text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm">
                    Nearby
                  </TabsTrigger>
                  <TabsTrigger value="policies" className="text-xs sm:text-sm rounded-lg data-[state=active]:shadow-sm">
                    Policies
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="specs" className="mt-6 focus-visible:outline-none">
                  <HotelSpecsGrid hotel={hotel} />
                </TabsContent>
                <TabsContent value="rooms" className="mt-6 focus-visible:outline-none">
                  <HotelRoomTypes
                    key={searchNonce}
                    hotelId={hotel.id}
                    hotelName={hotel.name}
                    hotelCity={hotel.city}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    adults={adults}
                    children={childrenCount}
                    roomsWanted={roomsWanted}
                  />
                </TabsContent>
                <TabsContent value="nearby" className="mt-6 focus-visible:outline-none">
                  <HotelNearbyAttractions city={hotel.city} locality={hotel.locality} />
                </TabsContent>
                <TabsContent value="policies" className="mt-6 focus-visible:outline-none">
                  <HotelPolicies hotel={hotel} />
                </TabsContent>
              </Tabs>
            </div>

            {/* RIGHT — Sticky booking */}
            <aside className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <div className="rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                  {/* Price header */}
                  <div className="p-6 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border-b border-border/60">
                    {hasPrice ? (
                      <>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          {hasDiscount && (
                            <span className="text-base text-muted-foreground line-through">
                              ₹{basePrice.toLocaleString()}
                            </span>
                          )}
                          <span className="text-[2.25rem] leading-none font-bold text-foreground">
                            ₹{Math.round(discountedPrice).toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">/ night</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Taxes & fees calculated at checkout
                        </p>
                        {hasDiscount && savings > 0 && (
                          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 text-xs font-semibold">
                            <Sparkles className="h-3 w-3" />
                            You save ₹{savings.toLocaleString()} per night
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-foreground">Price on request</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Contact the partner directly for latest rates.
                        </p>
                      </>
                    )}
                  </div>

                  {/* CTAs */}
                  <div className="p-5 space-y-3">
                    <Button
                      className="w-full h-12 text-sm font-semibold gap-2 shadow-md"
                      onClick={() => {
                        setBookingType("visit_stay");
                        setBookingModalOpen(true);
                      }}
                    >
                      <Calendar className="h-4 w-4" />
                      Book with Site Visit
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full h-12 text-sm font-semibold gap-2"
                      onClick={() => {
                        setBookingType("hotel_only");
                        setBookingModalOpen(true);
                      }}
                    >
                      <BedDouble className="h-4 w-4" />
                      Book Hotel Only
                    </Button>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Free cancellation on most rooms · No booking fees
                    </div>
                  </div>

                  {/* Contact */}
                  {(hotel.contact_phone || hotel.contact_email) && (
                    <div className="px-5 pb-5">
                      <div className="border-t border-border/60 pt-4 space-y-1.5">
                        {hotel.contact_phone && (
                          <a
                            href={`tel:${hotel.contact_phone}`}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition"
                          >
                            <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                              <Phone className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-sm font-medium">{hotel.contact_phone}</span>
                          </a>
                        )}
                        {hotel.contact_email && (
                          <a
                            href={`mailto:${hotel.contact_email}`}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition"
                          >
                            <span className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                              <Mail className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-sm truncate">{hotel.contact_email}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {hotel.partner_since && (
                    <div className="px-5 pb-5">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground border-t border-border/60 pt-3">
                        <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                        JaagaX Partner since{" "}
                        {new Date(hotel.partner_since).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cross-sell */}
                <div className="rounded-2xl border border-border bg-gradient-to-br from-accent/40 to-primary/10 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm">Exploring properties in {locCity}?</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Bundle nearby property visits with your stay for exclusive discounts.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 bg-background/70"
                    onClick={() => navigate(`/search?city=${hotel.city}`)}
                  >
                    <Navigation2 className="h-3.5 w-3.5" />
                    Explore Properties
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />

      {/* Lightbox */}
      {galleryOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setGalleryOpen(false)}
        >
          <button
            onClick={() => setGalleryOpen(false)}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            aria-label="Close"
          >
            ✕
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            className="absolute left-4 h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <img
            src={images[currentImageIndex]}
            alt={hotel.name}
            className="max-h-[90vh] max-w-[92vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-4 h-12 w-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-xs bg-white/10 rounded-full px-3 py-1">
            {currentImageIndex + 1} / {images.length}
          </div>
        </div>
      )}

      <HotelBookingModal
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        hotel={hotel}
        bookingType={bookingType}
        initialCheckIn={checkIn ? new Date(checkIn) : undefined}
        initialCheckOut={checkOut ? new Date(checkOut) : undefined}
        initialGuests={adults + childrenCount}
        initialRooms={roomsWanted}
      />
    </div>
  );
};

export default HotelDetail;
