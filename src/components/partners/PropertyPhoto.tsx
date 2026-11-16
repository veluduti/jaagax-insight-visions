import { useEffect,useState } from "react";
import { propertyPhotoUrl } from "@/services/hospitality/partnerDashboardService";
import { Image } from "lucide-react";
export default function PropertyPhoto({src,alt}:{src:string;alt:string}) {
  const [url,setUrl]=useState<string|null>(null);
  useEffect(()=>{let alive=true;void propertyPhotoUrl(src).then(v=>{if(alive)setUrl(v);});return()=>{alive=false;};},[src]);
  return url?<img src={url} alt={alt} onError={()=>setUrl(null)}/>:<div className="flex h-full min-h-16 items-center justify-center bg-muted text-muted-foreground" aria-label="Photo unavailable"><Image className="h-6 w-6"/></div>;
}