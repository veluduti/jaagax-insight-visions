import { useState } from "react";
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
import IntentChips from "@/components/home/IntentChips";
import VisitStayTeaser from "@/components/home/VisitStayTeaser";
import TrustStatements from "@/components/home/TrustStatements";
import PromotedListings from "@/components/home/PromotedListings";
import SneakPeekListings from "@/components/home/SneakPeekListings";
import FeaturedBuilderProfiles from "@/components/home/FeaturedBuilderProfiles";
import { useAuth } from "@/hooks/useAuth";
import { canSee } from "@/lib/roleAccess";

const Index = () => {
  const { detectedLocation, isDetecting } = useLocation();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState("properties");

  const showBuyRent = canSee(role, "buyRent");
  const showNewProjects = canSee(role, "newProjects");
  const showTransactions = canSee(role, "transactions");
  const showAgents = canSee(role, "agents");
  const showCommunities = canSee(role, "communities");
  const showMarketIndex = canSee(role, "marketIndex");
  const showSellerSearch = role !== "seller";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero activeTab={activeTab} onTabChange={setActiveTab} showSearchBar={showSellerSearch} />
      
      {/* Intent Chips - Thin strip for user mindset */}
      <IntentChips />
      
      {/* Promoted Listings Carousel */}
      <PromotedListings />
      
      {/* AI Insight Strip - Only shown to buyers with context */}
      <AIInsightStrip />
      
      {/* Dynamic Content Based on Active Tab */}
      {activeTab === "properties" && showBuyRent && (
        <>
          <FeaturedProperties detectedCity={detectedLocation?.city} />
          <FeaturedBuilderProfiles />
          <SneakPeekListings />
          <VisitStayTeaser />
          <AISpotlight />
          {showMarketIndex && <MarketIntelligence />}
        </>
      )}
      
      {activeTab === "new-projects" && showNewProjects && (
        <>
          <NewProjects detectedCity={detectedLocation?.city} />
          <VisitStayTeaser />
          {showBuyRent && <FeaturedProperties detectedCity={detectedLocation?.city} />}
          {showMarketIndex && <MarketIntelligence />}
          <TruValue />
        </>
      )}
      
      {activeTab === "transactions" && showTransactions && (
        <>
          {showCommunities && <FeaturedCommunities />}
          {showMarketIndex && <MarketIntelligence />}
          <TruValue />
        </>
      )}
      
      {activeTab === "agents" && showAgents && (
        <>
          <FindMyAgent />
          <AISpotlight />
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
