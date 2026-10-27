import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hotel, Heart, MapPin, Star, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

export interface DiscoveryHotel {
  id: string; name: string; city: string; locality: string;
  images: string[] | null; amenities: string[] | null; star_rating: number | null;
  price_per_night: number; discount_percentage: number | null;
}

export default function HotelResultRow({ hotel, favorite, onFavorite, onDetails, children, grid = false, selected = false, onSelect }: {
  hotel: DiscoveryHotel; favorite: boolean; onFavorite: (event: React.MouseEvent) => void;
  onDetails: () => void; children?: ReactNode; grid?: boolean; selected?: boolean; onSelect?: () => void;
}) {
  const [photo, setPhoto] = useState(0);
  const images = hotel.images || [];
  const visibleAmenities = grid ? 2 : 5;
  return <article onMouseEnter={onSelect} className={`flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md ${selected ? "ring-2 ring-primary" : ""} ${grid ? "" : "md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-4 "}`}>
    <div className={`relative ${grid ? "h-28" : "h-40 md:h-full"} shrink-0 overflow-hidden bg-muted`}>
      <Button variant="ghost" className="block h-full min-h-28 w-full p-0" onClick={onDetails} aria-label={`View ${hotel.name}`}>
        {images[photo] ? <img src={images[photo]} alt={hotel.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center"><Hotel className="h-12 w-12 text-muted-foreground" /></div>}
      </Button>
      <Button size="icon" variant="secondary" className="absolute right-2 top-2 h-7 w-7 rounded-full" aria-label={favorite ? `Unsave ${hotel.name}` : `Save ${hotel.name}`} aria-pressed={favorite} onClick={onFavorite}><Heart className={`h-3.5 w-3.5 ${favorite ? "fill-primary text-primary" : ""}`} /></Button>
      {images.length > 1 && <><Button size="icon" variant="secondary" className="absolute left-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full" aria-label={`Previous photo of ${hotel.name}`} onClick={() => setPhoto((photo + images.length - 1) % images.length)}><ChevronLeft className="h-3.5 w-3.5" /></Button><Button size="icon" variant="secondary" className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full" aria-label={`Next photo of ${hotel.name}`} onClick={() => setPhoto((photo + 1) % images.length)}><ChevronRight className="h-3.5 w-3.5" /></Button><Badge variant="secondary" className="absolute bottom-2 right-2 text-[9px]">{photo + 1} / {images.length} photos</Badge></>}
    </div>
    <div className="space-y-1.5 p-2.5">
      <Button variant="link" onClick={onDetails} className="h-auto w-full justify-start p-0 text-left text-sm font-bold text-foreground line-clamp-1">{hotel.name}</Button>
      <div className="flex flex-wrap items-center gap-1.5">{hotel.star_rating ? <span className="flex items-center gap-0.5" aria-label={`${hotel.star_rating} star hotel`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-3 w-3 ${i < hotel.star_rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />)}</span> : null}<Badge variant="outline" className="border-primary/30 bg-accent px-1.5 py-0 text-[10px] text-primary">JaagaX Partner</Badge></div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /><span className="line-clamp-1">{[hotel.locality, hotel.city].filter(Boolean).join(", ") || "Location not provided"}</span></p>
      <div className="flex flex-wrap gap-1">{hotel.amenities?.slice(0, visibleAmenities).map(a => <Badge key={a} variant="secondary" className="text-[9px] font-normal">{a}</Badge>)}{(hotel.amenities?.length || 0) > visibleAmenities && <Badge variant="secondary" className="text-[9px]">+{(hotel.amenities?.length || 0) - visibleAmenities}</Badge>}</div>
      {children}
    </div>
    <div className="mt-auto flex items-center justify-between gap-2 border-t border-border p-2.5">
      <div className="min-w-0">{!!hotel.discount_percentage && hotel.discount_percentage > 0 && <Badge variant="secondary" className="mb-1 bg-accent px-1.5 py-0 text-[9px] text-primary">{hotel.discount_percentage}% offer</Badge>}<p className="whitespace-nowrap text-sm font-bold text-foreground">₹{hotel.price_per_night.toLocaleString("en-IN")}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">/night</span></p></div>
      <Button variant="link" onClick={onDetails} className="h-auto shrink-0 gap-1 p-0 text-xs text-primary">View Details<ArrowRight className="h-3 w-3" /></Button>
    </div>
  </article>;
}
