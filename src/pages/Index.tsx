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

  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <FeaturedProperties detectedCity={detectedLocation?.city} />
      <NewProjects detectedCity={detectedLocation?.city} />
      <AISpotlight />
      <MarketIntelligence />
      <FindMyAgent />
      <TruValue />
      <FeaturedCommunities />
      <Footer />
    </div>
  );
};

export default Index;
