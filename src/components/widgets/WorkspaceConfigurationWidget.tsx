import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export interface WorkspaceConfigurationValue {
  total_seats?: string;
  available_seats?: string;
  private_cabins?: string;
  meeting_rooms?: string;
  conference_rooms?: string;
  floor_number?: string;
  total_floors?: string;
}

interface WorkspaceConfigurationWidgetProps {
  field?: any;
  value?: WorkspaceConfigurationValue;
  onChange?: (value: WorkspaceConfigurationValue) => void;
}

const FIELDS: { id: keyof WorkspaceConfigurationValue; label: string; required?: boolean }[] = [
  { id: "total_seats", label: "Total Seats", required: true },
  { id: "available_seats", label: "Available Seats", required: true },
  { id: "private_cabins", label: "Private Cabins" },
  { id: "meeting_rooms", label: "Meeting Rooms" },
  { id: "conference_rooms", label: "Conference Rooms" },
  { id: "total_floors", label: "Total Floors" },
  { id: "floor_number", label: "Floor Number" },
];

export const WorkspaceConfigurationWidget = ({
  value = {},
  onChange,
}: WorkspaceConfigurationWidgetProps) => {
  const [internal, setInternal] = useState<WorkspaceConfigurationValue>(value);

  useEffect(() => {
    setInternal(value || {});
  }, [value]);

  const update = (id: keyof WorkspaceConfigurationValue, v: string) => {
    setInternal((prev) => ({ ...prev, [id]: v }));
  };

  const totalSeats = Number(internal.total_seats || 0);
  const availableSeats = Number(internal.available_seats || 0);
  const seatsError =
    internal.available_seats && totalSeats > 0 && availableSeats > totalSeats
      ? "Available seats cannot exceed total seats"
      : "";

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Workspace Configuration</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.id}>
            <Label className="text-xs text-muted-foreground mb-1 block">
              {f.label}
              {f.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="0"
              value={internal[f.id] ?? ""}
              onChange={(e) => update(f.id, e.target.value)}
            />
          </div>
        ))}
      </div>

      {seatsError && (
        <p className="text-xs text-destructive mt-3">{seatsError}</p>
      )}

      <div className="flex justify-end mt-6">
        <button
          type="button"
          disabled={!!seatsError || !internal.total_seats || !internal.available_seats}
          onClick={() => onChange?.(internal)}
          className="px-5 py-2 rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </Card>
  );
};

export default WorkspaceConfigurationWidget;
