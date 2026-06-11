import GoogleMapPicker from "@/components/location/GoogleMapPicker";

interface MapLocationPickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  label?: string;
  height?: string;
}

/**
 * Backwards-compatible wrapper — now powered by Google Maps via GoogleMapPicker.
 * Same props/behaviour as the previous Mapbox version.
 */
const MapLocationPicker = (props: MapLocationPickerProps) => <GoogleMapPicker {...props} />;

export default MapLocationPicker;
