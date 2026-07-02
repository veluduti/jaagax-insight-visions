import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type PartnerCtx = {
  loading: boolean;
  userId: string | null;
  hotelId: string | null;
  hotelName: string;
  applicationId: string | null;
};

/**
 * Loads the current partner's approved hotel + gates access.
 * Redirects: not logged in → /partners/login; no app → /partners/kyc;
 * not approved → /partners/status; PMS not set → /partners/pms-setup.
 */
export function usePartnerHotel(opts: { requirePmsSetup?: boolean } = { requirePmsSetup: true }): PartnerCtx {
  const nav = useNavigate();
  const [ctx, setCtx] = useState<PartnerCtx>({
    loading: true, userId: null, hotelId: null, hotelName: "Your property", applicationId: null,
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav("/partners/login", { replace: true }); return; }

      const { data: app } = await (supabase as any)
        .from("hotel_partner_applications")
        .select("id,status,pms_setup_completed,hotel_name,approved_hotel_id")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();

      if (!app) { nav("/partners/kyc", { replace: true }); return; }
      if (app.status !== "approved") { nav("/partners/status", { replace: true }); return; }
      if (opts.requirePmsSetup && !app.pms_setup_completed) { nav("/partners/pms-setup", { replace: true }); return; }

      setCtx({
        loading: false,
        userId: user.id,
        hotelId: app.approved_hotel_id || null,
        hotelName: app.hotel_name || "Your property",
        applicationId: app.id,
      });
    })();
  }, [nav, opts.requirePmsSetup]);

  return ctx;
}
