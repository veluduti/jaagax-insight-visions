import { FC, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SmartLocationWidgetProps {
  value?: Record<string, any>;
  initialValue?: Record<string, any>;
  onChange?: (value: Record<string, any>) => void;
  onSubmit?: (value: Record<string, any>) => void | Promise<void>;
}

const SmartLocationWidget: FC<SmartLocationWidgetProps> = ({ value, onChange, onSubmit }) => {
  const [form, setForm] = useState({
    country: value?.country || "India",

    state: value?.state || "",

    city: value?.city || "",

    locality: value?.locality || "",

    sub_locality: value?.sub_locality || "",

    landmark: value?.landmark || "",

    pincode: value?.pincode || "",
  });

  // =========================================================
  // SYNC EXTERNAL VALUE
  // =========================================================

  useEffect(() => {
    if (!value) {
      return;
    }

    setForm({
      country: value?.country || "India",

      state: value?.state || "",

      city: value?.city || "",

      locality: value?.locality || "",

      sub_locality: value?.sub_locality || "",

      landmark: value?.landmark || "",

      pincode: value?.pincode || "",
    });
  }, [value]);

  // =========================================================
  // UPDATE
  // =========================================================

  const updateField = (key: string, fieldValue: string) => {
    const updated = {
      ...form,
      [key]: fieldValue,
    };

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

        <Input placeholder="Country" value={form.country} onChange={(e) => updateField("country", e.target.value)} />

        {/* STATE */}

        <Input placeholder="State" value={form.state} onChange={(e) => updateField("state", e.target.value)} />

        {/* CITY */}

        <Input placeholder="City" value={form.city} onChange={(e) => updateField("city", e.target.value)} />

        {/* LOCALITY */}

        <Input placeholder="Locality" value={form.locality} onChange={(e) => updateField("locality", e.target.value)} />

        {/* SUB LOCALITY */}

        <Input
          placeholder="Sub Locality"
          value={form.sub_locality}
          onChange={(e) => updateField("sub_locality", e.target.value)}
        />

        {/* PINCODE */}

        <Input placeholder="PIN Code" value={form.pincode} onChange={(e) => updateField("pincode", e.target.value)} />
      </div>

      {/* LANDMARK */}

      <Input placeholder="Landmark" value={form.landmark} onChange={(e) => updateField("landmark", e.target.value)} />

      {/* SUBMIT */}

      <Button type="button" className="w-full" onClick={handleSubmit}>
        Continue
      </Button>
    </div>
  );
};

export default SmartLocationWidget;
