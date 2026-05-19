import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Compass } from "lucide-react";

export interface PlotDirection {
  id: string;
  label: string;
  unit?: string;
}

export interface PlotMeasurementValue {
  [directionId: string]: {
    value: string;
    unit: string;
  };
}

interface PlotMeasurementWidgetProps {
  directions?: PlotDirection[];
  value?: PlotMeasurementValue;
  onChange?: (value: PlotMeasurementValue) => void;
  units?: string[];
  suggestions?: string[];
}

const DEFAULT_DIRECTIONS: PlotDirection[] = [
  { id: "east_measurement", label: "East", unit: "Ft" },
  { id: "west_measurement", label: "West", unit: "Ft" },
  { id: "north_measurement", label: "North", unit: "Ft" },
  { id: "south_measurement", label: "South", unit: "Ft" },
];

const DEFAULT_UNITS = ["Ft", "M", "Yard"];

const POSITION_CLASSES: Record<string, string> = {
  north_measurement: "col-start-2 row-start-1",
  south_measurement: "col-start-2 row-start-3",
  west_measurement: "col-start-1 row-start-2",
  east_measurement: "col-start-3 row-start-2",
};

export const PlotMeasurementWidget = ({
  directions = DEFAULT_DIRECTIONS,
  value = {},
  onChange,
  units = DEFAULT_UNITS,
  suggestions = ["30", "40", "50", "60"],
}: PlotMeasurementWidgetProps) => {
  const [internal, setInternal] = useState<PlotMeasurementValue>(value);

  const resolvedDirections = directions || field?.directions || DEFAULT_DIRECTIONS;

  const resolvedUnits = units || field?.units || DEFAULT_UNITS;

  const resolvedSuggestions = suggestions || field?.smartSuggestions?.examples || ["30", "40", "50", "60"];

  useEffect(() => {
    setInternal(value || {});
  }, [value]);

  const update = (id: string, patch: Partial<{ value: string; unit: string }>) => {
    const defaultUnit = resolvedDirections.find((d) => d.id === id)?.unit || units[0];
    const next: PlotMeasurementValue = {
      ...internal,
      [id]: {
        value: internal[id]?.value ?? "",
        unit: internal[id]?.unit ?? defaultUnit,
        ...patch,
      },
    };
    setInternal(next);
    onChange?.(next);
  };

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <Compass className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-medium text-foreground">Plot Side Measurements</h3>
      </div>

      <div className="grid grid-cols-3 grid-rows-3 gap-3 mb-6 max-w-md mx-auto">
        {resolvedDirections.map((dir) => (
          <div key={dir.id} className={POSITION_CLASSES[dir.id] || ""}>
            <Label className="text-xs text-muted-foreground mb-1 block text-center">{dir.label}</Label>
            <div className="flex gap-1">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={internal[dir.id]?.value ?? ""}
                onChange={(e) => update(dir.id, { value: e.target.value })}
                className="text-center"
              />
              <Select
                value={internal[dir.id]?.unit ?? dir.unit ?? units[0]}
                onValueChange={(u) => update(dir.id, { unit: u })}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {resolvedUnits.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}

        <div className="col-start-2 row-start-2 flex items-center justify-center">
          <div className="w-full h-full min-h-[60px] border-2 border-dashed border-primary/40 rounded-lg flex items-center justify-center bg-primary/5">
            <span className="text-xs text-muted-foreground">Plot</span>
          </div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          <span className="text-xs text-muted-foreground self-center">Quick:</span>
          {resolvedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                const next: PlotMeasurementValue = { ...internal };
                directions.forEach((d) => {
                  next[d.id] = { value: s, unit: next[d.id]?.unit ?? d.unit ?? units[0] };
                });
                setInternal(next);
                onChange?.(next);
              }}
              className="text-xs px-3 py-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              {s} Ft
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};

export default PlotMeasurementWidget;
