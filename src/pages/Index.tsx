import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FeaturedProperties from "@/components/FeaturedProperties";
import Footer from "@/components/Footer";
import { useLocation } from "@/contexts/LocationContext";
import TrustStatements from "@/components/home/TrustStatements";
import PromotedListings from "@/components/home/PromotedListings";
import StatsStrip from "@/components/home/StatsStrip";
import ExploreJaaga from "@/components/home/ExploreJaaga";
import FeaturedStays from "@/components/home/FeaturedStays";
import JourneyBanners from "@/components/home/JourneyBanners";
import HowItWorks from "@/components/home/HowItWorks";
import HomeReviews from "@/components/home/HomeReviews";
import AIInsightStrip from "@/components/AIInsightStrip";
import { useAuth } from "@/hooks/useAuth";
import { canSee } from "@/lib/roleAccess";
import { LazyMount, AISectionSkeleton } from "@/components/shared";
import SEO from "@/components/SEO";
import {
  MobileQuickAccess,
  MobileServicePills,
  MobileServiceSections,
} from "@/components/home/MobileHomeServices";

const Index = () => {
  const { detectedLocation } = useLocation();
  const { role, user, loading: authLoading } = useAuth();

  // Avoid a flash of the consumer home page while the signed-in user's role resolves.
  if (user && authLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  const showBuyRent = canSee(role, "buyRent");

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="JAAGA X — AI-Powered Real Estate in Hyderabad & Vijayawada"
        description="Discover verified properties, new projects, agents, and market insights across Hyderabad and Vijayawada with India's first AI-powered real estate platform."
        canonicalPath="/"
        type="website"
      />
      <Navigation />
      {/* Mobile-only: horizontally scrollable service pills directly under the header */}
      <MobileServicePills />

      {/* Hero banner + "What brings you to Jaaga today?" discovery panel */}
      <Hero showSearchBar />

      {/* Mobile-only: quick service grid */}
      <MobileQuickAccess />

      {/* Platform statistics (real database counts only) */}
      <StatsStrip />

      {/* Explore Jaaga category cards */}
      <ExploreJaaga />

      {/* Featured Jaaga Stays — real partner hotels */}
      <FeaturedStays />

      {/* Promoted Listings Carousel */}
      <PromotedListings />

      {/* AI Insight Strip - Only shown to buyers with context */}
      {role === "buyer" && (
        <LazyMount fallback={<AISectionSkeleton />} rootMargin="300px">
          <AIInsightStrip />
        </LazyMount>
      )}

      {/* Promotional journey banners */}
      <JourneyBanners />

      {/* Featured properties near the user's location */}
      {showBuyRent && <FeaturedProperties detectedCity={detectedLocation?.city} />}

      {/* Mobile-only: Hotel Services / Property Selling sections */}
      <MobileServiceSections />

      {/* Five-step how it works */}
      <HowItWorks />

      {/* Real customer reviews (hidden when none exist) */}
      <HomeReviews />

      {/* Trust Statements above Footer */}
      <TrustStatements />
      <Footer />
    </div>
  );
};

export default Index;
