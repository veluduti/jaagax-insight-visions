import { Card, CardContent } from "@/components/ui/card";
import { Building2, Calendar, TrendingUp, Users, Star, MapPin, Award, Layers } from "lucide-react";

interface Props {
  builder: any;
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

const BuilderStatsGrid = ({ builder }: Props) => {
  const stats = [
    { label: "Completed", value: builder.completed_projects_count || 0, sub: "Projects", icon: Building2, color: "text-emerald-500" },
    { label: "Ongoing", value: builder.ongoing_projects_count || 0, sub: "Projects", icon: TrendingUp, color: "text-blue-500" },
    { label: "Units Delivered", value: (builder.total_units_delivered || 0).toLocaleString("en-IN"), sub: "Homes", icon: Users, color: "text-purple-500" },
    { label: "Experience", value: `${builder.years_of_experience || 0}+`, sub: "Years", icon: Calendar, color: "text-amber-500" },
    { label: "Rating", value: builder.customer_rating || "—", sub: `${(builder.total_reviews || 0).toLocaleString()} reviews`, icon: Star, color: "text-yellow-500" },
    { label: "Cities", value: builder.operating_cities?.length || 0, sub: "Active", icon: MapPin, color: "text-rose-500" },
    { label: "Price Range", value: formatPrice(builder.price_range_min), sub: `to ${formatPrice(builder.price_range_max)}`, icon: Layers, color: "text-cyan-500" },
    { label: "Land Developed", value: formatArea(builder.total_land_developed_sqft), sub: "sq ft", icon: Award, color: "text-indigo-500" },
  ].filter(s => s.value && s.value !== "N/A" && s.value !== "0" && s.value !== 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30">
          <CardContent className="p-4 flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-muted/80 ${stat.color} group-hover:scale-110 transition-transform`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
              <p className="text-[10px] text-muted-foreground/70">{stat.sub}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BuilderStatsGrid;
