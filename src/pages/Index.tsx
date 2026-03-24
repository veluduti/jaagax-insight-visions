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

const Index = () => {
  const { detectedLocation, isDetecting } = useLocation();
  const [activeTab, setActiveTab] = useState("properties");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Hero activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Intent Chips - Thin strip for user mindset */}
      <IntentChips />
      
      {/* Promoted Listings Carousel */}
      <PromotedListings />
      
      {/* AI Insight Strip - Only shown to buyers with context */}
      <AIInsightStrip />
      
      {/* Dynamic Content Based on Active Tab */}
      {activeTab === "properties" && (
        <>
          <FeaturedProperties detectedCity={detectedLocation?.city} />
          <VisitStayTeaser />
          <AISpotlight />
          <MarketIntelligence />
        </>
      )}
      
      {activeTab === "new-projects" && (
        <>
          <NewProjects detectedCity={detectedLocation?.city} />
          <VisitStayTeaser />
          <FeaturedProperties detectedCity={detectedLocation?.city} />
          <MarketIntelligence />
          <TruValue />
        </>
      )}
      
      {activeTab === "transactions" && (
        <>
          <FeaturedCommunities />
          <MarketIntelligence />
          <TruValue />
        </>
      )}
      
      {activeTab === "agents" && (
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
