import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hotel, Heart, MapPin, Star, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

export interface DiscoveryHotel {
  id: string; name: string; city: string; locality: string;
  images: string[] | null; amenities: string[] | null; star_rating: number | null;
  price_per_night: number; discount_percentage: number | null;
}

export default function HotelResultRow({ hotel, favorite, onFavorite, onDetails, onBook, children, grid = false, selected = false, onSelect }: {
  hotel: DiscoveryHotel; favorite: boolean; onFavorite: (event: React.MouseEvent) => void;
  onDetails: () => void; onBook: () => void; children?: ReactNode; grid?: boolean; selected?: boolean; onSelect?: () => void;
}) {
  const [photo, setPhoto] = useState(0);
  const images = hotel.images || [];
  return <article onMouseEnter={onSelect} className={`overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md ${selected ? "ring-2 ring-primary" : ""} ${grid ? "flex flex-col" : "grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] "}`}>
    <div className="relative h-40 shrink-0 overflow-hidden bg-muted">
      <Button variant="ghost" className="block h-full min-h-40 w-full p-0" onClick={onDetails} aria-label={`View ${hotel.name}`}>
        {images[photo] ? <img src={images[photo]} alt={hotel.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <div className="flex h-44 w-full items-center justify-center"><Hotel className="h-12 w-12 text-muted-foreground" /></div>}
      </Button>
      <Button size="icon" variant="secondary" className="absolute right-2 top-2 h-8 w-8 rounded-full" aria-label={favorite ? `Unsave ${hotel.name}` : `Save ${hotel.name}`} aria-pressed={favorite} onClick={onFavorite}><Heart className={`h-4 w-4 ${favorite ? "fill-primary text-primary" : ""}`} /></Button>
      {images.length > 1 && <><Button size="icon" variant="secondary" className="absolute left-2 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full" aria-label={`Previous photo of ${hotel.name}`} onClick={() => setPhoto((photo + images.length - 1) % images.length)}><ChevronLeft className="h-4 w-4" /></Button><Button size="icon" variant="secondary" className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full" aria-label={`Next photo of ${hotel.name}`} onClick={() => setPhoto((photo + 1) % images.length)}><ChevronRight className="h-4 w-4" /></Button><Badge variant="secondary" className="absolute bottom-2 right-2 text-[10px]">{photo + 1} / {images.length} photos</Badge></>}
    </div>
    <div className="space-y-2 p-3">
      <Button variant="link" onClick={onDetails} className="h-auto justify-start p-0 text-left text-sm font-bold text-foreground whitespace-normal">{hotel.name}</Button>
      <div className="flex flex-wrap items-center gap-2">{hotel.star_rating ? <span className="flex items-center gap-0.5" aria-label={`${hotel.star_rating} star hotel`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < hotel.star_rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />)}</span> : null}<Badge variant="outline" className="border-primary/30 bg-accent text-xs text-primary">JaagaX Partner</Badge></div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" />{[hotel.locality, hotel.city].filter(Boolean).join(", ") || "Location not provided"}</p>
      <div className="flex flex-wrap gap-1.5">{hotel.amenities?.slice(0, 5).map(a => <Badge key={a} variant="secondary" className="text-[10px] font-normal">{a}</Badge>)}{(hotel.amenities?.length || 0) > 5 && <Badge variant="secondary" className="text-[10px]">+{(hotel.amenities?.length || 0) - 5}</Badge>}</div>
      {children}
    </div>
    <div className={`flex items-center justify-between gap-3 border-t border-border p-3 ${grid ? "mt-auto" : "md:col-span-2"}`}>
      <div className="min-w-0">{!!hotel.discount_percentage && hotel.discount_percentage > 0 && <Badge variant="secondary" className="mb-2 bg-accent text-primary">{hotel.discount_percentage}% offer</Badge>}<p className="text-base font-bold text-foreground">₹{hotel.price_per_night.toLocaleString("en-IN")}<span className="ml-1 text-xs font-normal text-muted-foreground">/night</span></p></div>
      <div className="space-y-1 shrink-0"><Button onClick={onBook} className="h-8 w-full px-3 text-xs">Book Now</Button><Button variant="link" onClick={onDetails} className="h-7 w-full gap-1 text-xs">View Details<ArrowRight className="h-3 w-3" /></Button></div>
    </div>
  </article>;
}