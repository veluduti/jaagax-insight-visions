import { FC, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { locationData } from "@/data/locationData";

interface SmartLocationWidgetProps {
  value?: Record<string, any>;

  initialValue?: Record<string, any>;

  onChange?: (value: Record<string, any>) => void;

  onSubmit?: (value: Record<string, any>) => void | Promise<void>;
}

const SmartLocationWidget: FC<SmartLocationWidgetProps> = ({ value: valueProp, initialValue, onChange, onSubmit }) => {
  const value = valueProp ?? initialValue;

  // =========================================================
  // FORM STATE
  // =========================================================

  const [form, setForm] = useState({
    country: value?.country || "India",

    state_name: value?.state_name || "",

    city: value?.city || "",

    locality: value?.locality || "",

    sub_locality: value?.sub_locality || "",

    landmark: value?.landmark || "",

    address: value?.address || "",

    pincode: value?.pincode || "",
  });

  // =========================================================
  // DYNAMIC LOCATION LISTS
  // =========================================================

  const countries = Object.keys(locationData);

  const states = form.country ? Object.keys(locationData[form.country] || {}) : [];

  const cities =
    form.country && form.state_name ? Object.keys(locationData[form.country]?.[form.state_name] || {}) : [];

  const localities =
    form.country && form.state_name && form.city
      ? Object.keys(locationData[form.country]?.[form.state_name]?.[form.city] || {})
      : [];

  const subLocalities =
    form.country && form.state_name && form.city && form.locality
      ? locationData[form.country]?.[form.state_name]?.[form.city]?.[form.locality] || []
      : [];

  // =========================================================
  // SYNC EXTERNAL VALUE
  // =========================================================

  useEffect(() => {
    if (!value) {
      return;
    }

    setForm({
      country: value?.country || "India",

      state_name: value?.state_name || "",

      city: value?.city || "",

      locality: value?.locality || "",

      sub_locality: value?.sub_locality || "",

      landmark: value?.landmark || "",

      address: value?.address || "",

      pincode: value?.pincode || "",
    });
  }, [value]);

  // =========================================================
  // UPDATE
  // =========================================================

  const update = (key: string, fieldValue: string) => {
    let updated = {
      ...form,
      [key]: fieldValue,
    };

    // COUNTRY CHANGED

    if (key === "country") {
      updated.state_name = "";
      updated.city = "";
      updated.locality = "";
      updated.sub_locality = "";
    }

    // STATE CHANGED

    if (key === "state_name") {
      updated.city = "";
      updated.locality = "";
      updated.sub_locality = "";
    }

    // CITY CHANGED

    if (key === "city") {
      updated.locality = "";
      updated.sub_locality = "";
    }

    // LOCALITY CHANGED

    if (key === "locality") {
      updated.sub_locality = "";
    }

    setForm(updated);

    onChange?.(updated);
  };

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = () => {
    onSubmit?.(form);
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
      {/* HEADER */}

      <div>
        <h3 className="text-sm font-semibold">Property Location</h3>

        <p className="text-xs text-muted-foreground mt-1">Add the complete property location details.</p>
      </div>

      {/* GRID */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* COUNTRY */}

        <div className="space-y-1">
          <Input placeholder="Country" value={form.country} onChange={(e) => update("country", e.target.value)} />

          {form.country && countries.length > 0 && (
            <div className="border rounded-xl bg-background shadow-sm max-h-40 overflow-auto">
              {countries
                .filter((country) => country.toLowerCase().includes(form.country.toLowerCase()))
                .map((country) => (
                  <button
                    key={country}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted"
                    onClick={() => update("country", country)}
                  >
                    {country}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* STATE */}

        <div className="space-y-1">
          <Input placeholder="State" value={form.state_name} onChange={(e) => update("state_name", e.target.value)} />

          {form.state_name && states.length > 0 && (
            <div className="border rounded-xl bg-background shadow-sm max-h-40 overflow-auto">
              {states
                .filter((state) => state.toLowerCase().includes(form.state_name.toLowerCase()))
                .map((state) => (
                  <button
                    key={state}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted"
                    onClick={() => update("state_name", state)}
                  >
                    {state}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* CITY */}

        <div className="space-y-1">
          <Input placeholder="City" value={form.city} onChange={(e) => update("city", e.target.value)} />

          {form.city && cities.length > 0 && (
            <div className="border rounded-xl bg-background shadow-sm max-h-40 overflow-auto">
              {cities
                .filter((city) => city.toLowerCase().includes(form.city.toLowerCase()))
                .map((city) => (
                  <button
                    key={city}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted"
                    onClick={() => update("city", city)}
                  >
                    {city}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* LOCALITY */}

        <div className="space-y-1">
          <Input placeholder="Locality" value={form.locality} onChange={(e) => update("locality", e.target.value)} />

          {form.locality && localities.length > 0 && (
            <div className="border rounded-xl bg-background shadow-sm max-h-40 overflow-auto">
              {localities
                .filter((locality) => locality.toLowerCase().includes(form.locality.toLowerCase()))
                .map((locality) => (
                  <button
                    key={locality}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted"
                    onClick={() => update("locality", locality)}
                  >
                    {locality}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* SUB LOCALITY */}

        <div className="space-y-1">
          <Input
            placeholder="Sub Locality"
            value={form.sub_locality}
            onChange={(e) => update("sub_locality", e.target.value)}
          />

          {form.sub_locality && subLocalities.length > 0 && (
            <div className="border rounded-xl bg-background shadow-sm max-h-40 overflow-auto">
              {subLocalities
                .filter((subLocality) => subLocality.toLowerCase().includes(form.sub_locality.toLowerCase()))
                .map((subLocality) => (
                  <button
                    key={subLocality}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-muted"
                    onClick={() => update("sub_locality", subLocality)}
                  >
                    {subLocality}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* PINCODE */}

        <Input placeholder="PIN Code" value={form.pincode} onChange={(e) => update("pincode", e.target.value)} />
      </div>

      {/* LANDMARK */}

      <Input placeholder="Landmark" value={form.landmark} onChange={(e) => update("landmark", e.target.value)} />

      {/* ADDRESS */}

      <Input placeholder="Full Address" value={form.address} onChange={(e) => update("address", e.target.value)} />

      {/* SUBMIT */}

      <Button type="button" className="w-full" onClick={handleSubmit}>
        Continue
      </Button>
    </div>
  );
};

export default SmartLocationWidget;
