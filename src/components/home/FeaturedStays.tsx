import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, Heart, ArrowRight, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface StayCard {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  image: string | null;
  typeLabel: string | null;
  amenities: string[];
  price: number | null;
  priceUnit: string;
  rating: number | null;
  reviewCount: number;
}

const formatPrice = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * Featured Jaaga Stays — real partner hotels with their cheapest active room
 * price and real review averages. Hidden entirely when no hotels exist.
 */
const FeaturedStays = () => {
  const [stays, setStays] = useState<StayCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const scroller = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = supabase as any;
        const { data: hotels, error } = await sb
          .from("partner_hotels")
          .select("id, name, city, state, images, amenities, property_type_name, price_per_night, star_rating")
          .eq("is_active", true)
          .order("published_at", { ascending: false, nullsFirst: false })
          .limit(10);
        if (error) throw error;
        if (!hotels?.length) {
          if (!cancelled) setStays([]);
          return;
        }

        const ids = hotels.map((h: any) => h.id);
        const [roomsRes, reviewsRes] = await Promise.all([
          sb
            .from("hotel_rooms")
            .select("hotel_id, base_price, monthly_price, accommodation_kind")
            .eq("is_active", true)
            .in("hotel_id", ids),
          sb.from("hotel_reviews").select("hotel_id, rating").in("hotel_id", ids),
        ]);

        const roomsByHotel = new Map<string, any[]>();
        (roomsRes.data ?? []).forEach((r: any) => {
          const list = roomsByHotel.get(r.hotel_id) ?? [];
          list.push(r);
          roomsByHotel.set(r.hotel_id, list);
        });

        const reviewsByHotel = new Map<string, number[]>();
        (reviewsRes.data ?? []).forEach((r: any) => {
          if (typeof r.rating !== "number" || r.rating <= 0) return;
          const list = reviewsByHotel.get(r.hotel_id) ?? [];
          list.push(r.rating);
          reviewsByHotel.set(r.hotel_id, list);
        });

        const cards: StayCard[] = hotels.map((h: any) => {
          const rooms = roomsByHotel.get(h.id) ?? [];
          const nightly = rooms
            .map((r) => r.base_price)
            .filter((p): p is number => typeof p === "number" && p > 0)
            .sort((a, b) => a - b)[0];
          const monthly = rooms
            .map((r) => r.monthly_price)
            .filter((p): p is number => typeof p === "number" && p > 0)
            .sort((a, b) => a - b)[0];
          const ratings = reviewsByHotel.get(h.id) ?? [];
          const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

          const images = Array.isArray(h.images) ? h.images.filter(Boolean) : [];
          const amenities = Array.isArray(h.amenities) ? h.amenities.filter(Boolean).slice(0, 3) : [];

          return {
            id: h.id,
            name: h.name,
            city: h.city,
            state: h.state,
            image: images[0] ?? null,
            typeLabel: h.property_type_name ?? null,
            amenities,
            price:
              nightly ??
              monthly ??
              (typeof h.price_per_night === "number" && h.price_per_night > 0 ? h.price_per_night : null),
            priceUnit: nightly || h.price_per_night ? "/ night" : monthly ? "/ month" : "",
            rating: avg ?? (typeof h.star_rating === "number" && h.star_rating > 0 ? h.star_rating : null),
            reviewCount: ratings.length,
          };
        });

        if (!cancelled) setStays(cards);
      } catch {
        if (!cancelled) setStays([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("favorites")
          .select("hotel_id")
          .eq("user_id", user.id)
          .not("hotel_id", "is", null);
        if (data) setFavorites(new Set(data.map((f: any) => f.hotel_id)));
      } catch {
        // favorites are optional
      }
    })();
  }, [user]);

  const toggleFavorite = async (hotelId: string) => {
    if (!user) {
      toast({ title: "Please sign in", description: "Sign in to save stays to your favorites." });
      navigate("/auth");
      return;
    }
    const isFav = favorites.has(hotelId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(hotelId);
      else next.add(hotelId);
      return next;
    });
    try {
      if (isFav) {
        await (supabase as any).from("favorites").delete().eq("user_id", user.id).eq("hotel_id", hotelId);
      } else {
        await (supabase as any).from("favorites").insert({ user_id: user.id, hotel_id: hotelId });
      }
    } catch {
      // revert on failure
      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFav) next.add(hotelId);
        else next.delete(hotelId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <section className="section-spacing">
        <div className="container mx-auto container-padding text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
        </div>
      </section>
    );
  }

  if (stays.length === 0) return null;

  const scrollBy = (dir: number) => scroller.current?.scrollBy({ left: dir * 290, behavior: "smooth" });

  return (
    <section className="relative z-10 mt-2 bg-card border-y border-border/50">
      <div className="container mx-auto container-padding">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Featured Jaaga Stays</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Handpicked stays for every journey</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/hotels"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              View All Stays <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => scrollBy(-1)}
              aria-label="Scroll stays left"
              className="hidden md:grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollBy(1)}
              aria-label="Scroll stays right"
              className="hidden md:grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={scroller}
          className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-1"
        >
          {stays.map((s, i) => {
            const isFav = favorites.has(s.id);
            return (
              <motion.article
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.06, 0.3), duration: 0.45 }}
                className="snap-start shrink-0 w-[240px] sm:w-[260px] lg:w-[280px]"
              >
                <div
                  onClick={() => navigate(`/hotels/${s.id}`)}
                  className="group h-full cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-background shadow-card hover:shadow-card-hover transition-all duration-300"
                >
                  <div className="relative aspect-[3/2] overflow-hidden bg-muted">
                    {s.image ? (
                      <img
                        src={s.image}
                        alt={s.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.parentElement?.querySelector("[data-fallback]")?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div
                      data-fallback
                      className={`${s.image ? "hidden" : ""} absolute inset-0 flex flex-col items-center justify-center bg-muted`}
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <button
                      aria-label={isFav ? "Remove from favorites" : "Save to favorites"}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(s.id);
                      }}
                      className="absolute top-2.5 right-2.5 grid h-8 w-8 place-items-center rounded-full bg-card/90 backdrop-blur border border-border/40 shadow-sm hover:scale-105 active:scale-95 transition-transform"
                    >
                      <Heart className={`h-4 w-4 ${isFav ? "fill-primary text-primary" : "text-foreground/70"}`} />
                    </button>
                  </div>

                  <div className="p-3">
                    {s.rating !== null && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {s.rating.toFixed(1)}
                        {s.reviewCount > 0 && (
                          <span className="font-normal text-muted-foreground">({s.reviewCount})</span>
                        )}
                      </div>
                    )}
                    <h3 className="mt-1 text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {s.name}
                    </h3>
                    {(s.city || s.state) && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="line-clamp-1">{[s.city, s.state].filter(Boolean).join(", ")}</span>
                      </p>
                    )}
                    {(s.typeLabel || s.amenities.length > 0) && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {s.typeLabel && (
                          <span className="rounded-md bg-accent px-2 py-0.5 text-[10px] font-semibold text-primary">
                            {s.typeLabel}
                          </span>
                        )}
                        {s.amenities.map((a) => (
                          <span
                            key={a}
                            className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                    {s.price !== null && (
                      <p className="mt-2 text-base font-bold text-primary">
                        {formatPrice(s.price)}
                        <span className="text-xs font-normal text-muted-foreground"> {s.priceUnit}</span>
                      </p>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedStays;
