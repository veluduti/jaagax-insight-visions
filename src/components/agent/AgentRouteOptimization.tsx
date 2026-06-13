import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Route, Plus, Trash2, MapPin, Calendar } from "lucide-react";
import { toast } from "sonner";

type Stop = { id: string; address: string };

export default function AgentRouteOptimization() {
  const [stops, setStops] = useState<Stop[]>([{ id: "1", address: "" }]);
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<{ ordered: string[]; distance: number; duration: number } | null>(null);

  const addStop = () => setStops([...stops, { id: String(Date.now()), address: "" }]);
  const removeStop = (id: string) => setStops(stops.filter((s) => s.id !== id));
  const updateStop = (id: string, address: string) =>
    setStops(stops.map((s) => (s.id === id ? { ...s, address } : s)));

  const optimize = async () => {
    const filled = stops.map((s) => s.address.trim()).filter(Boolean);
    if (filled.length < 2) { toast.error("Add at least 2 addresses"); return; }
    setOptimizing(true);
    // Simulated optimization. In production, call Google Routes API via gateway.
    await new Promise((r) => setTimeout(r, 800));
    const ordered = [...filled].sort();
    setResult({ ordered, distance: filled.length * 7.5, duration: filled.length * 22 });
    setOptimizing(false);
    toast.success("Route optimized");
  };

  const exportCalendar = () => {
    if (!result) return;
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0",
      ...result.ordered.flatMap((addr, i) => {
        const start = new Date(); start.setHours(10 + i, 0, 0, 0);
        const end = new Date(start); end.setMinutes(end.getMinutes() + 45);
        const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
        return ["BEGIN:VEVENT", `SUMMARY:Property Visit ${i + 1}`, `LOCATION:${addr}`,
          `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`, "END:VEVENT"];
      }),
      "END:VCALENDAR",
    ].join("\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "route.ics"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Route className="h-5 w-5 text-primary" /> Route Optimization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {stops.map((s, i) => (
            <div key={s.id} className="flex gap-2 items-center">
              <Badge variant="outline" className="w-8 justify-center">{i + 1}</Badge>
              <Input placeholder="Enter address" value={s.address} onChange={(e) => updateStop(s.id, e.target.value)} />
              {stops.length > 1 && (
                <Button size="icon" variant="ghost" onClick={() => removeStop(s.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" onClick={addStop} className="gap-2"><Plus className="h-4 w-4" /> Add Stop</Button>
        </div>

        <Button onClick={optimize} disabled={optimizing} className="w-full gap-2">
          {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Route className="h-4 w-4" />}
          Optimize Route
        </Button>

        {result && (
          <div className="space-y-3 pt-2 border-t">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-muted/30 rounded text-center">
                <p className="text-2xl font-bold">{result.distance.toFixed(1)} km</p>
                <p className="text-xs text-muted-foreground">Distance</p>
              </div>
              <div className="p-3 bg-muted/30 rounded text-center">
                <p className="text-2xl font-bold">{result.duration} min</p>
                <p className="text-xs text-muted-foreground">Driving Time</p>
              </div>
            </div>
            <ol className="space-y-1">
              {result.ordered.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm p-2 border rounded">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{a}</span>
                </li>
              ))}
            </ol>
            <Button variant="outline" onClick={exportCalendar} className="w-full gap-2">
              <Calendar className="h-4 w-4" /> Export to Calendar (.ics)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
