import { FC, useEffect, useRef, useState } from "react";
import { useLocation as useLocationContext } from "@/contexts/LocationContext";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import InlineLocationSearch from "@/components/location/InlineLocationSearch";
import MapLocationModal from "@/components/location/MapLocationModal";
import LocationMasterSelector from "@/components/location/LocationMasterSelector";
import type { MasterLocationSelection } from "@/hooks/useLocationMaster";
import { MapPin } from "lucide-react";

interface SmartLocationWidgetProps {
  value?: Record<string, any>;
  initialValue?: Record<string, any>;
  onChange?: (value: Record<string, any>) => void;
  onSubmit?: (value: Record<string, any>) => void | Promise<void>;
}

/**
 * Property-location capture used inside the Sell-Property AI chat.
 * Single source of truth:
 *   - Hierarchy (country → state → district → city → locality) via LocationMasterSelector
 *   - Map pin via MapLocationModal
 *   - Free-form street details (address, pincode, landmark, sub_locality) via inputs
 */
const SmartLocationWidget: FC<SmartLocationWidgetProps> = ({ value: valueProp, initialValue, onChange, onSubmit }) => {
  const value = valueProp ?? initialValue;

  const [form, setForm] = useState({
    country: value?.country || "India",
    state_name: value?.state_name || "",
    city: value?.city || "",
    locality: value?.locality || "",
    sub_locality: value?.sub_locality || "",
    landmark: value?.landmark || "",
    address: value?.address || "",
    pincode: value?.pincode || "",
    latitude: value?.latitude ?? null,
    longitude: value?.longitude ?? null,
    place_id: value?.place_id || "",
    country_id: value?.country_id ?? null,
    state_id: value?.state_id ?? null,
    district_id: value?.district_id ?? null,
    city_id: value?.city_id ?? null,
    locality_id: value?.locality_id ?? null,
  });

  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    if (!value) return;
    setForm({
      country: value?.country || "India",
      state_name: value?.state_name || "",
      city: value?.city || "",
      locality: value?.locality || "",
      sub_locality: value?.sub_locality || "",
      landmark: value?.landmark || "",
      address: value?.address || "",
      pincode: value?.pincode || "",
      latitude: value?.latitude ?? null,
      longitude: value?.longitude ?? null,
      place_id: value?.place_id || "",
      country_id: value?.country_id ?? null,
      state_id: value?.state_id ?? null,
      district_id: value?.district_id ?? null,
      city_id: value?.city_id ?? null,
      locality_id: value?.locality_id ?? null,
    });
  }, [value]);

  const update = (patch: Partial<typeof form>) => {
    const next = { ...form, ...patch };
    setForm(next);
    onChange?.(next);
  };

  // Auto-fill from nav-bar location once
  const { savedLocation, locationMode } = useLocationContext();
  const autoFilledRef = useRef(false);
  useEffect(() => {
    if (autoFilledRef.current) return;
    if (!savedLocation || locationMode === "disabled") return;
    if (form.city || form.locality || form.latitude != null) {
      autoFilledRef.current = true;
      return;
    }
    autoFilledRef.current = true;
    update({
      city: savedLocation.city || "",
      locality: savedLocation.area || "",
      latitude: savedLocation.latitude ?? null,
      longitude: savedLocation.longitude ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedLocation, locationMode]);

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Property Location</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Pick the location hierarchy — this determines which District Admin reviews your listing.
        </p>
      </div>

      {/* Single source of truth for country/state/district/city/locality */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <LocationMasterSelector
          value={
            {
              country_id: form.country_id,
              state_id: form.state_id,
              district_id: form.district_id,
              city_id: form.city_id,
              locality_id: form.locality_id,
              country: form.country,
              state: form.state_name,
              district: null,
              city: form.city,
              locality: form.locality,
            } as MasterLocationSelection
          }
          onChange={(v) =>
            update({
              country_id: v.country_id,
              state_id: v.state_id,
              district_id: v.district_id,
              city_id: v.city_id,
              locality_id: v.locality_id,
              country: v.country ?? form.country,
              state_name: v.state ?? form.state_name,
              city: v.city ?? form.city,
              locality: v.locality ?? form.locality,
            })
          }
        />
      </div>

      <p className="text-[11px] text-muted-foreground text-center">— or drop a pin on the map —</p>

      <Button
        type="button"
        variant="outline"
        className="w-full justify-center gap-2 border-primary/40 text-primary hover:bg-primary/10"
        onClick={() => setMapOpen(true)}
      >
        <MapPin className="h-4 w-4" />
        Select Location from Map
      </Button>

      <MapLocationModal open={mapOpen} onOpenChange={setMapOpen} initial={form} onConfirm={(loc) => update(loc)} />

      {/*
        Optional free-text refinement of locality/area if the master
        hierarchy doesn't have the exact match.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Refine Locality / Area (optional)</label>
          <InlineLocationSearch
            variant="box"
            placeholder="Search locality / area"
            initialValue={form.locality}
            persistSavedLocation={false}
            onTextChange={(t) => update({ locality: t })}
            onSelected={(loc) =>
              update({
                locality: loc.locality || loc.city || form.locality,
                pincode: loc.postalCode || form.pincode,
                latitude: loc.latitude ?? form.latitude,
                longitude: loc.longitude ?? form.longitude,
                address: loc.formattedAddress || form.address,
              })
            }
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Sub Locality (optional)</label>
          <Input
            placeholder="Sub Locality"
            value={form.sub_locality}
            onChange={(e) => update({ sub_locality: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">PIN Code</label>
          <Input placeholder="PIN Code" value={form.pincode} onChange={(e) => update({ pincode: e.target.value })} />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Landmark (optional)</label>
          <Input placeholder="Landmark" value={form.landmark} onChange={(e) => update({ landmark: e.target.value })} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Full Address</label>
        <Input
          placeholder="House / Street / Area"
          value={form.address}
          onChange={(e) => update({ address: e.target.value })}
        />
      </div>

      <Button type="button" className="w-full" onClick={() => onSubmit?.(form)}>
        Continue
      </Button>
    </div>
  );
};

export default SmartLocationWidget;
