import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ChevronRight, MapPin, Star, ShieldCheck } from "lucide-react";
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
  rating?: number;
  verified?: boolean;
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

  const topBuilder = builders[0];
  const restBuilders = builders.slice(1);

  return (
    <section className="py-xl px-md">
      <div className="container mx-auto space-y-8">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Featured Builders</h2>
          <Button variant="ghost" onClick={() => navigate("/builders")}>
            View All <ChevronRight />
          </Button>
        </div>

        {/* 🔥 TOP BUILDER (HERO CARD) */}
        {topBuilder && (
          <div
            onClick={() => navigate(`/builder-profile/${topBuilder.id}`)}
            className="relative h-[320px] rounded-3xl overflow-hidden cursor-pointer group"
          >
            <img
              src={topBuilder.images?.[0]}
              className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
            />

            {/* DARK OVERLAY */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

            {/* CONTENT */}
            <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-400 text-black">Top Builder</Badge>
                <Badge className="bg-white/20">Premium</Badge>
              </div>

              <h3 className="text-2xl font-bold">{topBuilder.builder_name}</h3>

              <p className="text-sm opacity-80 max-w-md">{topBuilder.tagline}</p>

              <div className="flex items-center gap-4 text-sm mt-2">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400" />
                  {topBuilder.rating || 4.5}
                </span>

                {topBuilder.verified && (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-green-400" />
                    Verified
                  </span>
                )}

                <span>{topBuilder.years_of_experience}+ yrs</span>
              </div>

              <div className="text-xl font-bold text-amber-300">
                Starts at {formatPrice(topBuilder.price_range_min)}
              </div>
            </div>
          </div>
        )}

        {/* OTHER BUILDERS */}
        <div className="flex gap-md overflow-x-auto pb-md">
          {restBuilders.map((b) => {
            const isLuxury = b.type === "luxury";
            const isStandard = b.type === "standard";
            const isBudget = b.type === "budget";

            return (
              <Card
                key={b.id}
                onClick={() => navigate(`/builder-profile/${b.id}`)}
                className={`
                  min-w-[300px] max-w-[340px] rounded-2xl overflow-hidden cursor-pointer group transition-all duration-500
                  hover:scale-[1.04]

                  ${isLuxury && "bg-black text-white border border-amber-500/30"}
                  ${isStandard && "bg-white"}
                  ${isBudget && "bg-emerald-50"}
                `}
              >
                {/* IMAGE */}
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={b.images?.[0]}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                  {/* BADGES */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {b.verified && <Badge className="bg-green-500 text-white text-xs">Verified</Badge>}
                    {isLuxury && <Badge className="bg-amber-400 text-black text-xs">Premium</Badge>}
                  </div>

                  {/* TITLE */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-bold">{b.builder_name}</h3>
                    <p className="text-xs opacity-80 line-clamp-1">{b.tagline}</p>
                  </div>
                </div>

                {/* DETAILS */}
                <div className="p-4 space-y-3">
                  {/* LOCATION */}
                  <div className="flex items-center gap-1 text-sm opacity-70">
                    <MapPin className="h-3.5 w-3.5" />
                    {b.locations?.[0]}
                  </div>

                  {/* STATS */}
                  <div className="flex justify-between text-xs opacity-70">
                    <span>{b.number_of_projects} Projects</span>
                    <span>{b.years_of_experience}+ yrs</span>
                  </div>

                  {/* PRICE */}
                  <div
                    className={`
                    font-bold text-lg
                    ${isLuxury && "text-amber-400"}
                    ${isBudget && "text-emerald-600"}
                  `}
                  >
                    From {formatPrice(b.price_range_min)}
                  </div>

                  {/* BUTTON */}
                  <Button className="w-full">
                    View Profile <ChevronRight className="ml-1 h-4 w-4" />
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
