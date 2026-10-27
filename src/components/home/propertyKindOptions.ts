export interface PropertyKindOption {
  value: string;
  label: string;
}

const FALLBACK_PROPERTY_KINDS: PropertyKindOption[] = [
  { value: "any", label: "All Types" },
  { value: "Apartment", label: "Apartment" },
  { value: "Villa", label: "Villa" },
  { value: "Independent House", label: "Independent House" },
  { value: "Plot", label: "Plot" },
  { value: "Office Space", label: "Office" },
];

/**
 * Build the homepage property-type dropdown options from the types that
 * actually exist on saved property rows, so the list always matches the
 * backend. "All Types" stays first; unknown/empty types are ignored.
 */
export function buildPropertyKindOptions(
  rows: Array<{ type?: string | null }>,
  fallback: PropertyKindOption[] = FALLBACK_PROPERTY_KINDS,
): PropertyKindOption[] {
  const types = Array.from(
    new Set(
      rows
        .map((r) => (typeof r?.type === "string" ? r.type.trim() : ""))
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b));

  if (!types.length) return fallback;

  return [
    { value: "any", label: "All Types" },
    ...types.map((t) => ({ value: t, label: t })),
  ];
}

export { FALLBACK_PROPERTY_KINDS };
