import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import InlineLocationSearch from "./InlineLocationSearch";
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
}

function pick(components: any[], type: string): string {
  const m = components?.find((c) => (c.types || []).includes(type));
  return m?.long_name || m?.longText || m?.short_name || m?.shortText || "";
}

/**
 * Modal that lets the user search & pin a location on Google Maps, then
 * reverse-geocodes the final coordinates into a fully-populated address.
 */
const MapLocationModal = ({ open, onOpenChange, initial, onConfirm }: Props) => {
  const [lat, setLat] = useState<number | null>(initial?.latitude ?? null);
  const [lng, setLng] = useState<number | null>(initial?.longitude ?? null);
  const [placeId, setPlaceId] = useState<string | undefined>(initial?.place_id);
  const [address, setAddress] = useState<string>(initial?.address ?? "");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (open) {
      setLat(initial?.latitude ?? null);
      setLng(initial?.longitude ?? null);
      setPlaceId(initial?.place_id);
      setAddress(initial?.address ?? "");
    }
  }, [open]);

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
      country: d.country || "India",
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
    if (lat === null || lng === null) {
      toast.error("Please search or tap on the map to drop a pin");
      return;
    }
    setConfirming(true);
    try {
      const result = await reverseGeocode(lat, lng);
      if (!result) {
        toast.error("Couldn't resolve that location. Try another spot.");
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
          <div>
            <label className="text-xs font-medium text-muted-foreground">Search a place</label>
            <InlineLocationSearch
              variant="box"
              placeholder="Search city, locality, area, landmark…"
              initialValue={address}
              persistSavedLocation={false}
              onTextChange={(t) => setAddress(t)}
              onSelected={(loc) => {
                setLat(loc.latitude);
                setLng(loc.longitude);
                setPlaceId(loc.placeId);
                setAddress(loc.formattedAddress || address);
              }}
            />
          </div>

          <GoogleMapPicker
            lat={lat}
            lng={lng}
            onChange={(la, ln) => {
              setLat(la);
              setLng(ln);
              setPlaceId(undefined); // pin moved manually
            }}
            label="Tap on the map or drag the pin to fine-tune"
            height="360px"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={confirming || lat === null || lng === null}>
            {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MapLocationModal;
