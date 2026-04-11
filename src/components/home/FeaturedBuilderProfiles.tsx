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
  images: string[];
  locations: string[];
  number_of_projects: number | null;
  years_of_experience: number | null;
}

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
        .select("*")
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
          <h2 className="text-3xl font-bold">Featured Builders</h2>
          <Button variant="ghost" onClick={() => navigate("/builders")}>
            View All <ChevronRight className="ml-1" />
          </Button>
        </div>

        <div className="flex gap-md overflow-x-auto pb-md snap-x">
          {builders.map((b) => {
            const isLuxury = b.type === "luxury";
            const isStandard = b.type === "standard";
            const isBudget = b.type === "budget";

            return (
              <Card
                key={b.id}
                onClick={() => navigate(`/builder-profile/${b.id}`)}
                className={`
                  min-w-[300px] max-w-[340px] snap-start cursor-pointer overflow-hidden rounded-2xl transition-all duration-500 group
                  
                  ${isLuxury && "bg-black text-white border border-amber-500/30 hover:shadow-[0_0_40px_rgba(255,215,0,0.2)]"}
                  ${isStandard && "bg-white hover:shadow-xl"}
                  ${isBudget && "bg-emerald-50 hover:shadow-lg"}
                `}
              >
                {/* IMAGE */}
                <div className="relative h-48 overflow-hidden">
                  {b.images?.[0] ? (
                    <img
                      src={b.images[0]}
                      alt={b.builder_name}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Building2 className="h-10 w-10 opacity-40" />
                    </div>
                  )}

                  {/* OVERLAY */}
                  <div
                    className={`
                    absolute inset-0 
                    ${isLuxury ? "bg-gradient-to-t from-black/90 via-black/30" : ""}
                    ${isStandard ? "bg-gradient-to-t from-black/60 via-transparent" : ""}
                    ${isBudget ? "bg-gradient-to-t from-emerald-900/40 via-transparent" : ""}
                  `}
                  />

                  {/* TYPE BADGE */}
                  <Badge
                    className={`
                    absolute top-3 right-3 uppercase text-xs

                    ${isLuxury && "bg-amber-500 text-black"}
                    ${isStandard && "bg-blue-500 text-white"}
                    ${isBudget && "bg-emerald-500 text-white"}
                  `}
                  >
                    {isLuxury ? "Premium" : b.type}
                  </Badge>

                  {/* TITLE */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <h3 className="font-bold text-lg">{b.builder_name}</h3>
                    {b.tagline && <p className="text-xs opacity-80 line-clamp-1">{b.tagline}</p>}
                  </div>
                </div>

                {/* DETAILS */}
                <div
                  className={`
                  p-4 space-y-3

                  ${isLuxury && "bg-white/5 backdrop-blur-md"}
                  ${isStandard && ""}
                  ${isBudget && ""}
                `}
                >
                  {/* LOCATION */}
                  {b.locations?.length > 0 && (
                    <div className="flex items-center gap-1 text-sm opacity-80">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{b.locations[0]}</span>
                    </div>
                  )}

                  {/* STATS */}
                  <div className="flex justify-between text-xs opacity-80">
                    {b.number_of_projects && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3" />
                        {b.number_of_projects} Projects
                      </span>
                    )}
                    {b.years_of_experience && <span>{b.years_of_experience}+ yrs</span>}
                  </div>

                  {/* PRICE */}
                  {b.price_range_min && (
                    <div
                      className={`
                      text-lg font-bold

                      ${isLuxury && "text-amber-400"}
                      ${isStandard && "text-primary"}
                      ${isBudget && "text-emerald-600"}
                    `}
                    >
                      ₹ {formatPrice(b.price_range_min)}
                    </div>
                  )}

                  {/* BUTTON */}
                  <Button
                    className={`
                      w-full mt-2 transition-all

                      ${isLuxury && "bg-amber-500 text-black hover:bg-amber-400"}
                      ${isStandard && ""}
                      ${isBudget && "bg-emerald-500 hover:bg-emerald-600 text-white"}
                    `}
                  >
                    Explore <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedBuilderProfiles;
