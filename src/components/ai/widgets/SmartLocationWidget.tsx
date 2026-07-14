import { FC, useEffect, useState } from "react";

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
 * City + Locality are powered by Google Places (Places API New) autocomplete
 * so typing a few letters surfaces real-world matches and auto-fills
 * state / country / lat-lng when a suggestion is picked.
 */
const SmartLocationWidget: FC<SmartLocationWidgetProps> = ({
  value: valueProp,
  initialValue,
  onChange,
  onSubmit,
}) => {
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
    // Master location IDs — single source of truth for routing
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

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Property Location</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Pick from the location hierarchy — this determines which District Admin
          reviews your listing.
        </p>
      </div>

      {/* Master Location Hierarchy — single source of truth */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <LocationMasterSelector
          value={{
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
          } as MasterLocationSelection}
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

      <p className="text-[11px] text-muted-foreground text-center">
        — or refine with map / autocomplete —
      </p>


      <Button
        type="button"
        variant="outline"
        className="w-full justify-center gap-2 border-primary/40 text-primary hover:bg-primary/10"
        onClick={() => setMapOpen(true)}
      >
        <MapPin className="h-4 w-4" />
        Select Location from Map
      </Button>

      <MapLocationModal
        open={mapOpen}
        onOpenChange={setMapOpen}
        initial={form}
        onConfirm={(loc) => update(loc)}
      />



      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* CITY — Google Places */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">City</label>
          <InlineLocationSearch
            variant="box"
            placeholder="Search city (e.g. Hy…)"
            initialValue={form.city}
            persistSavedLocation={false}
            onTextChange={(t) => update({ city: t })}
            onSelected={(loc) =>
              update({
                city: loc.city || loc.locality || form.city,
                locality: loc.locality || form.locality,
                state_name: loc.state || form.state_name,
                country: loc.country || form.country,
                pincode: loc.postalCode || form.pincode,
                latitude: loc.latitude ?? form.latitude,
                longitude: loc.longitude ?? form.longitude,
                address: loc.formattedAddress || form.address,
              })
            }
          />
        </div>

        {/* LOCALITY — Google Places */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Locality</label>
          <InlineLocationSearch
            variant="box"
            placeholder="Search locality / area"
            initialValue={form.locality}
            persistSavedLocation={false}
            onTextChange={(t) => update({ locality: t })}
            onSelected={(loc) =>
              update({
                locality: loc.locality || loc.city || form.locality,
                city: form.city || loc.city || "",
                state_name: form.state_name || loc.state || "",
                country: form.country || loc.country || "India",
                pincode: loc.postalCode || form.pincode,
                latitude: loc.latitude ?? form.latitude,
                longitude: loc.longitude ?? form.longitude,
                address: loc.formattedAddress || form.address,
              })
            }
          />
        </div>

        {/* STATE */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">State</label>
          <Input
            placeholder="State"
            value={form.state_name}
            onChange={(e) => update({ state_name: e.target.value })}
          />
        </div>

        {/* COUNTRY */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Country</label>
          <Input
            placeholder="Country"
            value={form.country}
            onChange={(e) => update({ country: e.target.value })}
          />
        </div>

        {/* SUB LOCALITY */}
        <Input
          placeholder="Sub Locality (optional)"
          value={form.sub_locality}
          onChange={(e) => update({ sub_locality: e.target.value })}
        />

        {/* PINCODE */}
        <Input
          placeholder="PIN Code"
          value={form.pincode}
          onChange={(e) => update({ pincode: e.target.value })}
        />
      </div>

      <Input
        placeholder="Landmark (optional)"
        value={form.landmark}
        onChange={(e) => update({ landmark: e.target.value })}
      />

      <Input
        placeholder="Full Address"
        value={form.address}
        onChange={(e) => update({ address: e.target.value })}
      />

      <Button type="button" className="w-full" onClick={() => onSubmit?.(form)}>
        Continue
      </Button>
    </div>
  );
};

export default SmartLocationWidget;
