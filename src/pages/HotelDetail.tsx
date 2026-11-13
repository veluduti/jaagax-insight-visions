import { normalizeCategory } from "@/config/hospitalityCategories";
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { readHotelSearchContext } from "@/lib/hotelSearchContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Users,
  ArrowRight,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { BookingStepper, HotelHeroHeader, StarRow, WhyBookCard, TrustStrip, PaymentBadges, IncludedTick, useHotelReviewStats } from "@/components/hotels/booking/BookingFlowChrome";
import { toast } from "sonner";
import { nextDayISO, CHECKOUT_AFTER_CHECKIN_MSG, isValidDateRangeISO } from "@/lib/dateRange";
import { resolveHotelImages } from "@/lib/hotelImage";
import HotelRoomTypes from "@/components/hotels/HotelRoomTypes";
import HotelExtraServices from "@/components/hotels/HotelExtraServices";
import { HotelAddonsShowcase } from "@/components/hotels/HotelAddons";
import HotelBookingModal from "@/components/hotels/HotelBookingModal";
import GoogleStaticMarkerMap from "@/components/location/GoogleStaticMarkerMap";
import { loadGoogleMaps } from "@/lib/googleMaps";

interface HotelData {
  business_types?: string[] | null;
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

const fmtDay = (iso: string) => { const d = new Date(`${iso}T00:00:00`); return Number.isNaN(+d) ? "—" : d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }); };

const humanize = (s: string) => s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const HotelDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const searchContext = readHotelSearchContext(new URLSearchParams(location.search), plusDaysISO(1));
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [extrasCount, setExtrasCount] = useState(0);

  const [liked, setLiked] = useState(false);
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [hasNightlyRooms, setHasNightlyRooms] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingType, setBookingType] = useState<"hotel_only" | "visit_stay">("hotel_only");

  const [checkIn, setCheckIn] = useState<string>(searchContext.checkIn);
  const [checkOut, setCheckOut] = useState<string>(searchContext.checkOut);
  const [adults, setAdults] = useState<number>(searchContext.adults);
  const [childrenCount, setChildrenCount] = useState<number>(searchContext.children);
  const [roomsWanted, setRoomsWanted] = useState<number>(searchContext.rooms);
  const [searchNonce, setSearchNonce] = useState(0);
  const [hotelCoords, setHotelCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [coordsLoading, setCoordsLoading] = useState(false);


  useEffect(() => {
    if (!id) return;
    const fetchHotel = async () => {
      setLoading(true);
      setHasNightlyRooms(null);
      const { data, error } = await supabase.from("partner_hotels").select("*").eq("id", id).single();
      if (error || !data) {
        console.error("Error fetching hotel:", error);
        setHotel(null);
      } else {
        if (data.source_channel === "hyperguest" && data.hyperguest_property_id) {
          const params = new URLSearchParams(location.search);
          params.set("marketplace", "1");
          navigate(`/hotels/hyperguest/${data.hyperguest_property_id}?${params}`, { replace: true });
          return;
        }
        const resolved = { ...data, images: await resolveHotelImages((data as any).images) };
        setHotel(resolved as HotelData);
      }
      setLoading(false);
    };
    fetchHotel();
  }, [id]);

  // Geocode hotel location if coordinates are missing so the map always renders
  useEffect(() => {
    if (!hotel) return;
    const lat = Number((hotel as any).latitude);
    const lng = Number((hotel as any).longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0) {
      setHotelCoords({ lat, lng });
      return;
    }
    const query =
      hotel.address ||
      [hotel.locality, hotel.city].filter(Boolean).join(", ") ||
      hotel.name;
    if (!query) return;
    let cancelled = false;
    setCoordsLoading(true);
    loadGoogleMaps()
      .then(async (google) => {
        if (cancelled) return;
        const { Geocoder } = (await google.maps.importLibrary("geocoding")) as any;
        const geocoder = new Geocoder();
        geocoder.geocode({ address: query }, (results: any, status: any) => {
          if (cancelled) return;
          if (status === "OK" && results?.[0]?.geometry?.location) {
            const location = results[0].geometry.location;
            const coords = { lat: location.lat(), lng: location.lng() };
            setHotelCoords(coords);
            // Persist best-effort so future loads are instant (ignore auth failures)
            supabase
              .from("partner_hotels")
              .update({ latitude: coords.lat, longitude: coords.lng })
              .eq("id", hotel.id)
              .then(({ error }) => {
                if (error) console.warn("[HotelDetail] coord persist skipped", error.message);
              });
          }
          setCoordsLoading(false);
        });
      })
      .catch((err) => {
        console.warn("[HotelDetail] geocode failed", err);
        setCoordsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hotel]);

  const reviewStats = useHotelReviewStats(id);
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

  const onlyLongStay = hasNightlyRooms === null
    ? !!hotel.business_types?.length && hotel.business_types.every((t) => ["hostel", "pg", "coliving"].includes(normalizeCategory(t)))
    : !hasNightlyRooms;
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

  const mapUrl = hotelCoords ? `https://www.google.com/maps/search/?api=1&query=${hotelCoords.lat},${hotelCoords.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name} ${hotel.address || locationLine}`)}`;

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
        <div className="container mx-auto max-w-7xl px-4 pt-4 pb-2">
          <nav className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <button onClick={() => navigate("/")} className="hover:text-foreground">Home</button><span>›</span>
            <button onClick={() => navigate("/hotels")} className="hover:text-foreground">Jaaga Stays</button><span>›</span>
            <button onClick={() => navigate(`/hotels${location.search}`)} className="hover:text-foreground">Hotels</button><span>›</span>
            <span className="text-foreground">{titleCase(hotel.name)}</span><span>›</span>
            <span className="font-semibold text-foreground">Book Your Stay</span>
          </nav>
        </div>

        <div className="container mx-auto max-w-7xl px-4 pb-10">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <HotelHeroHeader
            name={titleCase(hotel.name)}
            image={images[0]}
            photoCount={hotel.images?.length || 0}
            star={starCount}
            rooms={totalRooms}
            amenities={amenities}
            address={[hotel.address || locationLine].filter(Boolean).join("")}
            mapUrl={mapUrl}
            verified
            reviews={reviewStats}
            onPhotos={() => setGalleryOpen(true)}
          />
          <BookingStepper current={0} />

          {!onlyLongStay && <section id="availability">
            <h2 className="text-2xl font-bold text-primary">Check Availability &amp; Select Room</h2>
            <p className="mb-4 text-sm text-muted-foreground">Choose your stay dates, guests and preferred room with a rate plan.</p>
            <div className="grid items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm md:grid-cols-[1fr_1fr_1.2fr_auto]">
              <label className="flex items-center gap-3 rounded-xl border border-input px-3 py-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="flex flex-col"><span className="text-[11px] text-muted-foreground">Check-in</span>
                <input id="availability-check-in" type="date" value={checkIn} min={todayISO()} onChange={(e) => { const v = e.target.value; setCheckIn(v); if (v && checkOut && new Date(checkOut) <= new Date(v)) setCheckOut(nextDayISO(v)); }} className="bg-transparent text-sm font-bold outline-none" /></span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-input px-3 py-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="flex flex-col"><span className="text-[11px] text-muted-foreground">Check-out</span>
                <input id="availability-check-out" type="date" value={checkOut} min={nextDayISO(checkIn) || todayISO()} onChange={(e) => { const v = e.target.value; if (v && checkIn && !isValidDateRangeISO(checkIn, v)) { toast.error(CHECKOUT_AFTER_CHECKIN_MSG); return; } setCheckOut(v); }} className="bg-transparent text-sm font-bold outline-none" /></span>
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="flex items-center gap-3 rounded-xl border border-input px-3 py-2 text-left">
                    <Users className="h-5 w-5 shrink-0 text-primary" />
                    <span className="flex flex-col"><span className="text-[11px] text-muted-foreground">Guests &amp; Rooms</span>
                      <span className="text-sm font-bold">{adults} Adult{adults > 1 ? "s" : ""}{childrenCount ? `, ${childrenCount} Child${childrenCount > 1 ? "ren" : ""}` : ""}, {roomsWanted} Room{roomsWanted > 1 ? "s" : ""}</span></span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 space-y-3" align="start">
                  {([["Adults", adults, 1, 20, setAdults], ["Children", childrenCount, 0, 10, setChildrenCount], ["Rooms", roomsWanted, 1, 10, setRoomsWanted]] as const).map(([lbl, val, mn, mx, set]) => (
                    <div key={lbl} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{lbl}</span>
                      <div className="flex items-center gap-2">
                        <Button type="button" size="icon" variant="outline" className="h-7 w-7" disabled={val <= mn} onClick={() => (set as any)(Math.max(mn, val - 1))}>−</Button>
                        <span className="w-6 text-center text-sm font-bold">{val}</span>
                        <Button type="button" size="icon" variant="outline" className="h-7 w-7" disabled={val >= mx} onClick={() => (set as any)(Math.min(mx, val + 1))}>+</Button>
                      </div>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
              <Button className="h-12 px-6 text-base font-bold" onClick={() => { if (checkOut <= checkIn) { toast.error(CHECKOUT_AFTER_CHECKIN_MSG); return; } setSearchNonce((n) => n + 1); scrollToId("rooms"); }}>
                Check Availability
              </Button>
            </div>
          </section>}

          <section id="rooms" className="scroll-mt-24">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-primary">
              <BedDouble className="h-6 w-6 text-primary" />
              {onlyLongStay ? "Rooms & beds · Weekly / monthly stays" : "Available Rooms"}
            </h2>
            <HotelRoomTypes
              key={searchNonce}
              hotelId={hotel.id}
              hotelName={hotel.name}
              hotelCity={hotel.city}
              checkIn={onlyLongStay ? undefined : checkIn}
              checkOut={onlyLongStay ? undefined : checkOut}
              adults={onlyLongStay ? 1 : adults}
              children={onlyLongStay ? 0 : childrenCount}
              roomsWanted={roomsWanted}
              onNightlyRoomsChange={setHasNightlyRooms}
            />
          </section>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
            <span className="flex items-center gap-2 font-bold text-foreground"><CheckCircle2 className="h-5 w-5 text-primary" /> What's Included in Your Stay?</span>
            <IncludedTick>Room as per selected plan</IncludedTick>
            <IncludedTick>Taxes (as applicable)</IncludedTick>
            {amenities.slice(0, 3).map((a) => <IncludedTick key={a}>{a}</IncludedTick>)}
          </div>

          <HotelAddonsShowcase hotelId={hotel.id} onAdd={() => scrollToId("rooms")} />

          {hotel.description && (
            <section>
              <h2 className="mb-2 text-lg font-bold">About this hotel</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{hotel.description}</p>
            </section>
          )}

          {amenities.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-primary" /> Amenities &amp; Facilities</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
                    <ShieldCheck className="h-4 w-4 text-primary" /><span className="text-sm font-medium">{amenity}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="mb-3 text-xl font-bold text-primary">Your Booking Summary</h3>
            <div className="flex gap-3">
              <img src={images[0]} alt="" className="h-16 w-20 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="font-bold text-foreground">{titleCase(hotel.name)}</p>
                {starCount > 0 && <StarRow value={starCount} size="h-3.5 w-3.5" />}
                <p className="text-xs text-muted-foreground">{starCount > 0 ? `${starCount} Star · ` : ""}{locationLine}</p>
              </div>
            </div>
            {!onlyLongStay && <>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
                <div><p className="text-[11px] text-muted-foreground">Check-in</p><p className="font-semibold">{fmtDay(checkIn)}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Check-out</p><p className="font-semibold">{fmtDay(checkOut)}</p></div>
              </div>
              <div className="mt-3 text-sm"><p className="text-[11px] text-muted-foreground">Guests</p>
                <p className="font-semibold">{adults} Adult{adults > 1 ? "s" : ""}{childrenCount ? `, ${childrenCount} Child${childrenCount > 1 ? "ren" : ""}` : ""} · {roomsWanted} Room{roomsWanted > 1 ? "s" : ""}</p></div>
            </>}
          </div>

          {(hotel.check_in_time || hotel.check_out_time || policyEntries.length > 0) && (
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-2 font-bold text-primary">Hotel Policies</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {hotel.check_in_time && <li>Check-in: From {hotel.check_in_time}</li>}
                {hotel.check_out_time && <li>Check-out: By {hotel.check_out_time}</li>}
                {policyEntries.slice(0, 4).map(([k, v]) => <li key={k}>{humanize(k)}: {typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}</li>)}
              </ul>
            </div>
          )}

          <div>
            <Button className="h-11 w-full font-bold" onClick={() => scrollToId("rooms")}>
              {onlyLongStay ? "Choose a room or bed" : "Continue to Payment"}
            </Button>
            <div className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Secure &amp; Safe Payment</div>
          </div>
          <div className={extrasCount > 0 ? "" : "hidden"}>
            <HotelExtraServices hotelId={hotel.id} variant="sidebar" onCount={setExtrasCount} />
          </div>

          <WhyBookCard />

          {(hotel.address || locationLine) && (
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h3 className="font-bold">Location</h3>
              <p className="text-sm text-muted-foreground">{hotel.address || locationLine}</p>
              {hotelCoords ? (
                <div className="overflow-hidden rounded-xl border border-border">
                  <GoogleStaticMarkerMap lat={hotelCoords.lat} lng={hotelCoords.lng} label={hotel.name} height="200px" zoom={14} variant="verified" />
                </div>
              ) : coordsLoading ? <div className="h-48 animate-pulse rounded-xl border border-border bg-muted" /> : null}
            </div>
          )}
        </aside>
        </div>

        <div className="mt-8"><TrustStrip /></div>
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
