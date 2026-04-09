import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ChevronRight, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  builderName: string;
}

const formatPrice = (val: number | null) => {
  if (!val) return "";
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  return `₹${val.toLocaleString("en-IN")}`;
};

const BuilderProjectsSection = ({ builderName }: Props) => {
  const [projects, setProjects] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .ilike("builder_name", `%${builderName}%`)
        .limit(20);
      if (data) setProjects(data);
    };
    if (builderName) fetch();
  }, [builderName]);

  if (projects.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" /> Projects by {builderName}
        </h2>
        <div className="space-y-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 p-3 rounded-xl border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                {p.image || p.images?.[0] ? (
                  <img src={p.image || p.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">{p.name}</h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {p.locality}, {p.city}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {p.status && <Badge variant="outline" className="text-[10px] h-5">{p.status}</Badge>}
                  {p.price_min && <span className="text-xs font-medium text-primary">{formatPrice(p.price_min)} - {formatPrice(p.price_max)}</span>}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BuilderProjectsSection;
