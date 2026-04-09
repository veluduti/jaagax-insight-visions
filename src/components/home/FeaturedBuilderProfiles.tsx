import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ChevronRight, MapPin, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BuilderProfile {
  id: string;
  builder_name: string;
  tagline: string | null;
  type: string;
  price_range_min: number | null;
  price_range_max: number | null;
  images: string[];
  locations: string[];
  number_of_projects: number | null;
  years_of_experience: number | null;
}

const typeGradient: Record<string, string> = {
  luxury: "from-amber-400/60 via-purple-500/40 to-amber-600/60",
  standard: "from-blue-400/50 via-sky-500/40 to-blue-600/50",
  budget: "from-emerald-400/50 via-green-500/40 to-emerald-600/50",
};

const typeBadgeClass: Record<string, string> = {
  luxury: "bg-amber-500/90 text-amber-50",
  standard: "bg-blue-500/90 text-blue-50",
  budget: "bg-emerald-500/90 text-emerald-50",
};

const formatPrice = (val: number | null) => {
  if (!val) return null;
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

const FeaturedBuilderProfiles = () => {
  const [builders, setBuilders] = useState<BuilderProfile[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBuilders = async () => {
      const { data } = await supabase
        .from("builder_profiles" as any)
        .select("id, builder_name, tagline, type, price_range_min, price_range_max, images, locations, number_of_projects, years_of_experience")
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setBuilders(data as any);
    };
    fetchBuilders();
  }, []);

  if (builders.length === 0) return null;

  return (
    <section className="py-xl px-md">
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-lg">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold">Featured Builders</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/builders")}>
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="flex gap-md overflow-x-auto pb-md snap-x snap-mandatory scrollbar-hide">
          {builders.map((b) => (
            <Card
              key={b.id}
              onClick={() => navigate(`/builder-profile/${b.id}`)}
              className={`relative min-w-[300px] max-w-[340px] snap-start cursor-pointer overflow-hidden rounded-2xl border-0 group transition-all duration-300 hover:scale-[1.03] hover:shadow-xl`}
            >
              {/* Gradient border effect */}
              <div className={`absolute inset-0 bg-gradient-to-br ${typeGradient[b.type] || typeGradient.standard} opacity-60 rounded-2xl`} />
              <div className="absolute inset-[2px] bg-card rounded-2xl" />

              {/* Content */}
              <div className="relative z-10">
                {/* Image */}
                <div className="relative h-44 overflow-hidden rounded-t-2xl">
                  {b.images?.[0] ? (
                    <img src={b.images[0]} alt={b.builder_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <Building2 className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />

                  {/* Type Badge */}
                  <Badge className={`absolute top-3 right-3 ${typeBadgeClass[b.type] || ""} text-xs font-semibold uppercase tracking-wider`}>
                    {b.type}
                  </Badge>

                  {/* Name overlay */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="text-lg font-bold text-primary-foreground leading-tight">{b.builder_name}</h3>
                    {b.tagline && <p className="text-xs text-primary-foreground/80 mt-0.5 line-clamp-1">{b.tagline}</p>}
                  </div>
                </div>

                {/* Details */}
                <div className="p-md space-y-2">
                  {b.locations?.length > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="line-clamp-1">{b.locations.slice(0, 2).join(", ")}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {b.number_of_projects ? (
                        <span className="flex items-center gap-1"><Star className="h-3 w-3" />{b.number_of_projects} Projects</span>
                      ) : null}
                      {b.years_of_experience ? <span>{b.years_of_experience}+ yrs</span> : null}
                    </div>
                    {b.price_range_min && (
                      <span className="text-sm font-semibold text-primary">
                        From {formatPrice(b.price_range_min)}
                      </span>
                    )}
                  </div>

                  <Button variant="outline" size="sm" className="w-full mt-1 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    Explore Builder <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedBuilderProfiles;
