import { useEffect, useRef, useState } from "react";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import MapLocationModal, { type MapPickedLocation } from "@/components/location/MapLocationModal";
import { Loader2, MapPin } from "lucide-react";

interface SmartLocationWidgetProps {
  value?: Record<string, any>;
  initialValue?: Record<string, any>;
  onChange?: (value: Record<string, any>) => void;
  onSubmit?: (value: Record<string, any>) => void | Promise<void>;
}

type LocationForm = Partial<MapPickedLocation> & {
  country_id?: string | null;
  state_id?: string | null;
  district_id?: string | null;
  city_id?: string | null;
  locality_id?: string | null;
};

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

// Resolve names against the same location hierarchy used for admin routing.
async function resolveHierarchy(loc: LocationForm): Promise<LocationForm> {
  const lookup = async (table: string, name: string, parentColumn?: string, parentId?: string | null) => {
    if (!name || (parentColumn && !parentId)) return null;
    let query = (supabase as any).from(table).select("id,name").ilike("name", name).eq("is_active", true);
    if (parentColumn) query = query.eq(parentColumn, parentId);
    const { data, error } = await query.limit(1).maybeSingle();
    if (error) throw error;
    return data as { id: string; name: string } | null;
  };
  const country = await lookup("loc_countries", text(loc.country));
  const state = await lookup("loc_states", text(loc.state_name), "country_id", country?.id);
  const district = await lookup("loc_districts", text(loc.district), "state_id", state?.id);
  const city = await lookup("loc_cities", text(loc.city), "district_id", district?.id);
  const locality = await lookup("loc_localities", text(loc.locality), "city_id", city?.id);
  return {
    ...loc,
    country_id: country?.id ?? null,
    state_id: state?.id ?? null,
    district_id: district?.id ?? null,
    city_id: city?.id ?? null,
    locality_id: locality?.id ?? null,
  };
}

const SmartLocationWidget = ({ value: valueProp, initialValue, onChange, onSubmit }: SmartLocationWidgetProps) => {
  const initial = valueProp ?? initialValue;
  const [form, setForm] = useState<LocationForm>(() => ({ ...initial }));
  const [mapOpen, setMapOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState("");
  const { savedLocation } = useLocationContext();
  const initialized = useRef(false);
  const requestId = useRef(0);

  // Use the navbar's exact saved pin when available. A city-only browsing
  // preference is not an exact property address, so the user must pick a pin.
  useEffect(() => {
    if (initialized.current) return;
    if (initial?.latitude != null && initial?.longitude != null) {
      initialized.current = true;
      return;
    }
    if (savedLocation?.latitude == null || savedLocation?.longitude == null) return;
    initialized.current = true;
    const id = ++requestId.current;
    setResolving(true);
    void supabase.functions.invoke("reverse-geocode", {
      body: { latitude: savedLocation.latitude, longitude: savedLocation.longitude },
    }).then(async ({ data, error: geoError }) => {
      if (id !== requestId.current) return;
      if (geoError || !data || data.error) throw geoError || new Error("Location unavailable");
      const resolved = await resolveHierarchy({
        country: text(data.country), state_name: text(data.state), district: text(data.district),
        city: text(data.city) || savedLocation.city, locality: text(data.locality) || savedLocation.area,
        sub_locality: text(data.sub_locality), landmark: text(data.landmark),
        address: text(data.formattedAddress), pincode: text(data.pincode),
        latitude: savedLocation.latitude, longitude: savedLocation.longitude,
        place_id: text(data.place_id),
      });
      if (id === requestId.current) {
        setForm(resolved);
        onChange?.(resolved);
      }
    }).catch(() => {
      if (id === requestId.current) setError("We couldn't fill your current location. Select the property on the map.");
    }).finally(() => {
      if (id === requestId.current) setResolving(false);
    });
  }, [savedLocation, initial?.latitude, initial?.longitude, onChange]);

  const choosePin = async (loc: MapPickedLocation) => {
    const id = ++requestId.current;
    setResolving(true);
    setError("");
    try {
      const resolved = await resolveHierarchy(loc);
      if (id !== requestId.current) return;
      setForm(resolved);
      onChange?.(resolved);
    } catch {
      if (id === requestId.current) setError("Couldn't verify that location. Please try the map again.");
    } finally {
      if (id === requestId.current) setResolving(false);
    }
  };

  const hasCoordinates = Number.isFinite(form.latitude) && Number.isFinite(form.longitude);
  const missing = ["country", "state_name", "district", "city", "address"]
    .filter((key) => !text(form[key as keyof LocationForm]));
  const canContinue = hasCoordinates && missing.length === 0 && !resolving;

  return (
    <div className="w-full border border-border bg-card p-4 sm:p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Property Location</h3>
        <p className="text-sm text-muted-foreground mt-1">Confirm the property pin before continuing.</p>
      </div>

      <div className="border-l-2 border-primary bg-muted/30 px-3 py-3 flex gap-3 items-start">
        {resolving ? <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" /> : <MapPin className="h-5 w-5 text-primary shrink-0" />}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {resolving ? "Finding your location…" : hasCoordinates ? (form.address || "Pinned location") : "No property pin selected"}
          </p>
          {hasCoordinates && (
            <p className="mt-1 text-xs text-muted-foreground">
              {[form.locality, form.city, form.district, form.state_name, form.country, form.pincode].filter(Boolean).join(" · ")}
            </p>
          )}
          {!hasCoordinates && !resolving && <p className="mt-1 text-xs text-muted-foreground">Select the property's exact location on the map.</p>}
        </div>
      </div>

      <Button type="button" variant="outline" className="w-full gap-2" onClick={() => setMapOpen(true)}>
        <MapPin className="h-4 w-4" /> {hasCoordinates ? "Change location on map" : "Select location on map"}
      </Button>
      <MapLocationModal open={mapOpen} onOpenChange={setMapOpen} initial={form} onConfirm={choosePin} mapOnly />

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {hasCoordinates && missing.length > 0 && !resolving && (
        <p role="alert" className="text-xs text-destructive">
          The map couldn't find {missing.map((key) => key === "state_name" ? "state" : key).join(", ")}. Choose another pin to complete the address.
        </p>
      )}
      <Button type="button" className="w-full" disabled={!canContinue} onClick={() => onSubmit?.(form)}>
        Continue
      </Button>
    </div>
  );
};

export default SmartLocationWidget;