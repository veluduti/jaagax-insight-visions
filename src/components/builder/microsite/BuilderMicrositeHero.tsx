import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  builder: any;
  tier: string;
  onContact: () => void;
}

const BuilderMicrositeHero = ({ builder, tier, onContact }: Props) => {
  const hasImage = builder.images?.[0];

  if (tier === "luxury") {
    return (
      <div className="relative h-[60vh] min-h-[480px] overflow-hidden">
        {hasImage ? (
          <img src={builder.images[0]} alt={builder.builder_name} className="w-full h-full object-cover scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-[#000]" />
        )}
        {/* Luxury gradient: dark with gold tint */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-14">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-amber-500/90 text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                  Luxury
                </Badge>
                {builder.established_year && (
                  <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-[10px]">
                    Est. {builder.established_year}
                  </Badge>
                )}
              </div>
              {builder.logo && (
                <img src={builder.logo} alt="" className="h-10 w-10 rounded-lg border border-amber-500/20 object-contain bg-black/50 p-1" />
              )}
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.1]">
                {builder.builder_name}
              </h1>
              {builder.tagline && (
                <p className="text-amber-200/80 text-base md:text-lg max-w-xl font-light italic">
                  "{builder.tagline}"
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-amber-300/70">
                {builder.customer_rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {builder.customer_rating}/5
                  </span>
                )}
                {builder.operating_cities?.length > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {builder.operating_cities.join(" · ")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                size="lg"
                className="bg-amber-500 text-black hover:bg-amber-400 font-semibold gap-2 shadow-[0_4px_20px_rgba(245,158,11,0.3)]"
                onClick={onContact}
              >
                Contact Now <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
              >
                <Building2 className="h-4 w-4 mr-2" /> View Projects
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tier === "budget") {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 py-12 md:py-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8">
          {/* Left: Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                Value Builder
              </Badge>
              {builder.established_year && (
                <Badge variant="outline" className="text-[10px]">Est. {builder.established_year}</Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              {builder.logo && (
                <div className="h-12 w-12 rounded-xl bg-white dark:bg-slate-800 shadow-md border flex items-center justify-center p-1.5">
                  <img src={builder.logo} alt="" className="w-full h-full object-contain" />
                </div>
              )}
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white leading-tight">
                {builder.builder_name}
              </h1>
            </div>
            {builder.tagline && (
              <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md">{builder.tagline}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              {builder.customer_rating > 0 && (
                <span className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2.5 py-1 rounded-full">
                  <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" /> {builder.customer_rating}
                </span>
              )}
              {builder.operating_cities?.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {builder.operating_cities.join(", ")}
                </span>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={onContact}>
                Get Quote <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg">
                <Building2 className="h-4 w-4 mr-2" /> Projects
              </Button>
            </div>
          </div>
          {/* Right: Image card */}
          {hasImage && (
            <div className="w-full md:w-80 h-56 md:h-64 rounded-2xl overflow-hidden shadow-xl border border-blue-100 dark:border-blue-800/40">
              <img src={builder.images[0]} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard (default)
  return (
    <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
      {hasImage ? (
        <img src={builder.images[0]} alt={builder.builder_name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-muted" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary/90 text-primary-foreground text-[10px] uppercase tracking-wider">Standard</Badge>
              {builder.established_year && (
                <Badge variant="outline" className="bg-background/40 backdrop-blur-sm text-foreground text-[10px]">
                  Est. {builder.established_year}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              {builder.logo && (
                <div className="h-12 w-12 rounded-xl bg-background shadow-lg border flex items-center justify-center p-1.5">
                  <img src={builder.logo} alt="" className="w-full h-full object-contain" />
                </div>
              )}
              <h1 className="text-3xl md:text-5xl font-bold text-foreground leading-tight">{builder.builder_name}</h1>
            </div>
            {builder.tagline && <p className="text-muted-foreground text-sm md:text-base max-w-lg">{builder.tagline}</p>}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {builder.customer_rating > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {builder.customer_rating}/5
                </span>
              )}
              {builder.operating_cities?.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {builder.operating_cities.join(" · ")}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button size="lg" className="gap-2" onClick={onContact}>
              Contact Now <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="bg-background/60 backdrop-blur-sm">
              <Building2 className="h-4 w-4 mr-2" /> View Projects
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuilderMicrositeHero;
