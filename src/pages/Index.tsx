import { useState } from "react";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FeaturedProperties from "@/components/FeaturedProperties";
import NewProjects from "@/components/NewProjects";
import AISpotlight from "@/components/AISpotlight";
import MarketIntelligence from "@/components/MarketIntelligence";
import FindMyAgent from "@/components/FindMyAgent";
import TruValue from "@/components/TruValue";
import FeaturedCommunities from "@/components/FeaturedCommunities";
import Footer from "@/components/Footer";
import { useLocationDetection } from "@/hooks/useLocationDetection";

const Index = () => {
  const { detectedLocation, isDetecting } = useLocationDetection();
  const [activeTab, setActiveTab] = useState("properties");

  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero activeTab={activeTab} onTabChange={setActiveTab} />
      
      {/* Dynamic Content Based on Active Tab */}
      {activeTab === "properties" && (
        <>
          <FeaturedProperties detectedCity={detectedLocation?.city} />
          <AISpotlight />
          <MarketIntelligence />
        </>
      )}
      
      {activeTab === "new-projects" && (
        <>
          <NewProjects detectedCity={detectedLocation?.city} />
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
      
      <Footer />
    </div>
  );
};

export default Index;
