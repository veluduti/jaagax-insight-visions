import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
} from "@/hooks/useLocationMaster";
import { toast } from "@/hooks/use-toast";
import { Globe2, Map, MapPinned, Building2, Home, Plus, Loader2, Power } from "lucide-react";

/**
 * Master Location Hierarchy CRUD.
 * Only admins can write (RLS enforces public.is_admin(auth.uid())).
 * Any new City / Locality added here is instantly visible everywhere
 * the LocationMasterSelector is used — no migration needed.
 */
export default function LocationMasterPanel() {
  const [countryId, setCountryId] = useState<string | null>(null);
  const [stateId, setStateId] = useState<string | null>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [cityId, setCityId] = useState<string | null>(null);

  const { data: countries = [] } = useLocCountries();
  const { data: states = [] } = useLocStates(countryId);
  const { data: districts = [] } = useLocDistricts(stateId);
  const { data: cities = [] } = useLocCities(districtId);
  const { data: localities = [] } = useLocLocalities(cityId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPinned className="h-5 w-5 text-primary" />
            Location Master
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Single source of truth for Country → State → District → City → Locality.
            Add or edit rows here and every module (property submission, admin filters,
            routing) picks it up automatically.
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LevelCard
          title="Countries"
          icon={<Globe2 className="h-4 w-4" />}
          rows={countries as any}
          selectedId={countryId}
          onSelect={(id) => { setCountryId(id); setStateId(null); setDistrictId(null); setCityId(null); }}
          table="loc_countries"
          extraFields={[{ key: "iso2", label: "ISO2 Code", placeholder: "IN" }]}
        />
        <LevelCard
          title="States"
          icon={<Map className="h-4 w-4" />}
          rows={states as any}
          selectedId={stateId}
          onSelect={(id) => { setStateId(id); setDistrictId(null); setCityId(null); }}
          table="loc_states"
          parentKey="country_id"
          parentId={countryId}
          parentLabel="Country"
          parentRows={countries as any}
          parentSelect={(v) => setCountryId(v)}
        />
        <LevelCard
          title="Districts"
          icon={<MapPinned className="h-4 w-4" />}
          rows={districts as any}
          selectedId={districtId}
          onSelect={(id) => { setDistrictId(id); setCityId(null); }}
          table="loc_districts"
          parentKey="state_id"
          parentId={stateId}
          parentLabel="State"
          parentRows={states as any}
          parentSelect={(v) => { setStateId(v); setDistrictId(null); setCityId(null); }}
        />
        <LevelCard
          title="Cities"
          icon={<Building2 className="h-4 w-4" />}
          rows={cities as any}
          selectedId={cityId}
          onSelect={setCityId}
          table="loc_cities"
          parentKey="district_id"
          parentId={districtId}
          parentLabel="District"
          parentRows={districts as any}
          parentSelect={(v) => { setDistrictId(v); setCityId(null); }}
        />
      </div>

      <LevelCard
        title="Localities / Areas"
        icon={<Home className="h-4 w-4" />}
        rows={localities as any}
        table="loc_localities"
        parentKey="city_id"
        parentId={cityId}
        parentLabel="City"
        parentRows={cities as any}
        parentSelect={setCityId}
        extraFields={[{ key: "pincode", label: "PIN Code", placeholder: "500072" }]}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// LevelCard — generic CRUD panel for one master level
// ---------------------------------------------------------------------------

interface LevelCardProps {
  title: string;
  icon: React.ReactNode;
  rows: Array<{ id: string; name: string; slug: string; is_active: boolean; [k: string]: any }>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  table: string;
  parentKey?: string;
  parentId?: string | null;
  parentLabel?: string;
  parentRows?: Array<{ id: string; name: string }>;
  parentSelect?: (id: string) => void;
  extraFields?: Array<{ key: string; label: string; placeholder?: string }>;
}

function LevelCard({
  title, icon, rows,
  selectedId, onSelect,
  table, parentKey, parentId,
  parentLabel, parentRows, parentSelect,
  extraFields = [],
}: LevelCardProps) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [extras, setExtras] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const invalidate = () =>
    qc.invalidateQueries({ predicate: (q) => (q.queryKey as any[])[0] === "loc" });

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleAdd = async () => {
    if (!name.trim()) return;
    if (parentKey && !parentId) {
      toast({ title: `Select a ${parentLabel} first`, variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const row: any = { name: name.trim(), slug: slugify(name), is_active: true, ...extras };
    if (parentKey && parentId) row[parentKey] = parentId;
    const { error } = await (supabase as any).from(table).insert(row);
    setSubmitting(false);
    if (error) {
      toast({ title: `Failed to add ${title}`, description: error.message, variant: "destructive" });
      return;
    }
    setName("");
    setExtras({});
    invalidate();
    toast({ title: `${title.replace(/s$/, "")} added` });
  };

  const toggleActive = async (id: string, next: boolean) => {
    const { error } = await (supabase as any).from(table).update({ is_active: next }).eq("id", id);
    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }
    invalidate();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
          <Badge variant="secondary" className="ml-auto text-[10px]">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {parentKey && parentRows && parentSelect && (
          <div className="space-y-1">
            <Label className="text-xs">{parentLabel}</Label>
            <Select value={parentId ?? undefined} onValueChange={parentSelect}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder={`Select ${parentLabel}`} /></SelectTrigger>
              <SelectContent>
                {parentRows.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Existing rows */}
        <div className="max-h-56 overflow-y-auto space-y-1 rounded-md border p-2 bg-muted/20">
          {rows.length === 0 ? (
            <p className="text-xs text-muted-foreground italic text-center py-4">
              {parentKey && !parentId ? `Select a ${parentLabel} to view` : "No entries yet"}
            </p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer hover:bg-accent/50 ${selectedId === r.id ? "bg-accent" : ""}`}
                onClick={() => onSelect?.(r.id)}
              >
                <span className="flex-1 truncate">{r.name}</span>
                {r.pincode && <Badge variant="outline" className="text-[9px]">{r.pincode}</Badge>}
                <Switch
                  checked={r.is_active}
                  onCheckedChange={(v) => { void toggleActive(r.id, v); }}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Active"
                />
              </div>
            ))
          )}
        </div>

        {/* Add form */}
        <div className="space-y-2 border-t pt-3">
          <div className="flex gap-2">
            <Input
              placeholder={`New ${title.replace(/s$/, "")} name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button size="sm" onClick={handleAdd} disabled={submitting || !name.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          {extraFields.map((f) => (
            <Input
              key={f.key}
              placeholder={`${f.label}${f.placeholder ? ` (e.g. ${f.placeholder})` : ""}`}
              value={extras[f.key] ?? ""}
              onChange={(e) => setExtras({ ...extras, [f.key]: e.target.value })}
              className="h-9 text-xs"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
