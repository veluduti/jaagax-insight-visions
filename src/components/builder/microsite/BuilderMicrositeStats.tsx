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

const tierStyles = {
  luxury: {
    card: "bg-[#0f1510]/80 backdrop-blur-md border border-[#2a3a20]/40 rounded-2xl hover:border-[#c8b882]/20 hover:shadow-[0_8px_30px_rgba(200,184,130,0.06)]",
    iconBg: "bg-[#1a2a14] border border-[#2a3a20]/30",
    value: "text-[#c8b882]",
    label: "text-[#6a7a60]",
    sub: "text-[#5a6a50]",
  },
  standard: {
    card: "bg-white/80 dark:bg-[#141a12]/60 backdrop-blur-md border border-[#d4e0d0] dark:border-[#1e2e1a]/50 rounded-2xl hover:border-[#2a5a24]/30 hover:shadow-[0_8px_30px_rgba(42,90,36,0.08)]",
    iconBg: "bg-[#eaf2e8] dark:bg-[#1a2a14] border border-[#d4e0d0] dark:border-[#2a3a20]/30",
    value: "text-[#2a3a28] dark:text-[#d0daca]",
    label: "text-[#6b7b68]",
    sub: "text-[#8a9a86]",
  },
  budget: {
    card: "bg-white dark:bg-slate-800/60 border border-blue-100 dark:border-blue-800/30 rounded-2xl hover:border-blue-300 hover:shadow-md",
    iconBg: "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30",
    value: "text-slate-800 dark:text-white",
    label: "text-slate-500",
    sub: "text-slate-400",
  },
};

const BuilderMicrositeStats = ({ builder, tier }: Props) => {
  const s = tierStyles[tier as keyof typeof tierStyles] || tierStyles.standard;

  const stats = [
    { label: "Completed", value: builder.completed_projects_count || 0, sub: "Projects", icon: Building2, color: "text-emerald-500" },
    { label: "Ongoing", value: builder.ongoing_projects_count || 0, sub: "Projects", icon: TrendingUp, color: "text-blue-500" },
    { label: "Units Delivered", value: (builder.total_units_delivered || 0).toLocaleString("en-IN"), sub: "Homes", icon: Users, color: "text-purple-500" },
    { label: "Experience", value: `${builder.years_of_experience || 0}+`, sub: "Years", icon: Calendar, color: tier === "luxury" ? "text-[#c8b882]" : "text-amber-500" },
    { label: "Rating", value: builder.customer_rating || "—", sub: `${(builder.total_reviews || 0).toLocaleString()} reviews`, icon: Star, color: "text-yellow-500" },
    { label: "Cities", value: builder.operating_cities?.length || 0, sub: "Active", icon: MapPin, color: "text-rose-500" },
    { label: "Price Range", value: formatPrice(builder.price_range_min), sub: `to ${formatPrice(builder.price_range_max)}`, icon: Layers, color: "text-cyan-500" },
    { label: "Land Developed", value: formatArea(builder.total_land_developed_sqft), sub: "sq ft", icon: Award, color: "text-indigo-500" },
  ].filter((st) => st.value && st.value !== "N/A" && st.value !== "0" && st.value !== 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className={cn("p-4 flex items-start gap-3 transition-all duration-300 group", s.card)}>
          <div className={cn("p-2.5 rounded-xl flex-shrink-0 transition-transform group-hover:scale-110", s.iconBg, stat.color)}>
            <stat.icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className={cn("text-xl font-bold leading-none", s.value)}>{stat.value}</p>
            <p className={cn("text-[11px] mt-1", s.label)}>{stat.label}</p>
            <p className={cn("text-[10px]", s.sub)}>{stat.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BuilderMicrositeStats;
