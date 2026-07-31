import { useState } from "react";
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

const Index = () => {
  const { detectedLocation, isDetecting } = useLocation();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState("properties");

  // Hotel managers have their own dedicated Partner portal — send them there instead of the buyer/seller home.
  if (role === "hotel_manager") {
    return <Navigate to="/partners" replace />;
  }


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
      <Hero activeTab={activeTab} onTabChange={setActiveTab} showSearchBar={showSellerSearch} />

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
          <FeaturedProperties detectedCity={detectedLocation?.city} />
          <FeaturedBuilderProfiles />
          <SneakPeekListings />
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

      {/* Trust Statements above Footer */}
      <TrustStatements />
      <Footer />
    </div>
  );
};

export default Index;
