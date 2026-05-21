import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  SavedLocation,
  LocationMode,
  clearSavedLocationFromStorage,
  readSavedLocationFromStorage,
  reverseGeocode,
  writeSavedLocationToStorage,
  readLocationModeFromStorage,
  writeLocationModeToStorage,
  clearLocationModeFromStorage,
} from "@/lib/savedLocation";
import { canonicalizeCity, getCityAliases } from "@/lib/cityNormalizer";

interface UseSavedLocationReturn {
  savedLocation: SavedLocation | null;
  isResolvingGps: boolean;
  hasLocation: boolean;
  locationMode: LocationMode | null;
  /** True when app wants to ask the user (via in-app dialog) for permission to use GPS. */
  pendingGpsPrompt: boolean;
  /** Dismiss the in-app prompt without invoking the browser API. */
  dismissGpsPrompt: (remember?: boolean) => void;
  selectLocation: (loc: Omit<SavedLocation, "last_updated"> & Partial<Pick<SavedLocation, "last_updated">>) => Promise<void>;
  /** USER-INITIATED only. Must be called from a user-gesture event handler. */
  requestGpsLocation: () => Promise<void>;
  clearLocation: () => Promise<void>;
  disableLocation: () => Promise<void>;
  /** DEV-ONLY: wipe saved location/mode and re-show the in-app prompt for testing. */
  resetLocationForTesting: () => void;
}

/**
 * Manages the user's saved browsing location and their location-mode preference.
 *
 * Priority on app load: localStorage > backend profile.
 * IMPORTANT: This hook NEVER auto-prompts GPS permission unless mode is unset.
 * If the user has explicitly chosen 'disabled' or 'manual', no auto-prompt occurs.
 */
export const useSavedLocation = (): UseSavedLocationReturn => {
  const [savedLocation, setSavedLocation] = useState<SavedLocation | null>(() =>
    readSavedLocationFromStorage()
  );
  const [locationMode, setLocationModeState] = useState<LocationMode | null>(() =>
    readLocationModeFromStorage()
  );
  const [isResolvingGps, setIsResolvingGps] = useState(false);
  const profileSyncedRef = useRef(false);

  const setMode = useCallback((mode: LocationMode) => {
    writeLocationModeToStorage(mode);
    setLocationModeState(mode);
  }, []);

  const normalizeSavedLocation = useCallback((loc: SavedLocation): SavedLocation => {
    const canonicalCity = canonicalizeCity(loc.city);
    const aliases = getCityAliases(canonicalCity);
    const displayCity = aliases.find((alias) => alias === alias.charAt(0).toUpperCase() + alias.slice(1)) || loc.city;

    return {
      ...loc,
      city: displayCity || loc.city,
      area: loc.area || "",
    };
  }, []);

  // On mount + auth changes: if no localStorage value, try backend profile.
  useEffect(() => {
    let cancelled = false;

    const loadFromBackend = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Only fall back to backend if local cache is empty.
      if (readSavedLocationFromStorage()) {
        profileSyncedRef.current = true;
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("location_data")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (cancelled || error || !data?.location_data) return;
      const ld = data.location_data as Partial<SavedLocation>;
      if (typeof ld.city !== "string" || !ld.city) return;

      const next: SavedLocation = {
        latitude: typeof ld.latitude === "number" ? ld.latitude : null,
        longitude: typeof ld.longitude === "number" ? ld.longitude : null,
        city: ld.city,
        area: typeof ld.area === "string" ? ld.area : "",
        last_updated: ld.last_updated || new Date().toISOString(),
      };
      const normalizedNext = normalizeSavedLocation(next);
      writeSavedLocationToStorage(normalizedNext);
      setSavedLocation(normalizedNext);
      profileSyncedRef.current = true;
    };

    loadFromBackend();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      profileSyncedRef.current = false;
      loadFromBackend();

      // Auto-prompt GPS exactly once after sign-in IF the user has no preference set
      // and no saved location. If mode is 'disabled' or 'manual', never auto-prompt.
      if (event === "SIGNED_IN") {
        setTimeout(() => {
          if (cancelled) return;
          const currentMode = readLocationModeFromStorage();
          if (currentMode === "disabled" || currentMode === "manual") return;
          if (readSavedLocationFromStorage()) return;
          const promptedKey = "jaagax_gps_auto_prompted";
          if (sessionStorage.getItem(promptedKey)) return;
          sessionStorage.setItem(promptedKey, "1");
          // Fire-and-forget; user can still pick manually if they deny.
          void requestGpsRef.current?.();
        }, 600);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Ref so the auth listener can call the latest requestGpsLocation without re-subscribing.
  const requestGpsRef = useRef<null | (() => Promise<void>)>(null);

  const persistToBackend = useCallback(async (loc: SavedLocation | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase
        .from("profiles")
        .update({ location_data: loc as any })
        .eq("user_id", session.user.id);
    } catch (err) {
      console.warn("Failed to persist location to profile:", err);
    }
  }, []);

  const selectLocation = useCallback<UseSavedLocationReturn["selectLocation"]>(
    async (loc) => {
      const next: SavedLocation = {
        latitude: loc.latitude ?? null,
        longitude: loc.longitude ?? null,
        city: loc.city,
        area: loc.area || "",
        last_updated: loc.last_updated || new Date().toISOString(),
      };
      const normalizedNext = normalizeSavedLocation(next);
      writeSavedLocationToStorage(normalizedNext);
      setSavedLocation(normalizedNext);
      setMode("manual");
      void persistToBackend(normalizedNext);
    },
    [normalizeSavedLocation, persistToBackend, setMode]
  );

  const requestGpsLocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      toast.error("Your browser does not support location access. Please search manually.");
      return;
    }

    setIsResolvingGps(true);
    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const geo = await reverseGeocode(latitude, longitude);
          const next: SavedLocation = {
            latitude,
            longitude,
            city: geo?.city || "Unknown",
            area: geo?.area || "",
            last_updated: new Date().toISOString(),
          };
          const normalizedNext = normalizeSavedLocation(next);
          writeSavedLocationToStorage(normalizedNext);
          setSavedLocation(normalizedNext);
          setMode("gps");
          void persistToBackend(normalizedNext);
          toast.success(`Location set to ${normalizedNext.city}${normalizedNext.area ? `, ${normalizedNext.area}` : ""}`);
          setIsResolvingGps(false);
          resolve();
        },
        (err) => {
          setIsResolvingGps(false);
          if (err.code === err.PERMISSION_DENIED) {
            // User denied — remember so we don't re-prompt.
            setMode("disabled");
            toast.error("Location permission denied. You can pick a city manually.");
          } else if (err.code === err.TIMEOUT) {
            toast.error("Could not get your location in time. Please search manually.");
          } else {
            toast.error("Could not get your location. Please search manually.");
          }
          resolve();
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
      );
    });
  }, [normalizeSavedLocation, persistToBackend, setMode]);

  // Keep a ref to the latest requestGpsLocation so the auth listener can call it.
  useEffect(() => {
    requestGpsRef.current = requestGpsLocation;
  }, [requestGpsLocation]);

  const clearLocation = useCallback(async () => {
    clearSavedLocationFromStorage();
    setSavedLocation(null);
    void persistToBackend(null);
  }, [persistToBackend]);

  const disableLocation = useCallback(async () => {
    clearSavedLocationFromStorage();
    setSavedLocation(null);
    setMode("disabled");
    void persistToBackend(null);
    toast.success("Location turned off");
  }, [persistToBackend, setMode]);

  return {
    savedLocation,
    isResolvingGps,
    hasLocation: !!savedLocation,
    locationMode,
    selectLocation,
    requestGpsLocation,
    clearLocation,
    disableLocation,
  };
};
