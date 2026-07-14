import { useAdminScopeFilter } from "@/contexts/AdminScopeFilterContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, RotateCcw, Globe2, Map, MapPinned } from "lucide-react";

const ALL = "__ALL__";

/**
 * Cascading Country → State → District filter bar for admin dashboards.
 * Respects RBAC: dropdowns are hidden for levels the admin is already scoped to.
 */
export default function AdminScopeFilterBar() {
  const {
    loading,
    bounds,
    selection,
    setCountry,
    setState,
    setDistrict,
    reset,
    options,
    effective,
  } = useAdminScopeFilter();

  // If admin has no role resolved yet or role is district_admin, hide entirely
  if (loading) return null;
  if (bounds.role === "district_admin") return null;

  const showCountry = bounds.role === "global_admin";
  const showState = bounds.role === "global_admin" || bounds.role === "country_admin";
  const showDistrict = showState || bounds.role === "state_admin";

  const activeChips: string[] = [];
  if (effective.country) activeChips.push(effective.country);
  if (effective.state) activeChips.push(effective.state);
  if (effective.district) activeChips.push(effective.district);

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-card rounded-lg border shadow-sm">
      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mr-1">
        <MapPin className="h-3.5 w-3.5" />
        Location Filter:
      </span>

      {showCountry && (
        <div className="flex items-center gap-1.5">
          <Globe2 className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={selection.country ?? ALL}
            onValueChange={(v) => setCountry(v === ALL ? null : v)}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Countries</SelectItem>
              {options.countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showState && (
        <div className="flex items-center gap-1.5">
          <Map className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={selection.state ?? ALL}
            onValueChange={(v) => setState(v === ALL ? null : v)}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All States</SelectItem>
              {options.states.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showDistrict && (
        <div className="flex items-center gap-1.5">
          <MapPinned className="h-3.5 w-3.5 text-muted-foreground" />
          <Select
            value={selection.district ?? ALL}
            onValueChange={(v) => setDistrict(v === ALL ? null : v)}
          >
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="All Districts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Districts</SelectItem>
              {options.districts.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(selection.country || selection.state || selection.district) && (
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={reset}>
          <RotateCcw className="h-3 w-3 mr-1" /> Reset
        </Button>
      )}

      {activeChips.length > 0 && (
        <div className="flex items-center gap-1 ml-auto">
          {activeChips.map((c) => (
            <Badge key={c} variant="secondary" className="text-[10px]">
              {c}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
