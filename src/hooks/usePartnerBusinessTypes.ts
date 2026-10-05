import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { modulesFor, normalizeCategory, type PartnerModule } from "@/config/hospitalityCategories";

/** Loads the signed-in partner's selected business types and derived dashboard modules. */
export function usePartnerBusinessTypes() {
  const [types, setTypes] = useState<string[]>([]);
  const [appId, setAppId] = useState<string | null>(null);
  const [hotelId, setHotelId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from("hotel_partner_applications")
        .select("id,business_types,business_type,approved_hotel_id")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!alive || !data) return;
      const list: string[] = data.business_types?.length
        ? data.business_types
        : data.business_type ? String(data.business_type).split(",").map(normalizeCategory) : [];
      setTypes(list);
      setAppId(data.id);
      setHotelId(data.approved_hotel_id ?? null);
    })();
    return () => { alive = false; };
  }, []);

  const save = async (next: string[]) => {
    if (!appId) return;
    setTypes(next);
    await (supabase as any).from("hotel_partner_applications").update({ business_types: next }).eq("id", appId);
  };

  const modules: Set<PartnerModule> = modulesFor(types);
  const inventoryLabel = [
    modules.has("rooms") && "Rooms",
    modules.has("beds") && "Beds",
    modules.has("units") && "Units",
  ].filter(Boolean).join(", ") || "Rooms";

  return { types, modules, inventoryLabel, hotelId, save };
}
