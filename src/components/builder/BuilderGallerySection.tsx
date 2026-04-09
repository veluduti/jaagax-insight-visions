import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Image, Play, ChevronLeft, ChevronRight, X } from "lucide-react";

interface Props {
  images: string[];
  videos: string[];
}

const BuilderGallerySection = ({ images, videos }: Props) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const allImages = images?.filter(Boolean) || [];
  if (allImages.length === 0 && (!videos || videos.length === 0)) return null;

  return (
    <>
      <Card>
        <CardContent className="p-5">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Image className="h-5 w-5 text-primary" /> Gallery & Media
          </h2>

          {/* Image Grid */}
          {allImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {allImages.map((img, i) => (
                <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}>
                  <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors" />
                </div>
              ))}
            </div>
          )}

          {/* Videos */}
          {videos?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5">
                <Play className="h-4 w-4" /> Videos
              </h3>
              <div className="flex flex-wrap gap-2">
                {videos.map((v, i) => (
                  <Button key={i} variant="outline" size="sm" className="text-xs" onClick={() => window.open(v, "_blank")}>
                    <Play className="h-3 w-3 mr-1" /> Video {i + 1}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-background/95 backdrop-blur-xl border-0">
          <div className="relative">
            <img src={allImages[lightboxIndex]} alt="" className="w-full max-h-[80vh] object-contain" />
            <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => setLightboxOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
            {allImages.length > 1 && (
              <>
                <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/50"
                  onClick={() => setLightboxIndex((p) => (p - 1 + allImages.length) % allImages.length)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/50"
                  onClick={() => setLightboxIndex((p) => (p + 1) % allImages.length)}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-background/70 px-3 py-1 rounded-full">
              {lightboxIndex + 1} / {allImages.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BuilderGallerySection;
