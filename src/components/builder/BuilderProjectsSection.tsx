import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
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
    <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06]">
      <h2 className="text-sm font-semibold flex items-center gap-2 mb-4 text-zinc-200">
        <Building2 className="h-4 w-4 text-violet-400" /> Projects by {builderName}
      </h2>
      <div className="space-y-2">
        {projects.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-violet-500/20 hover:bg-violet-500/[0.02] transition-all cursor-pointer group"
            onClick={() => navigate(`/projects/${p.id}`)}
          >
            <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.04] border border-white/[0.04]">
              {p.image || p.images?.[0] ? (
                <img src={p.image || p.images[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-zinc-700" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-zinc-200 truncate group-hover:text-violet-300 transition-colors">{p.name}</h4>
              <div className="flex items-center gap-1 text-xs text-zinc-500 mt-0.5">
                <MapPin className="h-3 w-3" />
                {p.locality}, {p.city}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {p.status && <Badge variant="outline" className="text-[10px] h-5 border-white/[0.06] text-zinc-500">{p.status}</Badge>}
                {p.price_min && <span className="text-xs font-medium text-violet-400">{formatPrice(p.price_min)} - {formatPrice(p.price_max)}</span>}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default BuilderProjectsSection;
