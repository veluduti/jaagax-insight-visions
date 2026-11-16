import { useContext, useEffect, useState } from "react";
import { PartnerWorkspaceContext } from "@/contexts/PartnerWorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { modulesFor, normalizeCategory, type PartnerModule } from "@/config/hospitalityCategories";

const ACTIVE_KEY = "partner_active_business_type";
const ACTIVE_EVT = "partner-active-type-change";

/** Loads the signed-in partner's selected business types and derived dashboard modules. */
export function usePartnerBusinessTypes() {
  const workspace = useContext(PartnerWorkspaceContext);
  const [types, setTypes] = useState<string[]>([]);
  const [appId, setAppId] = useState<string | null>(null);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [activeType, setActiveTypeState] = useState<string>(() => localStorage.getItem(ACTIVE_KEY) || "all");

  useEffect(() => {
    const sync = () => setActiveTypeState(localStorage.getItem(ACTIVE_KEY) || "all");
    window.addEventListener(ACTIVE_EVT, sync);
    return () => window.removeEventListener(ACTIVE_EVT, sync);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if(workspace?.hotelId) {
        const {data:h}=await (supabase as any).from("partner_hotels").select("business_types").eq("id",workspace.hotelId).single();
        if(!alive)return;
        setTypes(Array.from(new Set((h?.business_types ?? []).map(normalizeCategory))) as string[]);
        setHotelId(workspace.hotelId);setAppId(null);return;
      }
      const { data } = await (supabase as any)
        .from("hotel_partner_applications")
        .select("id,business_types,business_type,approved_hotel_id")
        .eq("user_id", user.id).is("setup_hotel_id",null).order("created_at", { ascending: false }).limit(1).maybeSingle();
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
  }, [workspace?.hotelId]);

  const save = async (next: string[]) => {
    setTypes(next);
    if (appId) await (supabase as any).from("hotel_partner_applications").update({ business_types: next }).eq("id", appId);
    if (hotelId) await (supabase as any).from("partner_hotels").update({ business_types: next }).eq("id", hotelId);
  };

  const setActiveType = (t: string) => {
    localStorage.setItem(ACTIVE_KEY, t);
    window.dispatchEvent(new Event(ACTIVE_EVT));
  };

  const effectiveActive = activeType !== "all" && types.includes(activeType) ? activeType : "all";
  const scoped = effectiveActive === "all" ? types : [effectiveActive];
  const modules: Set<PartnerModule> = modulesFor(scoped);
  const inventoryLabel = [
    modules.has("rooms") && "Rooms",
    modules.has("beds") && "Beds",
    modules.has("units") && "Units",
  ].filter(Boolean).join(", ") || "Rooms";

  return { types, modules, inventoryLabel, hotelId, save, activeType: effectiveActive, setActiveType };
}
