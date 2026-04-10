import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Building2, ArrowRight, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  builder: any;
  tier: string;
  onContact: () => void;
}

const BuilderMicrositeHero = ({ builder, tier, onContact }: Props) => {
  const hasImage = builder.images?.[0];

  // ═══════════════════════════════════════════
  // LUXURY — Cinematic dark green + gold
  // ═══════════════════════════════════════════
  if (tier === "luxury") {
    return (
      <div className="relative h-[65vh] min-h-[520px] overflow-hidden">
        {hasImage ? (
          <img src={builder.images[0]} alt={builder.builder_name} className="w-full h-full object-cover scale-105 filter brightness-[0.4]" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0a1208] via-[#0d1a0c] to-[#070a06]" />
        )}
        {/* Layered luxury gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a06] via-[#070a06]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#070a06]/90 via-transparent to-[#070a06]/40" />
        {/* Subtle gold vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(200,184,130,0.06)_0%,transparent_60%)]" />

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-14">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-end justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              {/* Tier + year badges */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <Badge className="bg-[#c8b882]/15 text-[#c8b882] border border-[#c8b882]/25 text-[10px] font-semibold uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-lg">
                  Luxury
                </Badge>
                {builder.established_year && (
                  <Badge variant="outline" className="border-[#2a3a20]/50 text-[#8a9a78] text-[10px] rounded-lg">
                    Est. {builder.established_year}
                  </Badge>
                )}
                {builder.awards?.length > 0 && (
                  <Badge variant="outline" className="border-[#c8b882]/20 text-[#c8b882]/70 text-[10px] gap-1 rounded-lg">
                    <Award className="h-3 w-3" /> Award Winning
                  </Badge>
                )}
              </div>

              {/* Logo */}
              {builder.logo && (
                <img
                  src={builder.logo}
                  alt=""
                  className="h-12 w-12 rounded-xl border border-[#2a3a20]/40 object-contain bg-[#0c0f0a]/80 p-1.5"
                />
              )}

              {/* Name */}
              <h1 className="text-4xl md:text-6xl font-bold text-[#e8e4dc] tracking-tight leading-[1.08]">
                {builder.builder_name}
              </h1>

              {/* Tagline */}
              {builder.tagline && (
                <p className="text-[#c8b882]/70 text-base md:text-lg max-w-xl font-light italic leading-relaxed">
                  "{builder.tagline}"
                </p>
              )}

              {/* Meta info */}
              <div className="flex items-center gap-5 text-sm text-[#8a9a78]">
                {builder.customer_rating > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-[#c8b882] text-[#c8b882]" />
                    <span className="text-[#c8b882] font-medium">{builder.customer_rating}</span>/5
                  </span>
                )}
                {builder.operating_cities?.length > 0 && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {builder.operating_cities.join(" · ")}
                  </span>
                )}
                {builder.years_of_experience && (
                  <span>{builder.years_of_experience}+ Years</span>
                )}
              </div>
            </div>

            {/* CTAs */}
            <div className="flex gap-3 flex-shrink-0">
              <Button
                size="lg"
                className="bg-gradient-to-r from-[#b8982e] to-[#d4af37] text-[#0c0f0a] hover:from-[#c8a83e] hover:to-[#e4bf47] font-semibold gap-2 rounded-xl shadow-[0_4px_24px_rgba(212,175,55,0.25)] px-7"
                onClick={onContact}
              >
                Contact Now <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-[#2a3a20]/60 text-[#8a9a78] hover:text-[#c8b882] hover:border-[#c8b882]/30 hover:bg-[#c8b882]/5 rounded-xl"
              >
                <Building2 className="h-4 w-4 mr-2" /> View Projects
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // BUDGET — Clean, bright, practical
  // ═══════════════════════════════════════════
  if (tier === "budget") {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950 py-12 md:py-16 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                Value Builder
              </Badge>
              {builder.established_year && (
                <Badge variant="outline" className="text-[10px] rounded-lg">Est. {builder.established_year}</Badge>
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
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl" onClick={onContact}>
                Get Quote <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" className="rounded-xl">
                <Building2 className="h-4 w-4 mr-2" /> Projects
              </Button>
            </div>
          </div>
          {hasImage && (
            <div className="w-full md:w-80 h-56 md:h-64 rounded-2xl overflow-hidden shadow-xl border border-blue-100 dark:border-blue-800/40">
              <img src={builder.images[0]} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // STANDARD — Clean green glassmorphism
  // ═══════════════════════════════════════════
  return (
    <div className="relative h-[50vh] min-h-[400px] overflow-hidden">
      {hasImage ? (
        <img src={builder.images[0]} alt={builder.builder_name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#e8f2e6] to-[#d0e0cc] dark:from-[#0d1a0c] dark:to-[#0f1310]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[#f7f8f6] dark:from-[#0f1310] via-[#f7f8f6]/60 dark:via-[#0f1310]/60 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-[#2a5a24]/90 text-white text-[10px] uppercase tracking-wider rounded-lg">Standard</Badge>
              {builder.established_year && (
                <Badge variant="outline" className="bg-background/40 backdrop-blur-sm text-foreground text-[10px] rounded-lg">
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
            <Button size="lg" className="gap-2 rounded-xl bg-[#2a5a24] hover:bg-[#1e4a1a] text-white" onClick={onContact}>
              Contact Now <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="bg-background/60 backdrop-blur-sm rounded-xl">
              <Building2 className="h-4 w-4 mr-2" /> View Projects
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuilderMicrositeHero;
