import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import LuxuryMicrosite from "@/components/builder/microsite/LuxuryMicrosite";
import StandardMicrosite from "@/components/builder/microsite/StandardMicrosite";
import BudgetMicrosite from "@/components/builder/microsite/BudgetMicrosite";

const BuilderProfileDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [builder, setBuilder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBuilder = async () => {
      const { data } = await supabase.from("builder_profiles" as any).select("*").eq("id", id).single();
      setBuilder(data as any);
      setLoading(false);
    };
    if (id) fetchBuilder();
  }, [id]);

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

  // Determine tier
  const tier = (builder.type as string) || "standard";

  // Route to completely different UI per tier
  if (tier === "luxury") return <LuxuryMicrosite builder={builder} />;
  if (tier === "budget") return <BudgetMicrosite builder={builder} />;
  return <StandardMicrosite builder={builder} />;
};

export default BuilderProfileDetail;
