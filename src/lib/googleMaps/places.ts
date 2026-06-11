/**
 * Browser-side Places API (New) helpers.
 *
 * Uses google.maps.places.AutocompleteSuggestion (Places New) — NOT the
 * deprecated google.maps.places.Autocomplete / PlacesService classes.
 */
import { loadGoogleMaps } from "./loader";
import type { AutocompleteSuggestionItem, NormalizedLocation } from "./types";

const detailsCache = new Map<string, NormalizedLocation>();

/** Stable per-session token. Re-create after each Place selection. */
export function createSessionToken(): any {
  // Cast through any so we don't pull google.maps types into module load.
  return new (window as any).google.maps.places.AutocompleteSessionToken();
}

export async function fetchAutocompleteSuggestions(
  input: string,
  sessionToken: any,
  options?: { country?: string | string[] },
): Promise<AutocompleteSuggestionItem[]> {
  if (!input || input.trim().length < 2) return [];
  await loadGoogleMaps();
  const { AutocompleteSuggestion } = (await (window as any).google.maps.importLibrary("places")) as any;

  const request: any = {
    input: input.trim(),
    sessionToken,
  };
  if (options?.country) {
    request.includedRegionCodes = Array.isArray(options.country) ? options.country : [options.country];
  }

  try {
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
    return (suggestions || [])
      .map((s: any) => s.placePrediction)
      .filter(Boolean)
      .map((p: any) => ({
        placeId: p.placeId,
        mainText: p.mainText?.text ?? p.text?.text ?? "",
        secondaryText: p.secondaryText?.text ?? "",
        fullText: p.text?.text ?? "",
      }));
  } catch (err) {
    console.warn("[googleMaps] autocomplete failed", err);
    return [];
  }
}

function pickComponent(components: any[], type: string): string {
  const match = components?.find((c) => Array.isArray(c.types) && c.types.includes(type));
  return match?.longText ?? match?.shortText ?? "";
}

export async function fetchPlaceDetails(
  placeId: string,
  sessionToken?: any,
): Promise<NormalizedLocation> {
  if (detailsCache.has(placeId)) return detailsCache.get(placeId)!;
  await loadGoogleMaps();
  const { Place } = (await (window as any).google.maps.importLibrary("places")) as any;

  const place = new Place({ id: placeId, requestedLanguage: "en" });
  await place.fetchFields({
    fields: ["id", "formattedAddress", "location", "addressComponents"],
    ...(sessionToken ? { sessionToken } : {}),
  });

  const components = place.addressComponents || [];
  const country = pickComponent(components, "country");
  const state = pickComponent(components, "administrative_area_level_1");
  const city =
    pickComponent(components, "locality") ||
    pickComponent(components, "administrative_area_level_2") ||
    pickComponent(components, "administrative_area_level_3") ||
    "";
  const locality =
    pickComponent(components, "sublocality_level_1") ||
    pickComponent(components, "sublocality") ||
    pickComponent(components, "neighborhood") ||
    "";
  const postalCode = pickComponent(components, "postal_code");

  const normalized: NormalizedLocation = {
    placeId: place.id,
    formattedAddress: place.formattedAddress ?? "",
    latitude: typeof place.location?.lat === "function" ? place.location.lat() : place.location?.lat ?? 0,
    longitude: typeof place.location?.lng === "function" ? place.location.lng() : place.location?.lng ?? 0,
    country,
    state,
    city,
    locality,
    postalCode: postalCode || undefined,
  };

  detailsCache.set(placeId, normalized);
  return normalized;
}
