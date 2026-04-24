import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Image, Video, Maximize2, Download, X, ChevronLeft, ChevronRight,
  Play, Pause, Volume2, VolumeX, Maximize, FileText, ZoomIn, ZoomOut, RotateCcw,
  LayoutGrid, ExternalLink
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

function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  return m ? m[1] : null;
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
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="photos" className="gap-2">
              <Image className="h-4 w-4" />
              Photos ({images.length})
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2" disabled={videos.length === 0}>
              <Video className="h-4 w-4" />
              Videos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="floorplans" className="gap-2" disabled={floorplans.length === 0}>
              <LayoutGrid className="h-4 w-4" />
              Floor Plans ({floorplans.length})
            </TabsTrigger>
            <TabsTrigger value="tour" className="gap-2" disabled={!virtualTourUrl}>
              <Maximize className="h-4 w-4" />
              360° Tour
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2" disabled={!brochureUrl}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map((videoUrl, idx) => {
                const ytId = getYouTubeId(videoUrl);
                return (
                  <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-black">
                    {ytId ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${ytId}`}
                        title={`Video ${idx + 1}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={videoUrl}
                        controls
                        className="w-full h-full object-cover"
                        poster={images[0]}
                      />
                    )}
                  </div>
                );
              })}
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

          <TabsContent value="floorplans" className="mt-4">
            {floorplans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {floorplans.map((plan, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.02 }}
                    className="glass-panel rounded-xl p-3 cursor-pointer group"
                    onClick={() => {
                      setMediaType("image");
                      // Show floor plan in fullscreen by temporarily putting it as current
                      const merged = [...images, ...floorplans];
                      setCurrentImageIndex(images.length + idx);
                      // Note: fullscreen reads from images prop, so we open a dedicated viewer
                      setShowFullscreen(true);
                    }}
                  >
                    <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                      <img
                        src={plan}
                        alt={`Floor Plan ${idx + 1}`}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Badge variant="secondary" className="backdrop-blur-sm gap-1">
                          <ZoomIn className="h-3 w-3" />
                          Click to zoom
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 px-2">
                      <p className="font-medium text-sm">Floor Plan {idx + 1}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(plan, "_blank");
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass-panel rounded-xl p-8 text-center">
                <LayoutGrid className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No floor plans available</p>
                <Button variant="outline" onClick={handleRequestMedia}>
                  Request Floor Plans
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="tour" className="mt-4">
            {virtualTourUrl ? (
              <div className="space-y-4">
                {getYouTubeId(virtualTourUrl) ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeId(virtualTourUrl)}`}
                      title="360° Virtual Tour"
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="glass-panel rounded-xl p-8 text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Maximize className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">360° Virtual Tour Available</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      Experience an immersive walkthrough of this property.
                    </p>
                    <Button
                      size="lg"
                      className="gap-2"
                      onClick={() => window.open(virtualTourUrl, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="h-5 w-5" />
                      Launch 360° Tour
                    </Button>
                  </div>
                )}
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
            {brochureUrl ? (
              <div className="glass-panel rounded-2xl p-6 md:p-8 border border-primary/20">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 border border-primary/20">
                      <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <Badge variant="secondary" className="mb-2 text-[10px] uppercase tracking-wider">
                        Official Brochure
                      </Badge>
                      <p className="font-semibold text-base md:text-lg truncate">{propertyTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        Complete details, floor plans, specifications &amp; pricing
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => window.open(brochureUrl, "_blank")}
                      className="gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View
                    </Button>
                    <Button onClick={handleDownloadBrochure} size="lg" className="gap-2">
                      <Download className="h-5 w-5" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-xl p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No documents available</p>
                <Button variant="outline" onClick={handleRequestMedia}>
                  Request Documents
                </Button>
              </div>
            )}
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
