import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { CalendarDays, UsersRound, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FeaturedProperties from "@/components/FeaturedProperties";

import NewProjects from "@/components/NewProjects";
import AISpotlight from "@/components/AISpotlight";
import AIInsightStrip from "@/components/AIInsightStrip";
import MarketIntelligence from "@/components/MarketIntelligence";
import FindMyAgent from "@/components/FindMyAgent";
import TruValue from "@/components/TruValue";
import FeaturedCommunities from "@/components/FeaturedCommunities";
import Footer from "@/components/Footer";
import { useLocation } from "@/contexts/LocationContext";
import VisitStayTeaser from "@/components/home/VisitStayTeaser";
import TrustStatements from "@/components/home/TrustStatements";
import PromotedListings from "@/components/home/PromotedListings";
import FeaturedBuilderProfiles from "@/components/home/FeaturedBuilderProfiles";
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
  const { detectedLocation, isDetecting } = useLocation();
  const { role, user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("properties");

  // Avoid a flash of the consumer home page while the signed-in user's role resolves.
  if (user && authLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  // Hotel managers can also browse the main home page; the Partner portal is reachable via Dashboard.


  const showBuyRent = canSee(role, "buyRent");
  const showNewProjects = canSee(role, "newProjects");
  const showTransactions = canSee(role, "transactions");
  const showAgents = canSee(role, "agents");
  const showCommunities = canSee(role, "communities");
  const showMarketIndex = canSee(role, "marketIndex");
  const showSellerSearch = true;

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
      <Hero activeTab={activeTab} onTabChange={setActiveTab} showSearchBar={showSellerSearch} />

      {/* Mobile-only: quick service grid. On the properties tab it renders below Featured Properties instead. */}
      {!(activeTab === "properties" && showBuyRent) && <MobileQuickAccess />}

      {/* Promoted Listings Carousel */}
      <PromotedListings />

      {/* AI Insight Strip - Only shown to buyers with context. Lazy mount keeps initial paint fast. */}
      {role === "buyer" && (
        <LazyMount fallback={<AISectionSkeleton />} rootMargin="300px">
          <AIInsightStrip />
        </LazyMount>
      )}

      {/* Dynamic Content Based on Active Tab */}
      {activeTab === "properties" && showBuyRent && (
        <>
          <nav aria-label="Property discovery shortcuts" className="container mx-auto container-padding pt-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button asChild variant="ghost" className="h-auto min-h-24 justify-start gap-4 whitespace-normal rounded-lg border border-primary/10 bg-accent px-5 py-4 text-left shadow-sm hover:border-primary/40">
                <Link to="/agents">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <UsersRound className="!h-8 !w-8" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-foreground">Find My Agent</span>
                    <span className="mt-1 block text-sm font-normal text-muted-foreground">Connect with verified agents</span>
                  </span>
                  <ChevronRight className="!h-5 !w-5 text-muted-foreground" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="h-auto min-h-24 justify-start gap-4 whitespace-normal rounded-lg border border-border bg-secondary px-5 py-4 text-left shadow-sm hover:border-primary/40">
                <Link to="/smart-visits">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-background text-foreground">
                    <CalendarDays className="!h-8 !w-8" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-foreground">Smart Visits</span>
                    <span className="mt-1 block text-sm font-normal text-muted-foreground">Plan and book property visits</span>
                  </span>
                  <ChevronRight className="!h-5 !w-5 text-muted-foreground" />
                </Link>
              </Button>
            </div>
          </nav>
          <FeaturedProperties detectedCity={detectedLocation?.city} />
          <FeaturedBuilderProfiles />
          {/* Mobile-only: quick service cards first, Hotel Services / Property Selling below */}
          <MobileQuickAccess />
          <MobileServiceSections />
          <VisitStayTeaser />
          <LazyMount fallback={<AISectionSkeleton />} rootMargin="200px" minHeight={300}>
            <AISpotlight />
          </LazyMount>
          {showMarketIndex && (
            <LazyMount fallback={<AISectionSkeleton />} rootMargin="200px" minHeight={400}>
              <MarketIntelligence />
            </LazyMount>
          )}
        </>
      )}

      {activeTab === "new-projects" && showNewProjects && (
        <>
          <NewProjects detectedCity={detectedLocation?.city} />
          <VisitStayTeaser />
          {showBuyRent && <FeaturedProperties detectedCity={detectedLocation?.city} />}
          {showMarketIndex && (
            <LazyMount fallback={<AISectionSkeleton />} rootMargin="200px" minHeight={400}>
              <MarketIntelligence />
            </LazyMount>
          )}
          <TruValue />
        </>
      )}

      {activeTab === "transactions" && showTransactions && (
        <>
          {showCommunities && <FeaturedCommunities />}
          {showMarketIndex && (
            <LazyMount fallback={<AISectionSkeleton />} rootMargin="200px" minHeight={400}>
              <MarketIntelligence />
            </LazyMount>
          )}
          <TruValue />
        </>
      )}

      {activeTab === "agents" && showAgents && (
        <>
          <FindMyAgent />
          <LazyMount fallback={<AISectionSkeleton />} rootMargin="200px" minHeight={300}>
            <AISpotlight />
          </LazyMount>
          <TruValue />
        </>
      )}

      {/* Mobile-only: Hotel Services / Property Selling / More Services below featured content (non-properties tabs) */}
      {!(activeTab === "properties" && showBuyRent) && <MobileServiceSections />}

      {/* Trust Statements above Footer */}
      <TrustStatements />
      <Footer />
    </div>
  );
};

export default Index;
