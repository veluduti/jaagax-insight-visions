import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Star, MapPin, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  guest_name: string | null;
  rating: number;
  body: string | null;
  title: string | null;
  hotel_name?: string | null;
}

/**
 * Real customer reviews from hotel_reviews. Hidden when there are none —
 * never shows invented testimonials.
 */
const HomeReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sb = supabase as any;
        const { data, error } = await sb
          .from("hotel_reviews")
          .select("id, guest_name, rating, title, body, hotel_id")
          .gte("rating", 4)
          .not("body", "is", null)
          .order("created_at", { ascending: false })
          .limit(6);
        if (error) throw error;
        if (!data?.length) {
          if (!cancelled) setLoaded(true);
          return;
        }
        const hotelIds = [...new Set(data.map((r: any) => r.hotel_id).filter(Boolean))];
        const { data: hotels } = await sb.from("partner_hotels").select("id, name").in("id", hotelIds);
        const nameById = new Map((hotels ?? []).map((h: any) => [h.id, h.name]));
        if (!cancelled) {
          setReviews(
            data.map((r: any) => ({ ...r, hotel_name: nameById.get(r.hotel_id) ?? null })),
          );
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || reviews.length === 0) return null;

  return (
    <section className="section-spacing bg-card border-y border-border/50">
      <div className="container mx-auto container-padding">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">What Our Users Say</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Real experiences from our community
            </p>
          </div>
          <Link
            to="/hotels"
            className="hidden sm:inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            View All Reviews <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.slice(0, 3).map((r, i) => (
            <motion.figure
              key={r.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="rounded-2xl border border-border/60 bg-background p-5 shadow-card"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {(r.guest_name || "G").trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <figcaption className="text-sm font-bold text-foreground line-clamp-1">
                    {r.guest_name || "Jaaga Guest"}
                  </figcaption>
                  {r.hotel_name && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground line-clamp-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {r.hotel_name}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star
                    key={s}
                    className={`h-4 w-4 ${s < Math.round(r.rating) ? "fill-amber-400 text-amber-400" : "text-border"}`}
                  />
                ))}
              </div>
              <blockquote className="mt-3 text-sm text-foreground/80 leading-relaxed line-clamp-4">
                "{r.title ? `${r.title} — ` : ""}{r.body}"
              </blockquote>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeReviews;
