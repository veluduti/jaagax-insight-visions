import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import LuxuryMicrosite from "@/components/builder/microsite/LuxuryMicrosite";
import StandardMicrosite from "@/components/builder/microsite/StandardMicrosite";
import BudgetMicrosite from "@/components/builder/microsite/BudgetMicrosite";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BuilderProfileDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [builder, setBuilder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBuilder = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      // Look up by slug first; fall back to id for legacy links
      let { data } = await supabase
        .from("builder_profiles" as any)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!data && UUID_RE.test(slug)) {
        const res = await supabase
          .from("builder_profiles" as any)
          .select("*")
          .eq("id", slug)
          .maybeSingle();
        data = res.data;
        // Redirect legacy UUID URL to the SEO-friendly slug
        if (data && (data as any).slug) {
          navigate(`/builder-profile/${(data as any).slug}`, { replace: true });
          return;
        }
      }

      setBuilder(data as any);
      setLoading(false);
    };
    fetchBuilder();
  }, [slug, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading builder profile...</p>
        </div>
      </div>
    );
  }

  if (!builder) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Builder Not Found</h1>
        <Button onClick={() => navigate("/")} className="rounded-xl">Go Home</Button>
      </div>
    );
  }

  const tier = (builder.type as string) || "standard";

  if (tier === "luxury") return <LuxuryMicrosite builder={builder} />;
  if (tier === "budget") return <BudgetMicrosite builder={builder} />;
  return <StandardMicrosite builder={builder} />;
};

export default BuilderProfileDetail;
