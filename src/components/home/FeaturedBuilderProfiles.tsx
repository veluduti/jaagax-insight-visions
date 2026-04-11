import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { MapPin, Star, ChevronRight } from "lucide-react";

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
  if (!val) return "";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

export default function FeaturedBuilderProfiles() {
  const [builders, setBuilders] = useState<BuilderProfile[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("builder_profiles" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => data && setBuilders(data as any));
  }, []);

  if (!builders.length) return null;

  return (
    <section className="py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Featured Builders</h2>
          <button
            onClick={() => navigate("/builders")}
            className="text-sm flex items-center gap-1 text-muted-foreground hover:text-black"
          >
            View All <ChevronRight size={16} />
          </button>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {builders.map((b) => {
            const isLuxury = b.type === "luxury";
            const isStandard = b.type === "standard";
            const isBudget = b.type === "budget";

            return (
              <div
                key={b.id}
                onClick={() => navigate(`/builder-profile/${b.id}`)}
                className={`
                  group cursor-pointer rounded-2xl overflow-hidden transition-all duration-500

                  ${isLuxury && "bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)]"}
                  ${isStandard && "bg-white border border-gray-200 hover:shadow-md"}
                  ${isBudget && "bg-gray-50 border border-gray-200 hover:shadow-sm"}
                `}
              >
                {/* IMAGE */}
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={b.images?.[0]}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                  />

                  {/* SOFT OVERLAY */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                  {/* TYPE TAG */}
                  <div
                    className={`
                    absolute top-3 left-3 text-[10px] px-2 py-1 rounded-full font-medium backdrop-blur-sm

                    ${isLuxury && "bg-white/90 text-black"}
                    ${isStandard && "bg-black/70 text-white"}
                    ${isBudget && "bg-white/80 text-gray-700"}
                  `}
                  >
                    {isLuxury ? "Premium" : b.type}
                  </div>

                  {/* TITLE */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-semibold text-sm leading-tight">{b.builder_name}</h3>
                    <p className="text-xs opacity-80 line-clamp-1">{b.tagline}</p>
                  </div>
                </div>

                {/* CONTENT */}
                <div className="p-3 space-y-2">
                  {/* LOCATION */}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin size={12} />
                    {b.locations?.[0]}
                  </div>

                  {/* STATS */}
                  <div className="flex justify-between text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Star size={12} />
                      {b.number_of_projects}
                    </span>
                    <span>{b.years_of_experience}+ yrs</span>
                  </div>

                  {/* PRICE */}
                  <div
                    className={`
                    text-sm font-semibold

                    ${isLuxury && "text-black"}
                    ${isStandard && "text-black"}
                    ${isBudget && "text-gray-700"}
                  `}
                  >
                    From {formatPrice(b.price_range_min)}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between text-xs font-medium text-gray-600 group-hover:text-black">
                    View Profile <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
