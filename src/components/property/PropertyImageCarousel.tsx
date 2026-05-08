import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PropertyImageCarouselProps {
  images: string[];
  verified: boolean;
  trustScore: number;
}

const PropertyImageCarousel = ({ images, verified, trustScore }: PropertyImageCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative w-full h-[60vh] bg-black overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`Property image ${currentIndex + 1}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "";
          }}
        />
      </AnimatePresence>

      {/* Verified Badge */}
      {verified && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-6 left-6 glass-panel rounded-full px-4 py-2 flex items-center gap-2"
        >
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="font-semibold">JaagaX Verified™</span>
        </motion.div>
      )}

      {/* Trust Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-6 right-6 glass-panel rounded-xl px-6 py-3"
      >
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm text-muted-foreground">TrustScore™</div>
            <div className="text-2xl font-bold text-primary">{trustScore}/100</div>
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={prevImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 glass-panel rounded-full h-12 w-12"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 glass-panel rounded-full h-12 w-12"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Image Counter */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-panel rounded-full px-4 py-2">
        <span className="font-semibold">{currentIndex + 1} / {images.length}</span>
      </div>

      {/* Thumbnail Strip */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 max-w-md overflow-x-auto p-2">
        {images.map((img, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
              idx === currentIndex ? "border-primary scale-110" : "border-transparent opacity-60"
            }`}
          >
            <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" onError={(e) = loading="lazy" decoding="async" /> { e.currentTarget.src = ""; }} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default PropertyImageCarousel;
