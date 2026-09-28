import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Search } from "lucide-react";
import GoogleMapPicker from "./GoogleMapPicker";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


export interface MapPickedLocation {
  country: string;
  state_name: string;
  district: string;
  city: string;
  locality: string;
  sub_locality: string;
  landmark: string;
  address: string;
  pincode: string;
  latitude: number;
  longitude: number;
  place_id?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<MapPickedLocation>;
  onConfirm: (loc: MapPickedLocation) => void;
  /** Property listing uses the map pin; optional search only moves that pin. */
  mapOnly?: boolean;
}

function pick(components: any[], type: string): string {
  const m = components?.find((c) => (c.types || []).includes(type));
  return m?.long_name || m?.longText || m?.short_name || m?.shortText || "";
}

/**
 * Modal that lets the user search & pin a location on Google Maps, then
 * reverse-geocodes the final coordinates into a fully-populated address.
 */
const MapLocationModal = ({ open, onOpenChange, initial, onConfirm, mapOnly = false }: Props) => {
  const [lat, setLat] = useState<number | null>(initial?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(initial?.longitude ?? null);
  const [placeId, setPlaceId] = useState<string | undefined>(initial?.place_id);
  const [address, setAddress] = useState<string>(initial?.address ?? "");
  const [confirming, setConfirming] = useState(false);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<{ placeId: string; text: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const searchSession = useRef(crypto.randomUUID());
  const searchRequest = useRef(0);

  useEffect(() => {
    if (open) {
      setLat(initial?.latitude ?? null);
      setLng(initial?.longitude ?? null);
      setPlaceId(initial?.place_id);
      setAddress(initial?.address ?? "");
      setSearch("");
      setMatches([]);
      searchSession.current = crypto.randomUUID();
    }
  }, [open]);

  useEffect(() => {
    if (!open || search.trim().length < 2) {
      setMatches([]);
      setSearching(false);
      return;
    }
    const request = ++searchRequest.current;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const { data, error } = await supabase.functions.invoke("property-location-search", {
        body: { action: "suggest", input: search, sessionToken: searchSession.current, latitude: lat, longitude: lng },
      });
      if (request !== searchRequest.current) return;
      setSearching(false);
      if (error || data?.error) {
        setMatches([]);
        toast.error("Location search is unavailable. Try a map pin instead.");
      } else setMatches(Array.isArray(data?.suggestions) ? data.suggestions : []);
    }, 350);
    return () => {
      searchRequest.current++;
      window.clearTimeout(timer);
    };
  }, [search, open]);

  const selectResult = async (item: { placeId: string; text: string }) => {
    searchRequest.current++;
    setMatches([]);
    setSelecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("property-location-search", {
        body: { action: "details", placeId: item.placeId, sessionToken: searchSession.current },
      });
      if (error || data?.error || !Number.isFinite(data?.latitude) || !Number.isFinite(data?.longitude)) throw error || new Error("No location found");
      setLat(data.latitude);
      setLng(data.longitude);
      setAddress(data.address || item.text);
      setPlaceId(data.placeId || item.placeId);
      setSearch("");
      searchSession.current = crypto.randomUUID();
    } catch {
      toast.error("Couldn't pinpoint that place. Please try another result.");
    } finally {
      setSelecting(false);
    }
  };

  const reverseGeocode = async (la: number, ln: number): Promise<MapPickedLocation | null> => {
    const { data, error } = await supabase.functions.invoke("reverse-geocode", {
      body: { latitude: la, longitude: ln },
    });
    if (error || !data || (data as any).error) {
      console.error("[MapLocationModal] reverse-geocode edge failed", error, data);
      return null;
    }
    const d: any = data;
    return {
      country: d.country || "",
      state_name: d.state || "",
      district: d.district || "",
      city: d.city || "",
      locality: d.locality || "",
      sub_locality: d.sub_locality || "",
      landmark: d.landmark || "",
      address: d.formattedAddress || "",
      pincode: d.pincode || "",
      latitude: la,
      longitude: ln,
      place_id: d.place_id,
    };
  };


  const handleConfirm = async () => {
    if (lat === null || lng === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error(mapOnly ? "Please tap on the map to drop a pin" : "Please search or tap on the map to drop a pin");
      return;
    }
    setConfirming(true);
    try {
      const result = await reverseGeocode(lat, lng);
      if (!result) {
        toast.error("Couldn't resolve that location. Try another spot.");
        return;
      }
      if (!result.address) {
        toast.error("This pin doesn't have an address. Select a more precise location on the map.");
        return;
      }
      if (placeId && !result.place_id) result.place_id = placeId;
      onConfirm(result);
      onOpenChange(false);
    } catch (err) {
      console.error("[MapLocationModal] reverse geocode failed", err);
      toast.error("Reverse geocoding failed");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Select Location from Map
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <label htmlFor="property-map-search" className="text-xs font-medium text-muted-foreground">Search a location</label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 mt-1">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input id="property-map-search" type="search" autoComplete="off" value={search}
                onChange={(event) => setSearch(event.target.value)} placeholder="Search address, area or landmark"
                className="w-full h-11 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
              {(searching || selecting) && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
            {matches.length > 0 && <div role="listbox" aria-label="Location results" className="absolute z-20 top-full w-full max-h-52 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
              {matches.map((item) => <Button key={item.placeId} type="button" variant="ghost" role="option" aria-selected={false}
                className="h-auto min-h-10 w-full justify-start text-left whitespace-normal" onClick={() => void selectResult(item)}>
                <MapPin className="h-4 w-4 shrink-0 mr-2" />{item.text}
              </Button>)}
            </div>}
          </div>
          {address && <p className="text-xs text-muted-foreground break-words">Selected pin: {address}</p>}

          <GoogleMapPicker
            lat={lat}
            lng={lng}
            onChange={(la, ln) => {
              setLat(la);
              setLng(ln);
              setPlaceId(undefined); // pin moved manually
              setAddress("");
            }}
            label="Tap on the map or drag the pin to fine-tune"
            height="360px"
            allowManualCoordinates={!mapOnly}
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming || selecting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={confirming || selecting || lat === null || lng === null}>
            {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MapLocationModal;
