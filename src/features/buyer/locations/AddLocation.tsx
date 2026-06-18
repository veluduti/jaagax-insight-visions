import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";

interface AddLocationProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: () => void;
}

declare global {
  interface Window { google?: any; initGmapsAutocomplete?: () => void }
}

const GMAPS_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;

function loadGoogleMaps(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject();
    if (window.google?.maps?.places) return resolve();
    if (!GMAPS_KEY) return reject(new Error("Maps key missing"));
    const existing = document.querySelector<HTMLScriptElement>("script[data-gmaps]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      return;
    }
    window.initGmapsAutocomplete = () => resolve();
    const s = document.createElement("script");
    s.dataset.gmaps = "true";
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places&loading=async&callback=initGmapsAutocomplete`;
    s.onerror = () => reject();
    document.head.appendChild(s);
  });
}

export function AddLocation({ open, onOpenChange, onSaved }: AddLocationProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [locality, setLocality] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [radius, setRadius] = useState(5);
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadGoogleMaps().then(() => setMapsReady(true)).catch(() => setMapsReady(false));
  }, [open]);

  useEffect(() => {
    if (!open || !mapsReady || !inputRef.current || !window.google?.maps?.places) return;
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["geocode"],
      componentRestrictions: { country: "in" },
    });
    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      if (!place?.geometry?.location) return;
      setLat(place.geometry.location.lat());
      setLng(place.geometry.location.lng());
      setName(place.formatted_address || place.name || "");
      const comps: any[] = place.address_components || [];
      const get = (t: string) => comps.find((c) => c.types.includes(t))?.long_name || "";
      setLocality(get("sublocality") || get("neighborhood") || get("locality"));
      setCity(get("locality") || get("administrative_area_level_2"));
    });
    return () => listener?.remove?.();
  }, [open, mapsReady]);

  const reset = () => {
    setName(""); setCity(""); setLocality(""); setLat(null); setLng(null);
    setRadius(5); setNotify(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Please select a location");
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return toast.error("Sign in required"); }
    const { error } = await (supabase as any).from("buyer_preferred_locations").insert({
      user_id: user.id,
      name: name.trim(),
      city: city || null,
      locality: locality || null,
      latitude: lat,
      longitude: lng,
      radius_km: radius,
      notifications_enabled: notify,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Location saved");
    reset();
    onSaved?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Add Preferred Location</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Search location</Label>
            <Input
              ref={inputRef}
              placeholder={mapsReady ? "Search city, area, locality…" : "Loading maps…"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!mapsReady && !!GMAPS_KEY}
            />
            {!GMAPS_KEY && (
              <p className="text-xs text-muted-foreground">Maps autocomplete not configured — you can still type a name manually.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label>Search radius</Label>
              <span className="text-sm font-medium">{radius} km</span>
            </div>
            <Slider min={1} max={10} step={1} value={[radius]} onValueChange={(v) => setRadius(v[0])} />
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="cursor-pointer">Property alerts</Label>
              <p className="text-xs text-muted-foreground">Get notified about new matches here</p>
            </div>
            <Switch checked={notify} onCheckedChange={setNotify} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddLocation;
