import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Star, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Testimonial {
  id: string;
  name: string;
  city: string | null;
  rating: number;
  quote: string;
  avatar_url: string | null;
}

/** Homepage testimonials managed by global admins (site_testimonials). */
const HomeReviews = () => {
  const [reviews, setReviews] = useState<Testimonial[]>([]);

  useEffect(() => {
    (supabase as any)
      .from("site_testimonials")
      .select("id, name, city, rating, quote, avatar_url")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }: any) => setReviews(data ?? []));
  }, []);

  if (reviews.length === 0) return null;

  return (
    <section className="py-6 sm:py-8">
      <div className="container mx-auto container-padding">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">What Our Users Say</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Real experiences from our community</p>
          </div>
          <Link to="/hotels" className="hidden sm:inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline">
            View All Reviews <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {reviews.map((r, i) => (
            <motion.figure
              key={r.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-card"
            >
              {r.avatar_url ? (
                <img src={r.avatar_url} alt={r.name} loading="lazy" className="h-14 w-14 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {r.name.trim().charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <figcaption className="text-sm font-bold text-foreground">{r.name}</figcaption>
                {r.city && <p className="text-xs text-muted-foreground">{r.city}</p>}
                <div className="mt-1 flex gap-0.5" aria-label={`${r.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className={`h-4 w-4 ${s < r.rating ? "fill-amber-400 text-amber-400" : "text-border"}`} />
                  ))}
                </div>
                <blockquote className="mt-2 text-sm text-foreground/80 leading-snug">“{r.quote}”</blockquote>
              </div>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeReviews;
