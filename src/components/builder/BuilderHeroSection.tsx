import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Globe, ExternalLink, Star, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  builder: any;
}

const typeBadgeClass: Record<string, string> = {
  luxury: "bg-amber-500/90 text-amber-50",
  standard: "bg-blue-500/90 text-blue-50",
  budget: "bg-emerald-500/90 text-emerald-50",
};

const BuilderHeroSection = ({ builder }: Props) => {
  const navigate = useNavigate();
  const isLuxury = builder.type === "luxury";

  return (
    <div className={`relative ${isLuxury ? "h-[55vh] min-h-[420px]" : "h-[45vh] min-h-[320px]"} overflow-hidden`}>
      {builder.images?.[0] ? (
        <img src={builder.images[0]} alt={builder.builder_name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-muted" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

      <div className="absolute top-4 left-4 z-20">
        <Button variant="ghost" size="sm" className="bg-background/30 backdrop-blur-md text-foreground hover:bg-background/50" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
        <div className="container mx-auto flex items-end gap-5">
          {/* Logo */}
          <div className="hidden md:flex w-20 h-20 rounded-2xl bg-background shadow-xl items-center justify-center border overflow-hidden flex-shrink-0">
            {builder.logo ? (
              <img src={builder.logo} alt="" className="w-full h-full object-contain p-2" />
            ) : (
              <span className="text-2xl font-bold text-primary">{builder.builder_name?.[0]}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <Badge className={`${typeBadgeClass[builder.type] || ""} uppercase tracking-wider text-[10px] font-bold`}>
                {builder.type}
              </Badge>
              {builder.established_year && (
                <Badge variant="outline" className="bg-background/40 backdrop-blur-sm text-foreground border-border/50 text-[10px]">
                  Est. {builder.established_year}
                </Badge>
              )}
              {builder.customer_rating > 0 && (
                <Badge variant="outline" className="bg-background/40 backdrop-blur-sm text-foreground border-border/50 text-[10px] gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {builder.customer_rating}/5
                </Badge>
              )}
            </div>
            <h1 className={`font-bold text-foreground ${isLuxury ? "text-3xl md:text-5xl" : "text-2xl md:text-4xl"} leading-tight`}>
              {builder.builder_name}
            </h1>
            {builder.tagline && <p className="text-muted-foreground text-base md:text-lg mt-1">{builder.tagline}</p>}

            {builder.operating_cities?.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{builder.operating_cities.join(" • ")}</span>
              </div>
            )}
          </div>

          {builder.website && (
            <Button variant="outline" size="sm" className="hidden md:flex bg-background/60 backdrop-blur-sm" onClick={() => window.open(builder.website, "_blank")}>
              <Globe className="h-4 w-4 mr-1" /> Website <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuilderHeroSection;
