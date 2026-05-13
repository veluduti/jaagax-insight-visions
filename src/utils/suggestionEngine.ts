// ============================================================
// Smart Suggestion Engine
// Deterministic helpers for price / rent / unit suggestions
// in the Indian numbering system.
// ============================================================

export type PriceUnit =
  | "Sq Ft"
  | "Sq Yard"
  | "Cent"
  | "Gunta"
  | "Acre"
  | "Bigha"
  | "Hectare"
  | "Sq M"
  | "Katha";

export interface PriceSuggestion {
  label: string;
  value: number;
}

export interface RentSuggestion {
  label: string;
  value: number;
  duration: string;
}

// ------------------------------------------------------------
// Indian numbering format
//   1000 -> "1 Thousand"
//   100000 -> "1 Lakh"
//   10000000 -> "1 Crore"
// ------------------------------------------------------------
export function formatIndianNumber(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";

  const trim = (n: number) => {
    const s = n.toFixed(2);
    return s.endsWith(".00") ? s.slice(0, -3) : s.replace(/0+$/, "").replace(/\.$/, "");
  };

  if (value >= 1_00_00_000) return `${trim(value / 1_00_00_000)} Crore`;
  if (value >= 1_00_000) return `${trim(value / 1_00_000)} Lakh`;
  if (value >= 1_000) return `${trim(value / 1_000)} Thousand`;
  if (value >= 100) return `${trim(value / 100)} Hundred`;
  return String(value);
}

// ------------------------------------------------------------
// Price suggestions — derived from the user's typed number.
// Returns a few sensible Indian-format interpretations.
// ------------------------------------------------------------
export function getPriceSuggestions(input: string | number): PriceSuggestion[] {
  const raw = typeof input === "number" ? input : parseFloat(String(input).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) return [];

  const out: PriceSuggestion[] = [];
  const seen = new Set<number>();
  const push = (v: number) => {
    if (!Number.isFinite(v) || v <= 0 || seen.has(v)) return;
    seen.add(v);
    const label = formatIndianNumber(v);
    if (label) out.push({ label: `₹ ${label}`, value: v });
  };

  push(raw);
  if (raw < 100) {
    push(raw * 1_000);
    push(raw * 1_00_000);
    push(raw * 1_00_00_000);
  } else if (raw < 1_000) {
    push(raw * 1_000);
    push(raw * 1_00_000);
  } else if (raw < 1_00_000) {
    push(raw * 100);
  }

  return out.slice(0, 5);
}

// ------------------------------------------------------------
// Rent suggestions — same number with multiple durations.
// ------------------------------------------------------------
export function getRentSuggestions(
  input: string | number,
  durations: string[] = ["Monthly", "Weekly", "Daily", "Yearly"],
): RentSuggestion[] {
  const raw = typeof input === "number" ? input : parseFloat(String(input).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) return [];
  const fmt = new Intl.NumberFormat("en-IN");
  return durations.slice(0, 5).map((d) => ({
    label: `₹${fmt.format(raw)} / ${d}`,
    value: raw,
    duration: d,
  }));
}

// ------------------------------------------------------------
// Measurement / unit suggestions — same number across units.
// ------------------------------------------------------------
export function getUnitSuggestions(
  input: string | number,
  units: PriceUnit[] = ["Sq Ft", "Sq Yard", "Acre", "Gunta", "Cent", "Bigha"],
): { label: string; value: number; unit: PriceUnit }[] {
  const raw = typeof input === "number" ? input : parseFloat(String(input).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) return [];
  return units.map((u) => ({ label: `${raw} ${u}`, value: raw, unit: u }));
}
