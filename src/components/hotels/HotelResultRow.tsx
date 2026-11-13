import { Children, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Hotel, Heart, MapPin, Star, ChevronLeft, ChevronRight, ArrowRight, Check } from "lucide-react";
import { amenityIcon, amenityLabel, formatReviewCount } from "@/lib/hotelDiscoveryMeta";

export interface DiscoveryHotel {
  id: string; name: string; city: string; locality: string;
  images: string[] | null; amenities: string[] | null; star_rating: number | null;
  price_per_night: number; discount_percentage: number | null;
  // Optional real-data extras supplied by the listing page. Each is shown only
  // when present, so nothing here is invented.
  tags?: string[] | null;
  review_count?: number | null;
  avg_rating?: number | null;
  distance_km?: number | null;
  free_cancellation?: boolean | null;
  breakfast_included?: boolean | null;
  rental_price?: number | null;
  rental_period?: "month" | "week";
  location_label?: string;
  lowest_room_type?: string | null;
  original_price?: number | null;
  meals_included?: boolean;
}

const photoCounter = (photo: number, total: number) => `${photo + 1}/${total}`;

export default function HotelResultRow({ hotel, favorite, onFavorite, onDetails, children, grid = false, selected = false, onSelect, nights = null }: {
  hotel: DiscoveryHotel; favorite: boolean; onFavorite: (event: React.MouseEvent) => void;
  onDetails: () => void; children?: ReactNode; grid?: boolean; selected?: boolean; onSelect?: () => void; nights?: number | null;
}) {
  const [photo, setPhoto] = useState(0);
  const images = hotel.images || [];
  const amenities = [...new Set(hotel.amenities || [])];
  const visibleAmenities = grid ? 2 : 4;
  const rental = hotel.rental_period != null;
  const displayPrice = rental ? hotel.rental_price : hotel.price_per_night;
  const discount = !rental && hotel.discount_percentage && hotel.discount_percentage > 0 && hotel.discount_percentage < 100 ? hotel.discount_percentage : null;
  const originalPrice = hotel.original_price && hotel.original_price > hotel.price_per_night ? hotel.original_price : null;
  const tags = (hotel.tags || []).filter(Boolean);
  const imageBadge = tags[0] || (hotel.star_rating ? `${hotel.star_rating}-Star` : null);
  const hasReviews = !!hotel.review_count && hotel.review_count > 0;
  const locationText = hotel.location_label ?? [hotel.locality, hotel.city].filter(Boolean).join(", ");
  const childItems = Children.toArray(children);
  const partner = <Badge variant="outline" className="shrink-0 border-primary/30 bg-accent px-1.5 py-0 text-[9px] font-medium text-primary">JaagaX Partner</Badge>;
  const reviews = hasReviews && hotel.avg_rating != null ? <span className="flex items-center gap-1 text-[11px]"><span className="hotel-review-score rounded px-1.5 py-0.5 font-bold">{hotel.avg_rating.toFixed(1)}</span><span className="text-muted-foreground">({formatReviewCount(hotel.review_count || 0)} reviews)</span></span> : null;
  const location = locationText ? <p className="flex items-start gap-1 text-[11px] text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" /><span className="min-w-0">{locationText}{hotel.distance_km != null && <span> · {hotel.distance_km} km from city centre (straight-line)</span>}</span></p> : null;
  const specialties = tags.length > 0 ? <div className="flex flex-wrap gap-1">{tags.slice(0, 3).map((t, i) => <Badge key={t} variant="outline" className={`border-0 px-2 py-0.5 text-[9px] font-medium ${i === 1 ? "hotel-specialty-business" : i === 0 ? "bg-secondary text-secondary-foreground" : "bg-accent text-primary"}`}>{t}</Badge>)}</div> : null;
  const benefits = (hotel.free_cancellation || hotel.breakfast_included || hotel.meals_included) ? <div className="space-y-1">
    {hotel.free_cancellation && <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Check className="h-3 w-3 text-primary" />Free cancellation · conditions apply</p>}
    {(hotel.breakfast_included || hotel.meals_included) && <p className="flex items-center gap-1 text-[10px] text-muted-foreground"><Check className="h-3 w-3 text-primary" />{hotel.breakfast_included ? "Breakfast included" : "Meals included"}</p>}
  </div> : null;

  const media = (heightClass: string) => (
    <div className={`relative ${heightClass} shrink-0 overflow-hidden rounded-lg bg-muted`}>
      <Button variant="ghost" className="block h-full min-h-28 w-full p-0" onClick={onDetails} aria-label={`View ${hotel.name}`}>
        {images[photo] ? <img src={images[photo]} alt={hotel.name} className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center"><Hotel className="h-12 w-12 text-muted-foreground" /></div>}
      </Button>
      {imageBadge && <Badge className="absolute left-2 top-2 border-0 bg-primary text-[9px] font-semibold text-primary-foreground shadow-sm">{imageBadge}</Badge>}
      {images.length > 1 && <><Button size="icon" variant="secondary" className="absolute left-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full" aria-label={`Previous photo of ${hotel.name}`} onClick={() => setPhoto((photo + images.length - 1) % images.length)}><ChevronLeft className="h-3.5 w-3.5" /></Button><Button size="icon" variant="secondary" className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full" aria-label={`Next photo of ${hotel.name}`} onClick={() => setPhoto((photo + 1) % images.length)}><ChevronRight className="h-3.5 w-3.5" /></Button><Badge variant="secondary" className="absolute bottom-2 right-2 bg-background/80 text-[9px] backdrop-blur">{photoCounter(photo, images.length)}</Badge></>}
    </div>
  );

  const heart = (
    <Button size="icon" variant="outline" className="h-7 w-7 shrink-0 rounded-full border-border bg-card" aria-label={favorite ? `Unsave ${hotel.name}` : `Save ${hotel.name}`} aria-pressed={favorite} onClick={onFavorite}><Heart className={`h-3.5 w-3.5 ${favorite ? "fill-primary text-primary" : ""}`} /></Button>
  );

  const priceBlock = (compact = false) => (
    <div className="min-w-0 flex-1">
      {!rental && hotel.lowest_room_type && <p className={`mb-0.5 text-[10px] font-medium text-primary ${compact ? "truncate" : ""}`} title={hotel.lowest_room_type}>From · {hotel.lowest_room_type}</p>}
      <p className={`whitespace-nowrap font-bold ${compact ? "truncate text-[13px] text-primary" : "text-lg text-foreground"}`} title={displayPrice != null && displayPrice > 0 ? `₹${displayPrice.toLocaleString("en-IN")} / ${hotel.rental_period || "night"}` : undefined}>{displayPrice != null && displayPrice > 0 ? `₹${displayPrice.toLocaleString("en-IN", { maximumFractionDigits: compact ? 0 : 2 })}` : "Price unavailable"}{!compact && <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">{displayPrice != null && displayPrice > 0 ? `/ ${hotel.rental_period || "night"}` : ""}</span>}</p>
      {discount && originalPrice && <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]"><span className="text-muted-foreground line-through">₹{originalPrice.toLocaleString("en-IN")}</span><Badge className="border-0 bg-accent px-1.5 py-0 text-[9px] font-semibold text-primary">{discount}% OFF</Badge></p>}
      {!rental && !compact && !!nights && nights > 0 && <p className="mt-0.5 text-[11px] text-muted-foreground">{nights} {nights === 1 ? "night" : "nights"} · ₹{(hotel.price_per_night * nights).toLocaleString("en-IN", { maximumFractionDigits: 2 })} per room before taxes</p>}
    </div>
  );

  // ---- Grid (compact card) ----
  if (grid) {
    return <article onMouseEnter={onSelect} className={`flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md ${selected ? "ring-2 ring-primary" : ""}`}>
      {media("h-28 rounded-none")}
      <div className="space-y-1.5 p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1"><Button variant="link" onClick={onDetails} className="block h-auto w-full min-w-0 truncate p-0 text-left text-sm font-bold text-foreground" title={hotel.name}>{hotel.name}</Button>{partner}</div>
          {heart}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">{hotel.star_rating ? <span className="flex items-center gap-0.5" aria-label={`${hotel.star_rating} star hotel`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-3 w-3 ${i < hotel.star_rating ? "hotel-star-filled" : "text-muted-foreground/30"}`} />)}</span> : null}{reviews}</div>
        {location}
        {specialties}
        {!!amenities.length && <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {amenities.slice(0, 3).map(a => { const Icon = amenityIcon(a); return <span key={a} className="flex items-center gap-1 text-[10px] text-muted-foreground"><Icon className="h-3 w-3 shrink-0 text-primary" />{amenityLabel(a)}</span>; })}
          {amenities.length > 3 && <Badge variant="secondary" className="text-[9px]">+{amenities.length - 3}</Badge>}
        </div>}
        {benefits}
        {childItems}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border p-2.5">
        {priceBlock(true)}
        <Button size="sm" onClick={onDetails} className="h-8 shrink-0 gap-1 bg-primary px-2 text-[11px] text-primary-foreground hover:bg-primary-dark">View Details<ArrowRight className="h-3 w-3" /></Button>
      </div>
    </article>;
  }

  // ---- List (wide three-column row) ----
  return <article onMouseEnter={onSelect} className={`overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md ${selected ? "ring-2 ring-primary" : ""}`}>
    <div className="flex flex-col md:grid md:grid-cols-[220px_minmax(0,1fr)_176px]">
      <div className="p-2.5 md:pr-0">
        {media("h-28 md:h-[108px]")}
        {images.length > 1 && <div className="mt-1.5 grid grid-cols-4 gap-1.5">
          {images.slice(0, 4).map((src, i) => <Button key={src + i} variant="ghost" onClick={() => setPhoto(i)} aria-label={`Show photo ${i + 1} of ${hotel.name}`} aria-pressed={i === photo} className={`relative h-7 min-h-0 overflow-hidden rounded-md border p-0 ${i === photo ? "border-primary ring-1 ring-primary" : "border-border"}`}>
            <img src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          </Button>)}
        </div>}
      </div>

      <div className="flex min-w-0 flex-col gap-1 p-2.5 md:py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1"><Button variant="link" onClick={onDetails} className="line-clamp-2 block h-auto w-full min-w-0 whitespace-normal p-0 text-left text-sm font-bold text-foreground" title={hotel.name}>{hotel.name}</Button>{partner}</div>
          {heart}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hotel.star_rating ? <span className="flex items-center gap-0.5" aria-label={`${hotel.star_rating} star hotel`}>{Array.from({ length: 5 }, (_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < hotel.star_rating ? "hotel-star-filled" : "text-muted-foreground/30"}`} />)}</span> : null}
          {reviews}
        </div>

        {location}
        {specialties}

        {!!amenities.length && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-1">
          {amenities.slice(0, visibleAmenities).map(a => { const Icon = amenityIcon(a); return <span key={a} className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Icon className="h-3.5 w-3.5 shrink-0 text-primary" />{amenityLabel(a)}</span>; })}
          {amenities.length > visibleAmenities && <Badge variant="secondary" className="text-[9px]">+{amenities.length - visibleAmenities} more</Badge>}
        </div>}

      </div>

      <div className="flex w-full flex-col justify-between gap-2 border-t border-border p-2.5 md:w-[176px] md:border-l md:border-t-0">
        <div className="space-y-1.5">
          {priceBlock(false)}
          {benefits}
        </div>
        <Button onClick={onDetails} className="w-full gap-1.5 bg-primary text-sm text-primary-foreground hover:bg-primary-dark">View Details<ArrowRight className="h-3.5 w-3.5" /></Button>
        {childItems.length > 0 && <div className="space-y-1.5 pt-1">{childItems}</div>}
      </div>
    </div>
  </article>;
}
