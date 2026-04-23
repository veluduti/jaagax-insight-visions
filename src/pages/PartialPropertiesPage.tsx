import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import PartialProperties from "@/components/PartialProperties";
import { useLocation } from "@/contexts/LocationContext";

export default function PartialPropertiesPage() {
  const { detectedLocation } = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-8">
        <PartialProperties detectedCity={detectedLocation?.city} />
      </div>
      <Footer />
    </div>
  );
}
