import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
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
import SneakPeekListings from "@/components/home/SneakPeekListings";
import FeaturedBuilderProfiles from "@/components/home/FeaturedBuilderProfiles";
import { useAuth } from "@/hooks/useAuth";
import { canSee } from "@/lib/roleAccess";
import { LazyMount, AISectionSkeleton } from "@/components/shared";
import SEO from "@/components/SEO";

// Helper component for section wrapper
const SectionWrapper = ({
  children,
  className = "",
  id = "",
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) => (
  <section id={id} className={`py-12 md:py-16 ${className}`}>
    <div className="container mx-auto px-4">{children}</div>
  </section>
);

// Helper for lazy-loaded sections
const LazySection = ({
  children,
  fallbackHeight = 400,
  rootMargin = "200px",
}: {
  children: React.ReactNode;
  fallbackHeight?: number;
  rootMargin?: string;
}) => (
  <LazyMount fallback={<AISectionSkeleton />} rootMargin={rootMargin} minHeight={fallbackHeight}>
    {children}
  </LazyMount>
);

const Index = () => {
  const { detectedLocation, isDetecting } = useLocation();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState("properties");

  // Hotel managers redirect
  if (role === "hotel_manager") {
    return <Navigate to="/partners" replace />;
  }

  // Role-based access control
  const permissions = useMemo(
    () => ({
      showBuyRent: canSee(role, "buyRent"),
      showNewProjects: canSee(role, "newProjects"),
      showTransactions: canSee(role, "transactions"),
      showAgents: canSee(role, "agents"),
      showCommunities: canSee(role, "communities"),
      showMarketIndex: canSee(role, "marketIndex"),
      showSellerSearch: true,
    }),
    [role],
  );

  // Render tab content based on active tab
  const renderTabContent = () => {
    const { showBuyRent, showNewProjects, showTransactions, showAgents, showCommunities, showMarketIndex } =
      permissions;

    switch (activeTab) {
      case "properties":
        if (!showBuyRent) return null;
        return (
          <>
            {/* Main Content Area */}
            <SectionWrapper id="featured-properties">
              <FeaturedProperties detectedCity={detectedLocation?.city} />
            </SectionWrapper>

            {/* Builder Profiles */}
            <SectionWrapper id="featured-builders" className="bg-muted/30">
              <FeaturedBuilderProfiles />
            </SectionWrapper>

            {/* Sneak Peek */}
            <SectionWrapper id="sneak-peek">
              <SneakPeekListings />
            </SectionWrapper>

            {/* Visit/Stay */}
            <SectionWrapper id="visit-stay" className="bg-muted/30">
              <VisitStayTeaser />
            </SectionWrapper>

            {/* AI Spotlight - Lazy Loaded */}
            <SectionWrapper id="ai-spotlight">
              <LazySection fallbackHeight={300}>
                <AISpotlight />
              </LazySection>
            </SectionWrapper>

            {/* Market Intelligence - Lazy Loaded */}
            {showMarketIndex && (
              <SectionWrapper id="market-intelligence" className="bg-muted/30">
                <LazySection fallbackHeight={400}>
                  <MarketIntelligence />
                </LazySection>
              </SectionWrapper>
            )}
          </>
        );

      case "new-projects":
        if (!showNewProjects) return null;
        return (
          <>
            <SectionWrapper id="new-projects">
              <NewProjects detectedCity={detectedLocation?.city} />
            </SectionWrapper>

            <SectionWrapper id="visit-stay" className="bg-muted/30">
              <VisitStayTeaser />
            </SectionWrapper>

            {showBuyRent && (
              <SectionWrapper id="featured-properties">
                <FeaturedProperties detectedCity={detectedLocation?.city} />
              </SectionWrapper>
            )}

            {showMarketIndex && (
              <SectionWrapper id="market-intelligence" className="bg-muted/30">
                <LazySection fallbackHeight={400}>
                  <MarketIntelligence />
                </LazySection>
              </SectionWrapper>
            )}

            <SectionWrapper id="tru-value">
              <TruValue />
            </SectionWrapper>
          </>
        );

      case "transactions":
        if (!showTransactions) return null;
        return (
          <>
            {showCommunities && (
              <SectionWrapper id="communities">
                <FeaturedCommunities />
              </SectionWrapper>
            )}

            {showMarketIndex && (
              <SectionWrapper id="market-intelligence" className="bg-muted/30">
                <LazySection fallbackHeight={400}>
                  <MarketIntelligence />
                </LazySection>
              </SectionWrapper>
            )}

            <SectionWrapper id="tru-value">
              <TruValue />
            </SectionWrapper>
          </>
        );

      case "agents":
        if (!showAgents) return null;
        return (
          <>
            <SectionWrapper id="find-agent">
              <FindMyAgent />
            </SectionWrapper>

            <SectionWrapper id="ai-spotlight" className="bg-muted/30">
              <LazySection fallbackHeight={300}>
                <AISpotlight />
              </LazySection>
            </SectionWrapper>

            <SectionWrapper id="tru-value">
              <TruValue />
            </SectionWrapper>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="JAAGA X — AI-Powered Real Estate in Hyderabad & Vijayawada"
        description="Discover verified properties, new projects, agents, and market insights across Hyderabad and Vijayawada with India's first AI-powered real estate platform."
        canonicalPath="/"
        type="website"
      />

      {/* Header & Navigation */}
      <Navigation />

      {/* Hero with Search */}
      <Hero activeTab={activeTab} onTabChange={setActiveTab} showSearchBar={permissions.showSellerSearch} />

      {/* Main Content */}
      <main className="flex-1">
        {/* AI Insight Strip - Only for buyers */}
        {role === "buyer" && (
          <SectionWrapper id="ai-insights" className="bg-primary/5">
            <LazySection fallbackHeight={100} rootMargin="300px">
              <AIInsightStrip />
            </LazySection>
          </SectionWrapper>
        )}

        {/* Promoted Listings */}
        <SectionWrapper id="promoted-listings">
          <PromotedListings />
        </SectionWrapper>

        {/* Dynamic Tab Content */}
        {renderTabContent()}

        {/* Trust Statements */}
        <SectionWrapper id="trust-statements" className="bg-muted/30">
          <TrustStatements />
        </SectionWrapper>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
