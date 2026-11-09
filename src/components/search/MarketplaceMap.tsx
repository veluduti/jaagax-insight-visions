import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasPropertyPin, type MarketplaceProperty } from '@/lib/propertyMarketplace';
import { formatListingPrice } from '@/lib/propertyDisplay';
import { openInNewTab, propertyPath } from '@/lib/openInNewTab';
export default function MarketplaceMap({properties}:{properties:MarketplaceProperty[]}) {
  const element=useRef<HTMLDivElement>(null), map=useRef<mapboxgl.Map|null>(null);
  const [ready,setReady]=useState(false),[error,setError]=useState(''),[selected,setSelected]=useState<MarketplaceProperty|null>(null);
  const pinned=properties.filter(hasPropertyPin);
  useEffect(()=>{
    if (!element.current || !pinned.length) return;
    if (!mapboxgl.supported()) {setError('The map is unavailable on this device.');return;}
    mapboxgl.accessToken=import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibHVja3kwNDEyIiwiYSI6ImNtaHFudzc3YTBqazUya3F6ZGt1dGg4bTkifQ.R8ZlF_DjnQCX0Y1pS47a-Q';
    const m=new mapboxgl.Map({container:element.current,style:'mapbox://styles/mapbox/streets-v12',center:[Number(pinned[0].longitude),Number(pinned[0].latitude)],zoom:11});
    map.current=m; m.addControl(new mapboxgl.NavigationControl(),'bottom-left');m.on('load',()=>setReady(true));m.on('error',()=>setError('The map could not load. Browse the listings below.'));
    return ()=>{m.remove();map.current=null;setReady(false);};
  },[pinned.length>0]);
  useEffect(()=>{
    const m=map.current;if(!m||!ready)return;
    const bounds=new mapboxgl.LngLatBounds();
    const markers=pinned.map(p=>{const button=document.createElement('button');button.className='marketplace-map-pin';button.textContent=formatListingPrice(p)||'View';button.setAttribute('aria-label',p.title);button.onclick=()=>setSelected(p);bounds.extend([Number(p.longitude),Number(p.latitude)]);return new mapboxgl.Marker({element:button}).setLngLat([Number(p.longitude),Number(p.latitude)]).addTo(m);});
    if(pinned.length)m.fitBounds(bounds,{padding:35,maxZoom:14});
    if(selected && !properties.some(p=>p.id===selected.id))setSelected(null);
    return ()=>markers.forEach(marker=>marker.remove());
  },[properties,ready]);
  return <div className="relative h-[260px] overflow-hidden rounded-md bg-muted" aria-label="Property locations map"><div ref={element} className="absolute inset-0"/>{(!pinned.length||error)&&<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground"><MapPin className="h-8 w-8 text-primary"/><p className="text-xs">{error||'These properties do not have saved map locations yet.'}</p></div>}{selected&&<div className="absolute bottom-2 left-2 right-2 rounded-md bg-card p-3 shadow-md"><p className="line-clamp-2 text-xs font-bold">{selected.title}</p><Button variant="link" className="h-7 p-0 text-xs" onClick={()=>openInNewTab(propertyPath(selected))}>View Details →</Button></div>}</div>;
}
