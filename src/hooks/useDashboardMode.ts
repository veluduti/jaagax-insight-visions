import { useEffect, useState } from "react";
import { modeStorageKey, resolveMode, type DashboardMode } from "@/config/dashboardModes";

export const DASHBOARD_MODE_EVENT = "partner-dashboard-mode";

export function setDashboardMode(hotelId: string, mode: DashboardMode) {
  localStorage.setItem(modeStorageKey(hotelId), mode);
  window.dispatchEvent(new Event(DASHBOARD_MODE_EVENT));
}

/** Active dashboard type for a property; follows the header selector instantly. */
export function useDashboardMode(hotelId: string | null | undefined, types: string[] | null | undefined): DashboardMode {
  const read = () => resolveMode(types, hotelId ? localStorage.getItem(modeStorageKey(hotelId)) : null);
  const [mode, setMode] = useState<DashboardMode>(read);
  const key = (types ?? []).join(",");
  useEffect(() => {
    setMode(read());
    const on = () => setMode(read());
    window.addEventListener(DASHBOARD_MODE_EVENT, on);
    return () => window.removeEventListener(DASHBOARD_MODE_EVENT, on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId, key]);
  return mode;
}
