import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MapPin, Bed, Bath, Square, ShieldCheck, ArrowRight, MessageCircle, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatListingPrice, formatArea, getPropertyImages, getPropertyTypeLabel, getListingIntentLabel } from '@/lib/propertyDisplay';
import { agentPublicLabel } from '@/lib/agentPrivacy';
import { propertyPath } from '@/lib/openInNewTab';
import type { MarketplaceProperty } from '@/lib/propertyMarketplace';
export default function MarketplacePropertyCard({property:p,agent,favorite,busy,onFavorite,grid}:{property:MarketplaceProperty;agent?:any;favorite:boolean;busy:boolean;onFavorite:()=>void;grid:boolean}) {
  const [photo,setPhoto]=useState(0),[failed,setFailed]=useState(false);
  const images=getPropertyImages(p.images), area=formatArea(p),beds=p.bedrooms??p.bhk;
  return <article className={`marketplace-property ${grid?'marketplace-property-grid':''}`}>
    <div className="marketplace-property-photo">
      {images.length&&!failed?<img src={images[photo%images.length]} alt={p.title} loading="lazy" onError={()=>setFailed(true)}/>:<div className="flex h-full items-center justify-center gap-2 text-xs text-muted-foreground"><Building2 className="h-6 w-6"/>No photos uploaded</div>}
      {p.is_featured&&<span className="absolute left-2 top-2 rounded bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">Featured</span>}
      <Button variant="secondary" size="icon" className="absolute right-2 top-2 h-7 w-7 rounded-full" aria-label={favorite?'Remove saved property':'Save property'} aria-pressed={favorite} disabled={busy} onClick={onFavorite}><Heart className={`h-4 w-4 ${favorite?'fill-primary text-primary':''}`}/></Button>
      {images.length>1&&<div className="absolute bottom-2 left-2 right-2 flex justify-between"><Button variant="secondary" size="icon" className="h-6 w-6" aria-label="Previous property photo" onClick={()=>{setPhoto((photo+images.length-1)%images.length);setFailed(false);}}><ChevronLeft className="h-3 w-3"/></Button><Button variant="secondary" size="icon" className="h-6 w-6" aria-label="Next property photo" onClick={()=>{setPhoto((photo+1)%images.length);setFailed(false);}}><ChevronRight className="h-3 w-3"/></Button></div>}
    </div>
    <div className="min-w-0 flex-1 py-1">
      <div className="mb-2 flex flex-wrap gap-1.5 text-[10px]"><span className="rounded bg-accent px-1.5 py-0.5 text-primary">{getListingIntentLabel(p)}</span>{p.verified&&<span className="flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-primary"><ShieldCheck className="h-3 w-3"/>Verified Property</span>}{p.completion_stage&&<span className="rounded bg-secondary px-1.5 py-0.5">{String(p.completion_stage).replace(/_/g,' ')}</span>}</div>
      <Link to={propertyPath(p)} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-bold hover:text-primary">{p.title}</Link>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3 shrink-0"/><span className="line-clamp-1">{[p.locality,p.city].filter(Boolean).join(', ')||'Location not provided'}</span></p>
      <p className="my-2 text-lg font-bold text-primary">{formatListingPrice(p)||'Price on request'}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">{beds>0&&<span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5"/>{beds} Beds</span>}{p.bathrooms>0&&<span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5"/>{p.bathrooms} Baths</span>}{area&&<span className="flex items-center gap-1"><Square className="h-3.5 w-3.5"/>{area}</span>}<span>{getPropertyTypeLabel(p)}</span></div>
    </div>
    <div className="marketplace-property-actions">
      <div className="min-w-0"><p className="mb-1 text-[10px] text-muted-foreground">Listed by</p>{agent?<div className="flex items-center gap-2">{agent.photo_url&&<img src={agent.photo_url} alt="" className="h-8 w-8 rounded-full object-cover"/>}<div className="min-w-0"><p className="truncate text-xs font-bold">{agentPublicLabel(agent)}</p>{agent.agency_name&&<p className="truncate text-[10px] text-muted-foreground">{agent.agency_name}</p>}</div></div>:<p className="text-xs font-semibold capitalize">{p.listed_by||'Property owner'}</p>}</div>
      <div className="mt-3 flex gap-1.5"><Button asChild variant="outline" className="h-8 flex-1 px-2 text-[11px] text-primary"><Link to={propertyPath(p)} target="_blank" rel="noopener noreferrer">View Details <ArrowRight className="ml-1 h-3 w-3"/></Link></Button><Button asChild className="h-8 flex-1 px-2 text-[11px]"><Link to={`${propertyPath(p)}#contact`} target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-1 h-3 w-3"/>Contact</Link></Button></div>
    </div>
  </article>;
}
