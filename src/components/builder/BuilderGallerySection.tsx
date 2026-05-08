import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Play, ChevronLeft, ChevronRight, X } from "lucide-react";

interface Props {
  images: string[];
  videos: string[];
  tier?: string;
}

const BuilderGallerySection = ({ images, videos, tier = "standard" }: Props) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const allImages = images?.filter(Boolean) || [];
  if (allImages.length === 0 && (!videos || videos.length === 0)) return null;

  return (
    <>
      <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06]">
        {allImages.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-4">
            {allImages.map((img, i) => (
              <div
                key={i}
                className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group border border-white/[0.04]"
                onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
              >
                <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"  loading="lazy" decoding="async" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-[10px] text-white font-medium">{i + 1}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {videos?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5 text-zinc-300">
              <Play className="h-4 w-4 text-violet-400" /> Videos
            </h3>
            <div className="flex flex-wrap gap-2">
              {videos.map((v, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs rounded-xl border-white/[0.08] text-zinc-400 bg-white/[0.03] hover:bg-white/[0.06] hover:text-white"
                  onClick={() => window.open(v, "_blank")}
                >
                  <Play className="h-3 w-3 mr-1" /> Video {i + 1}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl p-0 bg-[#0c0c0f]/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl overflow-hidden">
          <div className="relative">
            <img src={allImages[lightboxIndex]} alt="" className="w-full max-h-[80vh] object-contain"  loading="lazy" decoding="async" />
            <Button variant="ghost" size="icon" className="absolute top-3 right-3 rounded-xl bg-black/50 hover:bg-black/70 text-white" onClick={() => setLightboxOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
            {allImages.length > 1 && (
              <>
                <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => setLightboxIndex((p) => (p - 1 + allImages.length) % allImages.length)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-black/50 hover:bg-black/70 text-white"
                  onClick={() => setLightboxIndex((p) => (p + 1) % allImages.length)}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-white/10 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/[0.06]">
              {lightboxIndex + 1} / {allImages.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BuilderGallerySection;
