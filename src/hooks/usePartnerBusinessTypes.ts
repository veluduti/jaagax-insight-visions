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
      let list: string[] = data?.business_types?.length
        ? data.business_types
        : data?.business_type ? String(data.business_type).split(",") : [];
      let hid: string | null = data?.approved_hotel_id ?? null;
      if (!list.length) {
        const { data: h } = await (supabase as any).from("partner_hotels")
          .select("id,business_types").eq("manager_id", user.id).order("created_at").limit(1).maybeSingle();
        if (h?.business_types?.length) list = h.business_types;
        hid = hid ?? h?.id ?? null;
      }
      if (!alive) return;
      setTypes(Array.from(new Set(list.map(normalizeCategory))));
      setAppId(data?.id ?? null);
      setHotelId(hid);
    })();
    return () => { alive = false; };
  }, []);

  const save = async (next: string[]) => {
    setTypes(next);
    if (appId) await (supabase as any).from("hotel_partner_applications").update({ business_types: next }).eq("id", appId);
    if (hotelId) await (supabase as any).from("partner_hotels").update({ business_types: next }).eq("id", hotelId);
  };

  const modules: Set<PartnerModule> = modulesFor(types);
  const inventoryLabel = [
    modules.has("rooms") && "Rooms",
    modules.has("beds") && "Beds",
    modules.has("units") && "Units",
  ].filter(Boolean).join(", ") || "Rooms";

  return { types, modules, inventoryLabel, hotelId, save };
}
