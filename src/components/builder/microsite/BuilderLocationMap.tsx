import { memo } from "react";
import GoogleStaticMarkerMap from "@/components/location/GoogleStaticMarkerMap";

interface BuilderLocationMapProps {
  lat: number;
  lng: number;
  builderName: string;
  height?: string;
}

const BuilderLocationMap = ({ lat, lng, builderName, height = "400px" }: BuilderLocationMapProps) => (
  <GoogleStaticMarkerMap lat={lat} lng={lng} label={builderName} height={height} zoom={15} />
);

export default memo(BuilderLocationMap);
