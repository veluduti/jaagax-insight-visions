/**
 * Google Maps JavaScript API loader.
 *
 * Loads the Maps JS API exactly once with `loading=async` and a global
 * callback, using the connector-provided browser key. Subsequent callers
 * await the same promise.
 *
 * The browser key is `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` and is
 * referrer-restricted to *.lovable.app / *.lovableproject.com (and any custom
 * domain the user later configures in Google Cloud). It is only authorized
 * for Maps JS + Places API (New) browser surfaces. Server-side APIs
 * (Geocoding, Routes, etc.) must go through the connector gateway.
 */

const CALLBACK_NAME = "__lovableGmapsInit";
const SCRIPT_ID = "lovable-google-maps-js";

let loaderPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps loader requires a browser environment"));
  }

  if ((window as any).google?.maps?.importLibrary) {
    return Promise.resolve((window as any).google);
  }

  if (loaderPromise) return loaderPromise;

  const browserKey = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
  const trackingId = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

  if (!browserKey) {
    return Promise.reject(
      new Error(
        "Google Maps browser key missing. Connect the Google Maps Platform connector to expose VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY.",
      ),
    );
  }

  loaderPromise = new Promise((resolve, reject) => {
    (window as any)[CALLBACK_NAME] = () => {
      resolve((window as any).google);
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      // Another loader is in-flight; wait for callback.
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    const params = new URLSearchParams({
      key: browserKey,
      v: "weekly",
      libraries: "places",
      loading: "async",
      callback: CALLBACK_NAME,
    });
    if (trackingId) params.set("channel", trackingId);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("Failed to load Google Maps JS"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}
