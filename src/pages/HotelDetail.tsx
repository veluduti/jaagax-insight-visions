import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Building2,
  Heart,
  Share2,
  Clock,
  BadgeCheck,
  Images,
  ShieldCheck,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { nextDayISO, CHECKOUT_AFTER_CHECKIN_MSG, isValidDateRangeISO } from "@/lib/dateRange";
import { resolveHotelImages } from "@/lib/hotelImage";
import HotelRoomTypes from "@/components/hotels/HotelRoomTypes";
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
  description?: string | null;
  total_rooms?: number | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  policies?: Record<string, any> | null;
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

const humanize = (s: string) => s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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

  const discountPct = Number(hotel.discount_percentage) || 0;
  const hasDiscount = discountPct > 0;
  const starCount = Math.max(0, Math.min(5, Math.round(Number(hotel.star_rating) || 0)));
  const totalRooms = Number(hotel.total_rooms) || 0;
  const amenities = (hotel.amenities || []).filter(Boolean);

  const policyEntries = Object.entries(hotel.policies || {}).filter(
    ([, v]) => v !== null && v !== undefined && String(v).trim() !== ""
  );

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

  const scrollToId = (elId: string) => {
    document.getElementById(elId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="container mx-auto max-w-5xl px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <button onClick={() => navigate("/hotels")} className="hover:text-foreground transition-colors">
              Hotels
            </button>
            <span className="opacity-50">/</span>
            <span>{locCity}</span>
            <span className="opacity-50">/</span>
            <span className="text-foreground font-medium truncate max-w-[240px]">{titleCase(hotel.name)}</span>
          </div>
        </div>

        {/* 1 — HOTEL PHOTOS */}
        <section className="container mx-auto max-w-5xl px-4">
          <div className="relative">
            <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[300px] md:h-[440px] rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setGalleryOpen(true)}
                className={`relative row-span-2 group overflow-hidden ${
                  images.length > 1 ? "col-span-4 md:col-span-2" : "col-span-4"
                }`}
              >
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImageIndex}
                    src={images[currentImageIndex] || FALLBACK_IMG}
                    alt={`${hotel.name} photo`}
                    className="w-full h-full object-cover"
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  />
                </AnimatePresence>
                {images.length > 1 && (
                  <>
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
                  </>
                )}
              </button>

              {/* Side tiles — only real photos */}
              {images.slice(1, 5).map((img, i) => {
                const offset = i + 1;
                const isLast = i === 3;
                const extra = images.length - 5;
                return (
                  <button
                    key={offset}
                    type="button"
                    onClick={() => {
                      setCurrentImageIndex(offset);
                      if (isLast && extra > 0) setGalleryOpen(true);
                    }}
                    className="hidden md:block col-span-1 row-span-1 relative overflow-hidden group"
                  >
                    <img
                      src={img}
                      alt={`${hotel.name} photo ${offset + 1}`}
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

            {hasDiscount && (
              <Badge className="absolute top-4 left-4 bg-emerald-500 hover:bg-emerald-500 text-white border-0 shadow-lg px-3 py-1.5 text-xs font-semibold">
                {discountPct}% OFF
              </Badge>
            )}

            {images.length > 1 && (
              <button
                onClick={() => setGalleryOpen(true)}
                className="absolute bottom-4 right-4 gap-2 inline-flex items-center px-3.5 py-2 rounded-lg bg-background/95 backdrop-blur shadow-md text-xs font-semibold hover:bg-background transition"
              >
                <Images className="h-3.5 w-3.5" />
                View all {images.length} photos
              </button>
            )}
          </div>
        </section>

        <div className="container mx-auto max-w-5xl px-4 py-8 space-y-10">
          {/* 2 — BASIC HOTEL INFORMATION */}
          <section>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <h1 className="text-3xl md:text-[2.25rem] font-bold tracking-tight leading-tight text-foreground">
                  {titleCase(hotel.name)}
                </h1>
                <div className="flex items-center gap-3 flex-wrap text-sm">
                  {starCount > 0 && (
                    <>
                      <div className="flex gap-0.5">{renderStars(starCount)}</div>
                      <span className="text-muted-foreground">{starCount}-Star</span>
                    </>
                  )}
                  {locationLine && (
                    <span className="text-muted-foreground inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {locationLine}
                    </span>
                  )}
                  {totalRooms > 0 && <span className="text-muted-foreground">{totalRooms} Rooms</span>}
                </div>
                {hotel.address && <p className="text-sm text-muted-foreground">{hotel.address}</p>}
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
              <p className="text-muted-foreground leading-relaxed mt-4">{hotel.description}</p>
            )}

            {/* Only real, manager-provided facts */}
            <div className="flex flex-wrap gap-2 mt-4">
              {hotel.check_in_time && (
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3.5 py-1.5 text-xs">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">Check-in</span>
                  <span className="font-semibold">{hotel.check_in_time}</span>
                </span>
              )}
              {hotel.check_out_time && (
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3.5 py-1.5 text-xs">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">Check-out</span>
                  <span className="font-semibold">{hotel.check_out_time}</span>
                </span>
              )}
              {hotel.partner_since && (
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3.5 py-1.5 text-xs">
                  <BadgeCheck className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">Partner since</span>
                  <span className="font-semibold">
                    {new Date(hotel.partner_since).toLocaleDateString("en-IN", { year: "numeric", month: "short" })}
                  </span>
                </span>
              )}
            </div>

            {(hotel.contact_phone || hotel.contact_email) && (
              <div className="flex flex-wrap gap-3 mt-4">
                {hotel.contact_phone && (
                  <a
                    href={`tel:${hotel.contact_phone}`}
                    className="inline-flex items-center gap-2 text-sm font-medium hover:text-primary transition"
                  >
                    <Phone className="h-4 w-4 text-primary" /> {hotel.contact_phone}
                  </a>
                )}
                {hotel.contact_email && (
                  <a
                    href={`mailto:${hotel.contact_email}`}
                    className="inline-flex items-center gap-2 text-sm hover:text-primary transition"
                  >
                    <Mail className="h-4 w-4 text-primary" /> {hotel.contact_email}
                  </a>
                )}
              </div>
            )}
          </section>

          {/* 3 — AVAILABILITY */}
          <section id="availability" className="rounded-2xl border border-border bg-card p-4 md:p-5 shadow-sm">
            <h2 className="text-sm font-semibold mb-3">Check availability</h2>
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
                  setSearchNonce((n) => n + 1);
                  scrollToId("rooms");
                }}
              >
                Search Rooms
              </Button>
            </div>
          </section>

          {/* 4 — ROOMS */}
          <section id="rooms" className="scroll-mt-24">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <BedDouble className="h-5 w-5 text-primary" />
              Rooms
            </h2>
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
          </section>

          {/* 5 — AMENITIES (only if provided) */}
          {amenities.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
                Amenities & Facilities
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/40"
                  >
                    <span className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium">{amenity}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 6 — POLICIES (only manager-provided) */}
          {(policyEntries.length > 0 || hotel.check_in_time || hotel.check_out_time) && (
            <section>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Info className="h-5 w-5 text-primary" />
                Policies
              </h2>
              <div className="grid md:grid-cols-2 gap-3">
                {hotel.check_in_time && (
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <p className="text-xs text-muted-foreground mb-1">Check-in</p>
                    <p className="text-sm font-medium">From {hotel.check_in_time}</p>
                  </div>
                )}
                {hotel.check_out_time && (
                  <div className="rounded-xl border border-border/50 bg-card p-4">
                    <p className="text-xs text-muted-foreground mb-1">Check-out</p>
                    <p className="text-sm font-medium">By {hotel.check_out_time}</p>
                  </div>
                )}
                {policyEntries.map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-border/50 bg-card p-4">
                    <p className="text-xs text-muted-foreground mb-1">{humanize(key)}</p>
                    <p className="text-sm font-medium whitespace-pre-line">
                      {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 7 — BOOKING */}
          <section
            id="booking"
            className="rounded-2xl border border-border bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-5 md:p-6"
          >
            <h2 className="text-lg font-semibold mb-1">Book your stay</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Rates and taxes are confirmed on the selected room at checkout.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="flex-1 h-12 text-sm font-semibold gap-2 shadow-md"
                onClick={() => {
                  setBookingType("hotel_only");
                  setBookingModalOpen(true);
                }}
              >
                <BedDouble className="h-4 w-4" />
                Book Hotel Only
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-12 text-sm font-semibold gap-2 bg-background/70"
                onClick={() => {
                  setBookingType("visit_stay");
                  setBookingModalOpen(true);
                }}
              >
                <Calendar className="h-4 w-4" />
                Book with Site Visit
              </Button>
            </div>
          </section>
        </div>
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
