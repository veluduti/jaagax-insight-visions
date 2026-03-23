import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronUp, ChevronDown, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import PropertyReelCard from "@/components/reels/PropertyReelCard";
import ReelPropertyDrawer from "@/components/reels/ReelPropertyDrawer";

interface Property {
  id: string;
  title: string;
  city: string;
  locality: string;
  price: number;
  bhk: number | null;
  type: string | null;
  verified: boolean | null;
  video_urls: string[];
  images: string[] | null;
  description: string | null;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  address: string | null;
}

const PropertyReels = () => {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"details" | "book">("details");

  useEffect(() => {
    const fetchProperties = async () => {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .not("video_urls", "eq", "{}");

      if (data) {
        setProperties(
          data
            .filter((p: any) => p.video_urls && p.video_urls.length > 0)
            .map((p: any) => ({
              ...p,
              video_urls: p.video_urls as string[],
              images: p.images as string[] | null,
            }))
        );
      }
      setLoading(false);
    };
    fetchProperties();
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, properties.length - 1));
  }, [properties.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") goNext();
      if (e.key === "ArrowUp" || e.key === "k") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  const currentProperty = properties[currentIndex];

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <Film className="h-12 w-12 text-white animate-pulse" />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <Film className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">No Property Reels Yet</h2>
        <p className="text-white/60 text-sm">Check back soon for property video tours!</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="text-white border-white/20">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black relative overflow-hidden">
      {/* Back button */}
      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Counter */}
      <div className="absolute top-5 right-4 z-20">
        <span className="text-white/70 text-sm font-medium">
          {currentIndex + 1} / {properties.length}
        </span>
      </div>

      {/* Current reel */}
      <div className="h-full w-full">
        <PropertyReelCard
          property={currentProperty}
          isActive={true}
          onViewDetails={() => {
            setDrawerTab("details");
            setDrawerOpen(true);
          }}
          onBookVisit={() => {
            setDrawerTab("book");
            setDrawerOpen(true);
          }}
        />
      </div>

      {/* Navigation arrows */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="text-white hover:bg-white/20 disabled:opacity-30"
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={goNext}
          disabled={currentIndex === properties.length - 1}
          className="text-white hover:bg-white/20 disabled:opacity-30"
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
      </div>

      {/* Property drawer */}
      <ReelPropertyDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        property={currentProperty}
        activeTab={drawerTab}
      />
    </div>
  );
};

export default PropertyReels;
