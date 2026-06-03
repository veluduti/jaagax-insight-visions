// ============================================================
// Smart Suggestion Engine
//
// Deterministic helpers for:
//   - Indian price formatting
//   - Rent suggestions
//   - Measurement suggestions
//
// Lightweight + scalable.
// ============================================================

export type PriceUnit = "Sq Ft" | "Sq Yard" | "Cent" | "Gunta" | "Acre" | "Bigha" | "Hectare" | "Sq M" | "Katha";

// ============================================================
// TYPES
// ============================================================

export interface PriceSuggestion {
  label: string;

  value: number;
}

export interface RentSuggestion {
  label: string;

  value: number;

  duration: string;
}

export interface UnitSuggestion {
  label: string;

  value: number;

  unit: PriceUnit;
}

// ============================================================
// HELPERS
// ============================================================

function cleanNumericInput(input: string | number): number {
  if (typeof input === "number") {
    return input;
  }

  const lower = input.toLowerCase();

  // ==========================================================
  // 25K
  // ==========================================================

  if (lower.endsWith("k")) {
    return parseFloat(lower) * 1000;
  }

  // ==========================================================
  // 50L
  // ==========================================================

  if (lower.endsWith("l")) {
    return parseFloat(lower) * 100000;
  }

  // ==========================================================
  // 2CR
  // ==========================================================

  if (lower.endsWith("cr")) {
    return parseFloat(lower) * 10000000;
  }

  const cleaned = input.replace(/[^0-9.]/g, "");

  return parseFloat(cleaned);
}

// ============================================================
// FORMAT INDIAN NUMBER
// ============================================================

export function formatIndianNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  const trim = (n: number) => {
    const s = n.toFixed(2);

    return s.replace(/\.00$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
  };

  // ==========================================================
  // CRORE
  // ==========================================================

  if (value >= 10000000) {
    return `${trim(value / 10000000)} Crore`;
  }

  // ==========================================================
  // LAKH
  // ==========================================================

  if (value >= 100000) {
    return `${trim(value / 100000)} Lakh`;
  }

  // ==========================================================
  // THOUSAND
  // ==========================================================

  if (value >= 1000) {
    return `${trim(value / 1000)} Thousand`;
  }

  return new Intl.NumberFormat("en-IN").format(value);
}

// ============================================================
// PRICE SUGGESTIONS
// ============================================================

export function getPriceSuggestions(input: string | number): PriceSuggestion[] {
  const raw = cleanNumericInput(input);

  if (!Number.isFinite(raw) || raw <= 0) {
    return [];
  }

  const suggestions: PriceSuggestion[] = [];

  const seen = new Set<number>();

  const push = (value: number) => {
    if (!Number.isFinite(value) || value <= 0 || seen.has(value)) {
      return;
    }

    seen.add(value);

    suggestions.push({
      label: `₹ ${formatIndianNumber(value)}`,

      value,
    });
  };

  // ==========================================================
  // RAW VALUE
  // ==========================================================

  push(raw);

  // ==========================================================
  // SMALL NUMBERS
  // ==========================================================

  if (raw < 100) {
    push(raw * 1000);

    push(raw * 100000);

    push(raw * 10000000);
  }

  // ==========================================================
  // MEDIUM NUMBERS
  // ==========================================================
  else if (raw < 1000) {
    push(raw * 1000);

    push(raw * 100000);
  }

  // ==========================================================
  // LARGE NUMBERS
  // ==========================================================
  else if (raw < 100000) {
    push(raw * 100);
  }

  return suggestions.slice(0, 6);
}

// ============================================================
// RENT SUGGESTIONS
// ============================================================

export function getRentSuggestions(
  input: string | number,

  durations: string[] = ["Monthly", "Weekly", "Daily", "3 Months", "Yearly"],
): RentSuggestion[] {
  const raw = cleanNumericInput(input);

  if (!Number.isFinite(raw) || raw <= 0) {
    return [];
  }

  const formatted = new Intl.NumberFormat("en-IN").format(raw);

  return durations.map((duration) => ({
    label: `₹${formatted} / ${duration}`,

    value: raw,

    duration,
  }));
}

// ============================================================
// UNIT SUGGESTIONS
// ============================================================

export function getUnitSuggestions(
  input: string | number,

  units: PriceUnit[] = ["Sq Ft", "Sq Yard", "Cent", "Gunta", "Acre", "Bigha"],
): UnitSuggestion[] {
  const raw = cleanNumericInput(input);

  if (!Number.isFinite(raw) || raw <= 0) {
    return [];
  }

  return units.map((unit) => ({
    label: `${raw} ${unit}`,

    value: raw,

    unit,
  }));
}

// ============================================================
// UNIFIED SCHEMA-DRIVEN SUGGESTIONS
// ============================================================

export interface UnifiedSuggestion {
  label: string;
  commit: unknown;
  display: string;
}

export interface FieldSuggestionResult {
  chips: UnifiedSuggestion[];
  realtime: boolean;
  searchable: boolean;
}

export function getSuggestionsForField(field: any, input: string | number): FieldSuggestionResult {
  const ss = field?.smartSuggestions || {};
  const realtime = ss.realtime === true;
  const searchable = ss.searchable === true;
  const kind = (field?.type || field?.input || "").toString();
  const inputStr = String(input ?? "").trim();

  let chips: UnifiedSuggestion[] = [];

  // ---- price family ----
  if (kind === "price" || kind === "price_per_unit" || ss.type === "indian_price_format") {
    if (inputStr) {
      chips = getPriceSuggestions(inputStr).map((s) => ({
        label: s.label,
        commit: s.value,
        display: s.label,
      }));
    }
  }

  // ---- rental ----
  else if (kind === "rental_price" || ss.type === "rental_duration") {
    if (inputStr) {
      const durations =
        Array.isArray(ss.durations) && ss.durations.length
          ? ss.durations
          : ["Monthly", "Weekly", "Daily", "3 Months", "Yearly"];
      chips = getRentSuggestions(inputStr, durations).map((s) => ({
        label: s.label,
        commit: { amount: s.value, duration: s.duration },
        display: s.label,
      }));
    }
  }

  // ---- measurement / unit chips ----
  else if (
    kind === "measurement" ||
    kind === "measurement_unit" ||
    ss.type === "measurement_units" ||
    ss.type === "dynamic_measurement_units" ||
    ss.type === "dynamic_price_per_unit"
  ) {
    const units = (
      Array.isArray(ss.units) && ss.units.length
        ? ss.units
        : Array.isArray(field?.units) && field.units.length
          ? field.units
          : ["Sq Ft", "Sq Yard", "Acre", "Gunta", "Cent", "Bigha"]
    ) as PriceUnit[];

    if (inputStr) {
      chips = getUnitSuggestions(inputStr, units).map((s) => ({
        label: s.label,
        commit: { area: s.value, unit: s.unit },
        display: s.label,
      }));
    } else {
      chips = units.map((u) => ({ label: String(u), commit: u, display: String(u) }));
    }
  }

  // ---- examples (searchable dropdown / chips) ----
  if (chips.length === 0 && Array.isArray(ss.examples) && ss.examples.length) {
    let pool = ss.examples as string[];
    if (searchable && inputStr) {
      const q = inputStr.toLowerCase();
      pool = pool.filter((e) => e.toLowerCase().includes(q));
    }
    chips = pool.slice(0, 8).map((e) => ({ label: e, commit: e, display: e }));
  }

  return { chips, realtime, searchable };
}
