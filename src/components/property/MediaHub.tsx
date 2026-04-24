import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Image, Video, Maximize2, Download, X, ChevronLeft, ChevronRight,
  Play, Pause, Volume2, VolumeX, Maximize, FileText, ZoomIn, ZoomOut, RotateCcw
} from "lucide-react";
import { toast } from "sonner";

interface MediaHubProps {
  images: string[];
  videos?: string[];
  virtualTourUrl?: string;
  floorplans?: string[];
  brochureUrl?: string;
  propertyId: string;
  propertyTitle: string;
}

export default function MediaHub({
  images,
  videos = [],
  virtualTourUrl,
  floorplans = [],
  brochureUrl,
  propertyId,
  propertyTitle
}: MediaHubProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [mediaType, setMediaType] = useState<"image" | "video" | "360">("image");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [zoom, setZoom] = useState(1);

  // Reset zoom when image changes or modal closes
  useEffect(() => {
    setZoom(1);
  }, [currentImageIndex, showFullscreen]);

  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 4));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 1));
  const resetZoom = () => setZoom(1);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleDownloadBrochure = async () => {
    if (!brochureUrl) {
      toast.info("Brochure not available. Contact agent for details.");
      return;
    }
    
    // Log download event
    try {
      window.open(brochureUrl, "_blank");
      toast.success("Opening brochure...");
    } catch (error) {
      toast.error("Failed to open brochure");
    }
  };

  const handleRequestMedia = () => {
    toast.info("Your request has been sent to the agent");
  };

  const openFullscreen = (type: "image" | "video" | "360") => {
    setMediaType(type);
    setShowFullscreen(true);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Hero Image/Video */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full h-[60vh] rounded-2xl overflow-hidden bg-black group"
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImageIndex}
              src={images[currentImageIndex] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00"}
              alt={`${propertyTitle} - Image ${currentImageIndex + 1}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => openFullscreen("image")}
              className="w-full h-full object-cover cursor-zoom-in"
              loading="lazy"
            />
          </AnimatePresence>

          {/* Overlay Controls */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
              <div className="space-y-2">
                <Badge variant="secondary" className="backdrop-blur-sm">
                  {currentImageIndex + 1} / {images.length}
                </Badge>
              </div>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => openFullscreen("image")}
                className="backdrop-blur-sm"
              >
                <Maximize2 className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
        </motion.div>

        {/* Thumbnail Strip & Media Tabs */}
        <Tabs defaultValue="photos" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="photos" className="gap-2">
              <Image className="h-4 w-4" />
              Photos ({images.length})
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2" disabled={videos.length === 0}>
              <Video className="h-4 w-4" />
              Videos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="tour" className="gap-2" disabled={!virtualTourUrl}>
              <Maximize className="h-4 w-4" />
              360° Tour
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2" disabled={!floorplans.length && !brochureUrl}>
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="photos" className="mt-4">
            <div className="grid grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => {
                    if (idx === currentImageIndex) {
                      openFullscreen("image");
                    } else {
                      setCurrentImageIndex(idx);
                    }
                  }}
                  whileHover={{ scale: 1.05 }}
                  className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    idx === currentImageIndex
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </motion.button>
              ))}
              {images.length === 0 && (
                <div className="col-span-4 glass-panel rounded-xl p-8 text-center">
                  <Image className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No photos available</p>
                  <Button variant="outline" onClick={handleRequestMedia}>
                    Request Photos
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="videos" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              {videos.map((videoUrl, idx) => (
                <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-black">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-cover"
                    poster={images[0]}
                  />
                </div>
              ))}
              {videos.length === 0 && (
                <div className="col-span-2 glass-panel rounded-xl p-8 text-center">
                  <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No videos available</p>
                  <Button variant="outline" onClick={handleRequestMedia}>
                    Request Video Walkthrough
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tour" className="mt-4">
            {virtualTourUrl ? (
              <div className="glass-panel rounded-xl p-8 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Maximize className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">360° Virtual Tour Available</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Experience an immersive walkthrough of this property. The tour opens in a new tab for the best viewing experience.
                </p>
                <Button
                  size="lg"
                  className="gap-2"
                  onClick={() => window.open(virtualTourUrl, '_blank', 'noopener,noreferrer')}
                >
                  <Maximize className="h-5 w-5" />
                  Launch 360° Tour
                </Button>
              </div>
            ) : (
              <div className="glass-panel rounded-xl p-8 text-center">
                <Maximize className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">360° Tour not available</p>
                <Button variant="outline" onClick={handleRequestMedia}>
                  Request Virtual Tour
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <div className="space-y-4">
              {/* Floorplans */}
              {floorplans.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3">Floor Plans</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {floorplans.map((plan, idx) => (
                      <div key={idx} className="glass-panel rounded-xl p-4 cursor-pointer hover:border-primary transition-colors">
                        <img src={plan} alt={`Floor Plan ${idx + 1}`} className="w-full h-auto rounded-lg" />
                        <Button variant="ghost" size="sm" className="w-full mt-2">
                          <Download className="h-4 w-4 mr-2" />
                          Download Plan {idx + 1}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Brochure */}
              {brochureUrl && (
                <div>
                  <h3 className="font-semibold mb-3">Property Brochure</h3>
                  <div className="glass-panel rounded-xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{propertyTitle}</p>
                        <p className="text-sm text-muted-foreground">Complete property details PDF</p>
                      </div>
                    </div>
                    <Button onClick={handleDownloadBrochure}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              {!floorplans.length && !brochureUrl && (
                <div className="glass-panel rounded-xl p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No documents available</p>
                  <Button variant="outline" onClick={handleRequestMedia}>
                    Request Documents
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={showFullscreen} onOpenChange={setShowFullscreen}>
        <DialogContent className="max-w-7xl h-[90vh] p-0">
          <div className="relative w-full h-full bg-black">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowFullscreen(false)}
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>

            {mediaType === "image" && (
              <>
                <div className="w-full h-full overflow-auto flex items-center justify-center">
                  <img
                    src={images[currentImageIndex]}
                    alt={propertyTitle}
                    style={{ transform: `scale(${zoom})`, transition: "transform 0.2s ease" }}
                    className="max-w-full max-h-full object-contain origin-center"
                  />
                </div>

                {/* Zoom controls */}
                <div className="absolute top-4 left-4 z-50 flex gap-2">
                  <Button variant="secondary" size="icon" onClick={zoomIn} className="backdrop-blur-sm" disabled={zoom >= 4}>
                    <ZoomIn className="h-5 w-5" />
                  </Button>
                  <Button variant="secondary" size="icon" onClick={zoomOut} className="backdrop-blur-sm" disabled={zoom <= 1}>
                    <ZoomOut className="h-5 w-5" />
                  </Button>
                  <Button variant="secondary" size="icon" onClick={resetZoom} className="backdrop-blur-sm" disabled={zoom === 1}>
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                  <Badge variant="secondary" className="backdrop-blur-sm px-3 py-2 self-center">
                    {Math.round(zoom * 100)}%
                  </Badge>
                </div>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={prevImage}
                    className="backdrop-blur-sm"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Badge variant="secondary" className="backdrop-blur-sm px-4 py-2">
                    {currentImageIndex + 1} / {images.length}
                  </Badge>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={nextImage}
                    className="backdrop-blur-sm"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
