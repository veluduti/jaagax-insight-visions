import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import FeaturedCommunities from "@/components/FeaturedCommunities";
import AIFeatures from "@/components/AIFeatures";
import TrustBadge from "@/components/TrustBadge";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <FeaturedCommunities />
      <AIFeatures />
      <TrustBadge />
    </div>
  );
};

export default Index;
