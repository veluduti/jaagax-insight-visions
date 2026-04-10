import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Building2, ArrowRight, Award, Sparkles } from "lucide-react";

interface Props {
  builder: any;
  tier: string;
  onContact: () => void;
}

const BuilderMicrositeHero = ({ builder, tier, onContact }: Props) => {
  const hasImage = builder.images?.[0];

  return (
    <div className="relative min-h-[520px] md:min-h-[580px] overflow-hidden">
      {/* Background image or gradient */}
      {hasImage ? (
        <img src={builder.images[0]} alt={builder.builder_name} className="absolute inset-0 w-full h-full object-cover scale-105" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c0c1a] via-[#12121f] to-[#08080a]" />
      )}

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#08080a] via-[#08080a]/80 to-[#08080a]/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#08080a]/70 via-transparent to-[#08080a]/50" />
      
      {/* Subtle purple glow at bottom */}
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[300px] bg-violet-600/[0.06] rounded-full blur-[100px]" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-end justify-between gap-8">
          <div className="space-y-5 max-w-2xl">
            {/* Badges */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <Badge className="bg-violet-500/15 text-violet-300 border border-violet-500/25 text-[10px] font-semibold uppercase tracking-[0.2em] px-3.5 py-1.5 rounded-full backdrop-blur-sm">
                <Sparkles className="h-3 w-3 mr-1" />
                {tier === "luxury" ? "Luxury" : tier === "budget" ? "Value" : "Premium"}
              </Badge>
              {builder.established_year && (
                <Badge variant="outline" className="border-white/[0.1] text-zinc-400 text-[10px] rounded-full bg-white/[0.03] backdrop-blur-sm">
                  Est. {builder.established_year}
                </Badge>
              )}
              {builder.awards?.length > 0 && (
                <Badge variant="outline" className="border-amber-500/20 text-amber-400/80 text-[10px] gap-1 rounded-full bg-amber-500/[0.05] backdrop-blur-sm">
                  <Award className="h-3 w-3" /> Award Winning
                </Badge>
              )}
            </div>

            {/* Logo */}
            {builder.logo && (
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-2xl blur-md" />
                <img
                  src={builder.logo}
                  alt=""
                  className="relative h-14 w-14 rounded-2xl border border-white/[0.1] object-contain bg-[#0c0c0f]/80 p-2 backdrop-blur-sm"
                />
              </div>
            )}

            {/* Name */}
            <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-[1.05]">
              {builder.builder_name}
            </h1>

            {/* Tagline */}
            {builder.tagline && (
              <p className="text-zinc-400 text-base md:text-lg max-w-xl font-light leading-relaxed">
                "{builder.tagline}"
              </p>
            )}

            {/* Meta */}
            <div className="flex items-center gap-5 text-sm text-zinc-500">
              {builder.customer_rating > 0 && (
                <span className="flex items-center gap-1.5 bg-white/[0.04] backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/[0.06]">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-amber-400 font-medium">{builder.customer_rating}</span>
                  <span className="text-zinc-600">/5</span>
                </span>
              )}
              {builder.operating_cities?.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-zinc-600" /> 
                  <span className="text-zinc-400">{builder.operating_cities.join(" · ")}</span>
                </span>
              )}
              {builder.years_of_experience && (
                <span className="text-zinc-400">{builder.years_of_experience}+ Years</span>
              )}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex gap-3 flex-shrink-0">
            <Button
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 font-semibold gap-2 rounded-xl shadow-[0_0_30px_rgba(139,92,246,0.25)] px-7 transition-all hover:shadow-[0_0_40px_rgba(139,92,246,0.35)] hover:scale-[1.02] active:scale-[0.98]"
              onClick={onContact}
            >
              Contact Now <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white/[0.1] text-zinc-300 hover:text-white hover:border-white/[0.2] hover:bg-white/[0.04] rounded-xl backdrop-blur-sm transition-all"
            >
              <Building2 className="h-4 w-4 mr-2" /> View Projects
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuilderMicrositeHero;
