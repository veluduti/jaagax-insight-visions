import { getPropertyFlow } from "@/config/propertyFlows";

/** Main property categories shown in the homepage search; each covers all its listing sub-types. */
const DEFS = [
  { value: "residential", label: "Residential", field: "property_type" },
  { value: "commercial", label: "Commercial", field: "property_type" },
  { value: "plots", label: "Plots / Land", field: "plot_type" },
  { value: "agriculture", label: "Agricultural", field: "agricultural_land_type" },
  { value: "coworking", label: "Co-working", field: "shared_space_type" },
] as const;

export const PROPERTY_MAIN_TYPES = DEFS.map(({ value, label }) => ({ value, label }));

/** Sub-types (plus their short names, e.g. "Apartment") for a main type, or null if not a main type. */
export function getMainTypeSubtypes(value: string): string[] | null {
  const def = DEFS.find((d) => d.value === value);
  if (!def) return null;
  const opts = ((getPropertyFlow(def.value as any)?.fields as any)?.[def.field]?.options as string[]) || [];
  return Array.from(new Set(opts.flatMap((t) => [t, t.split(" / ")[0].trim()])));
}
