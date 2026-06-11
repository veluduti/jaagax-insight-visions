/**
 * Centralized Google Maps types.
 *
 * NormalizedLocation is the canonical shape returned by every Google Places /
 * Geocoding call in the app. Storing this shape (in DB or form state) keeps
 * downstream consumers stable regardless of which Google API produced it.
 */
export interface NormalizedLocation {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  country: string;
  state: string;
  city: string;
  locality: string;
  /** Optional postal code when Google returns one. */
  postalCode?: string;
}

export interface AutocompleteSuggestionItem {
  placeId: string;
  /** Bold prefix from Google's matched substrings. */
  mainText: string;
  /** Remainder (region/country, etc.). */
  secondaryText: string;
  /** Full label for screen-reader / single-line display. */
  fullText: string;
}
