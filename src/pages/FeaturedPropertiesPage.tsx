import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import FeaturedProperties from "@/components/FeaturedProperties";
import { useLocation } from "@/contexts/LocationContext";

export default function FeaturedPropertiesPage() {
  const { detectedLocation } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-8">
        <FeaturedProperties detectedCity={detectedLocation?.city} />
      </div>
      <Footer />
    </div>
  );
}
