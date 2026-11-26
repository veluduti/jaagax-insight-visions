import { useEffect, useState } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PropertyQrRedirect() {
  const { reference = "" } = useParams();
  const [target, setTarget] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const ref = decodeURIComponent(reference).trim().toUpperCase();
      const { data } = await (supabase as any).from("partner_hotels").select("id").eq("property_reference", ref).eq("is_active", true).maybeSingle();
      if (!alive) return;
      if (data?.id) setTarget(`/hotels/${data.id}`); else setMissing(true);
    })();
    return () => { alive = false; };
  }, [reference]);
  if (target) return <Navigate to={target} replace />;
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
      {missing ? (<><h1 className="text-xl font-semibold">Property not available</h1><p className="text-muted-foreground">Property ID {reference} isn’t live on Jaagax Stays right now.</p><Link to="/hotels" className="text-primary underline">Browse stays</Link></>) : (<><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="text-muted-foreground">Opening property…</p></>)}
    </main>
  );
}
