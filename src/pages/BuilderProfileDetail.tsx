import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Loader2, PanelRightOpen, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import BuilderHeroSection from "@/components/builder/BuilderHeroSection";
import BuilderStatsGrid from "@/components/builder/BuilderStatsGrid";
import BuilderAboutSection from "@/components/builder/BuilderAboutSection";
import BuilderProjectsSection from "@/components/builder/BuilderProjectsSection";
import BuilderContactSidebar from "@/components/builder/BuilderContactSidebar";
import BuilderGallerySection from "@/components/builder/BuilderGallerySection";
import BuilderTeamSection from "@/components/builder/BuilderTeamSection";
import BuilderAmenitiesSection from "@/components/builder/BuilderAmenitiesSection";

const BuilderProfileDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [builder, setBuilder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(true);

  useEffect(() => {
    const fetchBuilder = async () => {
      const { data } = await supabase.from("builder_profiles" as any).select("*").eq("id", id).single();
      setBuilder(data as any);
      setLoading(false);
    };
    if (id) fetchBuilder();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!builder) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto py-20 text-center">
          <h1 className="text-2xl font-bold">Builder Not Found</h1>
          <Button className="mt-4" onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <BuilderHeroSection builder={builder} />

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="-mt-12 relative z-20 mb-8">
          <BuilderStatsGrid builder={builder} />
        </div>

        {/* Toggle Button */}
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPanel(!showPanel)}
            className="gap-2 text-xs"
          >
            {showPanel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            {showPanel ? "Hide Contact Panel" : "Show Contact Panel"}
          </Button>
        </div>

        {/* Main Layout: Content + Sidebar */}
        <div className="flex gap-6">
          {/* Main content — expands to full when panel is hidden */}
          <div
            className="space-y-4 transition-all duration-500 ease-in-out"
            style={{ flex: showPanel ? '0 0 66.666%' : '1 1 100%', maxWidth: showPanel ? '66.666%' : '100%' }}
          >
            <BuilderAboutSection builder={builder} />
            <BuilderAmenitiesSection amenities={builder.amenities} unitTypes={builder.unit_types} />
            <BuilderTeamSection keyPeople={builder.key_people} />
            <BuilderGallerySection images={builder.images} videos={builder.videos} />
            <BuilderProjectsSection builderName={builder.builder_name} />
          </div>

          {/* Sidebar with smooth slide animation */}
          <div
            className="hidden lg:block overflow-hidden transition-all duration-500 ease-in-out"
            style={{
              flex: showPanel ? '0 0 33.333%' : '0 0 0%',
              maxWidth: showPanel ? '33.333%' : '0%',
              opacity: showPanel ? 1 : 0,
            }}
          >
            <div className="sticky top-20">
              <BuilderContactSidebar builder={builder} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg p-3 flex gap-2 z-50 lg:hidden">
        <Button className="flex-1" size="sm" onClick={() => window.open(`tel:${builder.phone}`)}>
          📞 Call
        </Button>
        {builder.whatsapp && (
          <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`https://wa.me/${builder.whatsapp?.replace(/[^0-9]/g, "")}`)}>
            💬 WhatsApp
          </Button>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default BuilderProfileDetail;
