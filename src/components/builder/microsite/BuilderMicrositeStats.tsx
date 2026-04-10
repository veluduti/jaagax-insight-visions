import { Building2, Calendar, TrendingUp, Users, Star, MapPin, Award, Layers } from "lucide-react";

interface Props {
  builder: any;
  tier: string;
}

const formatArea = (sqft: number | null) => {
  if (!sqft) return null;
  if (sqft >= 10000000) return `${(sqft / 10000000).toFixed(0)}M`;
  if (sqft >= 100000) return `${(sqft / 100000).toFixed(0)}L`;
  return sqft.toLocaleString("en-IN");
};

const formatPrice = (val: number | null) => {
  if (!val) return "N/A";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

const BuilderMicrositeStats = ({ builder, tier }: Props) => {
  const stats = [
    { label: "Completed", value: builder.completed_projects_count || 0, sub: "Projects", icon: Building2, gradient: "from-emerald-500 to-teal-500" },
    { label: "Ongoing", value: builder.ongoing_projects_count || 0, sub: "Projects", icon: TrendingUp, gradient: "from-blue-500 to-cyan-500" },
    { label: "Units Delivered", value: (builder.total_units_delivered || 0).toLocaleString("en-IN"), sub: "Homes", icon: Users, gradient: "from-violet-500 to-purple-500" },
    { label: "Experience", value: `${builder.years_of_experience || 0}+`, sub: "Years", icon: Calendar, gradient: "from-amber-500 to-orange-500" },
    { label: "Rating", value: builder.customer_rating || "—", sub: `${(builder.total_reviews || 0).toLocaleString()} reviews`, icon: Star, gradient: "from-yellow-500 to-amber-500" },
    { label: "Cities", value: builder.operating_cities?.length || 0, sub: "Active", icon: MapPin, gradient: "from-rose-500 to-pink-500" },
    { label: "Price Range", value: formatPrice(builder.price_range_min), sub: `to ${formatPrice(builder.price_range_max)}`, icon: Layers, gradient: "from-cyan-500 to-blue-500" },
    { label: "Land Developed", value: formatArea(builder.total_land_developed_sqft), sub: "sq ft", icon: Award, gradient: "from-indigo-500 to-violet-500" },
  ].filter((st) => st.value && st.value !== "N/A" && st.value !== "0" && st.value !== 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group relative p-4 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-300"
        >
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300`} />
          <div className="relative flex items-start gap-3">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${stat.gradient} opacity-80 flex-shrink-0`}>
              <stat.icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-white leading-none">{stat.value}</p>
              <p className="text-[11px] mt-1.5 text-zinc-400">{stat.label}</p>
              <p className="text-[10px] text-zinc-600">{stat.sub}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BuilderMicrositeStats;
