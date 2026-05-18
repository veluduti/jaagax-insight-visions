// ============================================================
// ADVANCED LOCATION SUGGESTION ENGINE
// FULLY DYNAMIC AI CONVERSATIONAL WORKFLOW ENGINE
// ============================================================

// ============================================================
// TYPES
// ============================================================

export type LocationLevel =
  | "country"
  | "state"
  | "city"
  | "locality"
  | "landmark"
  | "pincode";

// ============================================================
// CONTEXT
// ============================================================

export interface LocationContext {
  country?: string;

  state?: string;

  city?: string;

  locality?: string;

  landmark?: string;

  pincode?: string;
}

// ============================================================
// SUGGESTION
// ============================================================

export interface LocationSuggestion {
  level: LocationLevel;

  label: string;

  value: string;
}

// ============================================================
// MOCK DATABASE
// Replace later with API/database
// ============================================================

const LOCATION_DB = {
  India: {
    Telangana: {
      Hyderabad: {
        localities: [
          "Madhapur",
          "Gachibowli",
          "Kukatpally",
          "Miyapur",
          "Hitech City",
          "Kondapur",
          "Banjara Hills",
          "Jubilee Hills",
        ],

        landmarks: [
          "Inorbit Mall",
          "Cyber Towers",
          "Raidurg Metro",
          "Mindspace",
        ],

        pincodes: [
          "500081",
          "500032",
          "500072",
          "500049",
        ],
      },

      Warangal: {
        localities: [
          "Hanamkonda",
          "Kazipet",
        ],

        landmarks: [
          "Warangal Fort",
        ],

        pincodes: [
          "506001",
        ],
      },
    },

    Andhra Pradesh: {
      Vijayawada: {
        localities: [
          "Benz Circle",
          "Patamata",
        ],

        landmarks: [
          "Prakasam Barrage",
        ],

        pincodes: [
          "520010",
        ],
      },

      Visakhapatnam: {
        localities: [
          "MVP Colony",
          "Madhurawada",
        ],

        landmarks: [
          "RK Beach",
        ],

        pincodes: [
          "530017",
        ],
      },
    },
  },
};

// ============================================================
// NORMALIZE
// ============================================================

function normalize(
  value: string,
): string {
  return value
    .toLowerCase()
    .trim();
}

// ============================================================
// TYPO FRIENDLY MATCH
// ============================================================

function fuzzyMatch(
  query: string,
  value: string,
): boolean {
  const q =
    normalize(query);

  const v =
    normalize(value);

  if (!q) {
    return true;
  }

  return (
    v.includes(q) ||
    q.includes(v)
  );
}

// ============================================================
// FORMAT RESULTS
// ============================================================

function formatSuggestions(
  level: LocationLevel,
  values: string[],
): LocationSuggestion[] {
  return values.map(
    (value) => ({
      level,

      label: value,

      value,
    }),
  );
}

// ============================================================
// COUNTRIES
// ============================================================

export function suggestCountries(
  query: string,
): LocationSuggestion[] {
  const countries =
    Object.keys(
      LOCATION_DB,
    );

  const filtered =
    countries.filter(
      (country) =>
        fuzzyMatch(
          query,
          country,
        ),
    );

  return formatSuggestions(
    "country",
    filtered,
  );
}

// ============================================================
// STATES
// ============================================================

export function suggestStates(
  query: string,
  context?: LocationContext,
): LocationSuggestion[] {
  const country =
    context?.country ||
    "India";

  const states =
    Object.keys(
      LOCATION_DB[
        country as keyof typeof LOCATION_DB
      ] || {},
    );

  const filtered =
    states.filter(
      (state) =>
        fuzzyMatch(
          query,
          state,
        ),
    );

  return formatSuggestions(
    "state",
    filtered,
  );
}

// ============================================================
// CITIES
// ============================================================

export function suggestCities(
  query: string,
  context?: LocationContext,
): LocationSuggestion[] {
  const country =
    context?.country ||
    "India";

  const state =
    context?.state;

  if (!state) {
    return [];
  }

  const cities =
    Object.keys(
      LOCATION_DB[
        country as keyof typeof LOCATION_DB
      ]?.[
        state as keyof (typeof LOCATION_DB)["India"]
      ] || {},
    );

  const filtered =
    cities.filter(
      (city) =>
        fuzzyMatch(
          query,
          city,
        ),
    );

  return formatSuggestions(
    "city",
    filtered,
  );
}

// ============================================================
// LOCALITIES
// ============================================================

export function suggestLocalities(
  query: string,
  context?: LocationContext,
): LocationSuggestion[] {
  const country =
    context?.country ||
    "India";

  const state =
    context?.state;

  const city =
    context?.city;

  if (
    !state ||
    !city
  ) {
    return [];
  }

  const localities =
    LOCATION_DB[
      country as keyof typeof LOCATION_DB
    ]?.[
      state as keyof (typeof LOCATION_DB)["India"]
    ]?.[
      city as keyof (typeof LOCATION_DB)["India"]["Telangana"]
    ]?.localities ||
    [];

  const filtered =
    localities.filter(
      (locality) =>
        fuzzyMatch(
          query,
          locality,
        ),
    );

  return formatSuggestions(
    "locality",
    filtered,
  );
}

// ============================================================
// LANDMARKS
// ============================================================

export function suggestLandmarks(
  query: string,
  context?: LocationContext,
): LocationSuggestion[] {
  const country =
    context?.country ||
    "India";

  const state =
    context?.state;

  const city =
    context?.city;

  if (
    !state ||
    !city
  ) {
    return [];
  }

  const landmarks =
    LOCATION_DB[
      country as keyof typeof LOCATION_DB
    ]?.[
      state as keyof (typeof LOCATION_DB)["India"]
    ]?.[
      city as keyof (typeof LOCATION_DB)["India"]["Telangana"]
    ]?.landmarks ||
    [];

  const filtered =
    landmarks.filter(
      (landmark) =>
        fuzzyMatch(
          query,
          landmark,
        ),
    );

  return formatSuggestions(
    "landmark",
    filtered,
  );
}

// ============================================================
// PINCODES
// ============================================================

export function suggestPincodes(
  query: string,
  context?: LocationContext,
): LocationSuggestion[] {
  const country =
    context?.country ||
    "India";

  const state =
    context?.state;

  const city =
    context?.city;

  if (
    !state ||
    !city
  ) {
    return [];
  }

  const pincodes =
    LOCATION_DB[
      country as keyof typeof LOCATION_DB
    ]?.[
      state as keyof (typeof LOCATION_DB)["India"]
    ]?.[
      city as keyof (typeof LOCATION_DB)["India"]["Telangana"]
    ]?.pincodes ||
    [];

  const filtered =
    pincodes.filter(
      (pincode) =>
        fuzzyMatch(
          query,
          pincode,
        ),
    );

  return formatSuggestions(
    "pincode",
    filtered,
  );
}

// ============================================================
// UNIVERSAL LEVEL RESOLVER
// ============================================================

export function suggestByLevel(
  level: LocationLevel,

  query: string,

  context?: LocationContext,
): LocationSuggestion[] {
  switch (level) {
    case "country":
      return suggestCountries(
        query,
      );

    case "state":
      return suggestStates(
        query,
        context,
      );

    case "city":
      return suggestCities(
        query,
        context,
      );

    case "locality":
      return suggestLocalities(
        query,
        context,
      );

    case "landmark":
      return suggestLandmarks(
        query,
        context,
      );

    case "pincode":
      return suggestPincodes(
        query,
        context,
      );

    default:
      return [];
  }
}