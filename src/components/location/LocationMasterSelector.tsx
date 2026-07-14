import { useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useLocCountries,
  useLocStates,
  useLocDistricts,
  useLocCities,
  useLocLocalities,
  type MasterLocationSelection,
} from "@/hooks/useLocationMaster";
import { Globe2, Map, MapPinned, Building2, Home } from "lucide-react";

interface Props {
  value: MasterLocationSelection;
  onChange: (v: MasterLocationSelection) => void;
  /** Hide the country selector (assumes India). Default true. */
  fixedCountry?: boolean;
  /** Hide locality selector when not needed */
  showLocality?: boolean;
  /** Vertical stacked layout instead of inline grid */
  stacked?: boolean;
  className?: string;
  disabled?: boolean;
}

const PLACEHOLDER = "—";

/**
 * Cascading master-location selector. All values come from the loc_* master
 * tables so no invalid combinations are possible. Selecting a parent
 * automatically clears children.
 *
 * The single source of truth for locations across property submission,
 * builder onboarding, admin filters and any future module.
 */
export default function LocationMasterSelector({
  value,
  onChange,
  fixedCountry = true,
  showLocality = true,
  stacked = false,
  className = "",
  disabled = false,
}: Props) {
  const { data: countries = [] } = useLocCountries();
  const { data: states = [] } = useLocStates(value.country_id);
  const { data: districts = [] } = useLocDistricts(value.state_id);
  const { data: cities = [] } = useLocCities(value.district_id);
  const { data: localities = [] } = useLocLocalities(value.city_id);

  // Auto-select India when fixedCountry is true and countries load
  useEffect(() => {
    if (!fixedCountry || value.country_id) return;
    const india = countries.find((c) => c.name === "India");
    if (india) {
      onChange({ ...value, country_id: india.id, country: india.name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, fixedCountry]);

  const patch = (p: Partial<MasterLocationSelection>) => onChange({ ...value, ...p });

  const pickCountry = (id: string) => {
    const c = countries.find((x) => x.id === id);
    patch({
      country_id: id,
      country: c?.name ?? null,
      state_id: null, state: null,
      district_id: null, district: null,
      city_id: null, city: null,
      locality_id: null, locality: null,
    });
  };
  const pickState = (id: string) => {
    const s = states.find((x) => x.id === id);
    patch({
      state_id: id, state: s?.name ?? null,
      district_id: null, district: null,
      city_id: null, city: null,
      locality_id: null, locality: null,
    });
  };
  const pickDistrict = (id: string) => {
    const d = districts.find((x) => x.id === id);
    patch({
      district_id: id, district: d?.name ?? null,
      city_id: null, city: null,
      locality_id: null, locality: null,
    });
  };
  const pickCity = (id: string) => {
    const c = cities.find((x) => x.id === id);
    patch({
      city_id: id, city: c?.name ?? null,
      locality_id: null, locality: null,
    });
  };
  const pickLocality = (id: string) => {
    const l = localities.find((x) => x.id === id);
    patch({ locality_id: id, locality: l?.name ?? null });
  };

  const wrap = stacked ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 gap-3";

  return (
    <div className={`${wrap} ${className}`}>
      {!fixedCountry && (
        <Field label="Country" icon={<Globe2 className="h-3.5 w-3.5" />}>
          <Select value={value.country_id ?? undefined} onValueChange={pickCountry} disabled={disabled}>
            <SelectTrigger><SelectValue placeholder={PLACEHOLDER} /></SelectTrigger>
            <SelectContent>
              {countries.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field label="State" icon={<Map className="h-3.5 w-3.5" />}>
        <Select
          value={value.state_id ?? undefined}
          onValueChange={pickState}
          disabled={disabled || !value.country_id}
        >
          <SelectTrigger><SelectValue placeholder={PLACEHOLDER} /></SelectTrigger>
          <SelectContent>
            {states.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="District" icon={<MapPinned className="h-3.5 w-3.5" />}>
        <Select
          value={value.district_id ?? undefined}
          onValueChange={pickDistrict}
          disabled={disabled || !value.state_id}
        >
          <SelectTrigger><SelectValue placeholder={PLACEHOLDER} /></SelectTrigger>
          <SelectContent>
            {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      <Field label="City" icon={<Building2 className="h-3.5 w-3.5" />}>
        <Select
          value={value.city_id ?? undefined}
          onValueChange={pickCity}
          disabled={disabled || !value.district_id}
        >
          <SelectTrigger><SelectValue placeholder={PLACEHOLDER} /></SelectTrigger>
          <SelectContent>
            {cities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>

      {showLocality && (
        <Field label="Locality / Area" icon={<Home className="h-3.5 w-3.5" />}>
          <Select
            value={value.locality_id ?? undefined}
            onValueChange={pickLocality}
            disabled={disabled || !value.city_id}
          >
            <SelectTrigger><SelectValue placeholder={PLACEHOLDER} /></SelectTrigger>
            <SelectContent>
              {localities.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        {icon}{label}
      </label>
      {children}
    </div>
  );
}
