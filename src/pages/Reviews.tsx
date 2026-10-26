import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, MessageSquare, Star } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  name: string;
  city: string | null;
  rating: number;
  quote: string;
  avatar_url: string | null;
}

async function loadReviews(): Promise<Review[]> {
  const reviews: Review[] = [];
  const batchSize = 500;
  for (let offset = 0; ; offset += batchSize) {
    const { data, error } = await (supabase as any)
      .from("site_testimonials")
      .select("id, name, city, rating, quote, avatar_url")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + batchSize - 1);
    if (error) throw error;
    const batch = (data ?? []) as Review[];
    reviews.push(...batch);
    if (batch.length < batchSize) return reviews;
  }
}

const Reviews = () => {
  const { data: reviews = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["public-site-reviews"],
    queryFn: loadReviews,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Community Reviews | JAAGA X" description="Read community reviews and experiences with JAAGA X." canonicalPath="/reviews" />
      <Navigation />
      <main className="container mx-auto container-padding py-8 sm:py-12">
        <Button asChild variant="link" className="mb-5 px-0">
          <Link to="/"><ArrowLeft /> Back to home</Link>
        </Button>
        <header className="mb-8 border-b border-border pb-6">
          <h1 className="text-3xl font-extrabold text-foreground sm:text-4xl">What Our Users Say</h1>
          <p className="mt-2 text-muted-foreground">Community reviews of JAAGA X</p>
        </header>
        {isLoading ? (
          <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Loading reviews…</div>
        ) : isError ? (
          <div role="alert" className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">Reviews couldn't be loaded. Please try again.</p>
            <Button onClick={() => refetch()}>Try again</Button>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground"><MessageSquare className="mx-auto mb-3 h-8 w-8" /><p>No reviews published yet.</p></div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((review) => (
              <figure key={review.id} className="rounded-lg border border-border bg-card p-5 shadow-card">
                <div className="flex items-center gap-3">
                  {review.avatar_url ? (
                    <img src={review.avatar_url} alt={review.name} loading="lazy" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">{review.name.trim().charAt(0).toUpperCase()}</span>
                  )}
                  <div className="min-w-0">
                    <figcaption className="break-words font-bold text-foreground">{review.name}</figcaption>
                    {review.city && <p className="text-sm text-muted-foreground">{review.city}</p>}
                  </div>
                </div>
                <div className="mt-4 flex gap-1" aria-label={`${review.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? "fill-primary text-primary" : "text-border"}`} />)}
                </div>
                <blockquote className="mt-3 break-words text-sm leading-relaxed text-foreground/80">“{review.quote}”</blockquote>
              </figure>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Reviews;