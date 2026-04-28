// Centralized type + helpers for the user's saved browsing location.
// Persisted in localStorage (mandatory) and synced to profiles.location_data when logged in.

export interface SavedLocation {
  latitude: number | null;
  longitude: number | null;
  city: string;
  area: string;
  last_updated: string; // ISO timestamp
}

const STORAGE_KEY = "jaagax_saved_location_v1";

export const readSavedLocationFromStorage = (): SavedLocation | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.city !== "string" || !parsed.city) return null;
    return {
      latitude: typeof parsed.latitude === "number" ? parsed.latitude : null,
      longitude: typeof parsed.longitude === "number" ? parsed.longitude : null,
      city: parsed.city,
      area: typeof parsed.area === "string" ? parsed.area : "",
      last_updated: parsed.last_updated || new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export const writeSavedLocationToStorage = (loc: SavedLocation) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
  } catch {
    /* quota or private mode */
  }
};

export const clearSavedLocationFromStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

// Reverse geocode lat/lng -> { city, area } using OpenStreetMap Nominatim (no API key).
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<{ city: string; area: string } | null> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const a = data.address || {};
    const city =
      a.city || a.town || a.village || a.county || a.state_district || a.state || "Unknown";
    const area =
      a.suburb || a.neighbourhood || a.city_district || a.locality || a.road || "";
    return { city, area };
  } catch {
    return null;
  }
};
