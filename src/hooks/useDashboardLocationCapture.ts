import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type CapturedLocation = {
  latitude: number;
  longitude: number;
  capturedAt: string;
};

const SESSION_KEY = "jaagax.dashboardLocationCaptured";

/**
 * Non-blocking geolocation capture for dashboard entry.
 * Requests permission once per session, stores lat/lng + capturedAt on the
 * user profile, and never blocks the dashboard when permission is denied.
 */
export function useDashboardLocationCapture(enabled = true) {
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "unavailable">("idle");

  useEffect(() => {
    if (!enabled) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }

    sessionStorage.setItem(SESSION_KEY, "1");
    setStatus("requesting");

    const timer = window.setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const captured: CapturedLocation = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            capturedAt: new Date().toISOString(),
          };
          setLocation(captured);
          setStatus("granted");
          try {
            localStorage.setItem("jaagax.lastCoords", JSON.stringify(captured));
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              await supabase
                .from("profiles" as any)
                .update({ location_data: captured as any })
                .eq("user_id", user.id);
            }
          } catch (e) {
            console.warn("Could not save location to profile", e);
          }
        },
        (err) => {
          setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
          toast.info(
            err.code === err.PERMISSION_DENIED
              ? "Location is off — you can enable it any time for nearby results."
              : "We couldn't detect your location. You can set it manually any time.",
          );
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
      );
    }, 800);

    return () => window.clearTimeout(timer);
  }, [enabled]);

  return { location, status };
}
