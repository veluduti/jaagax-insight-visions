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

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <FeaturedProperties />
      <NewProjects />
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
