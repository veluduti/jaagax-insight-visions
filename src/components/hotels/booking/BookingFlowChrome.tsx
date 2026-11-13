import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Check, Star, MapPin, BadgeCheck, Building2, UtensilsCrossed, Users, Sparkles, Waves, Wifi,
  Dumbbell, Car, ShieldCheck, IndianRupee, CalendarCheck, Headphones, CircleCheck, ArrowRight,
} from "lucide-react";

/** Four-step progress shared by hotel details, checkout and confirmation (native + supplier). */
export const BOOKING_STEPS = [
  { title: "Check Availability", sub: "Select room & rate plan" },
  { title: "Guest Details", sub: "Enter guest information" },
  { title: "Review & Pay", sub: "Confirm booking and payment" },
  { title: "Booking Confirmed", sub: "Get confirmation & details" },
];

export function BookingStepper({ current }: { current: number }) {
  return (
    <ol className="flex items-stretch gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-3 shadow-sm">
      {BOOKING_STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.title} className="flex min-w-[170px] flex-1 items-center gap-2">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${done || active ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
              {done ? <Check className="h-5 w-5" /> : i + 1}
            </span>
            <span className="min-w-0">
              <span className={`block text-sm font-semibold leading-tight ${done || active ? "text-primary" : "text-foreground"}`}>{s.title}</span>
              <span className="block text-[11px] text-muted-foreground">{s.sub}</span>
            </span>
            {i < BOOKING_STEPS.length - 1 && <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/50" />}
          </li>
        );
      })}
    </ol>
  );
}

/** Real average rating and count from published guest reviews. */
export function useHotelReviewStats(hotelId?: string | null) {
  const [stats, setStats] = useState<{ avg: number; count: number } | null>(null);
  useEffect(() => {
    if (!hotelId) return;
    let off = false;
    supabase.from("hotel_reviews").select("rating").eq("hotel_id", hotelId).then(({ data }) => {
      if (off || !data?.length) return;
      const vals = data.map((r: any) => Number(r.rating)).filter((n) => n > 0);
      if (vals.length) setStats({ avg: vals.reduce((a, b) => a + b, 0) / vals.length, count: vals.length });
    });
    return () => { off = true; };
  }, [hotelId]);
  return stats;
}

export function StarRow({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`${size} ${i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`} />
      ))}
    </span>
  );
}

const FACILITY_ICONS: { re: RegExp; label: string; icon: any }[] = [
  { re: /restaurant|dining|food/i, label: "Dining", icon: UtensilsCrossed },
  { re: /banquet|conference|meeting|event/i, label: "Banquet", icon: Users },
  { re: /spa|wellness|massage/i, label: "Spa", icon: Sparkles },
  { re: /pool|swim/i, label: "Pool", icon: Waves },
  { re: /wi-?fi|internet/i, label: "Wi-Fi", icon: Wifi },
  { re: /gym|fitness/i, label: "Gym", icon: Dumbbell },
  { re: /parking/i, label: "Parking", icon: Car },
];

/** Facility tiles derived only from saved star rating, room count and amenities. */
export function facilityTiles(star: number, rooms: number, amenities: string[]) {
  const tiles: { label: string; icon: any }[] = [];
  if (star > 0) tiles.push({ label: `${star} Star`, icon: Star });
  if (rooms > 0) tiles.push({ label: `${rooms} Rooms`, icon: Building2 });
  for (const f of FACILITY_ICONS) {
    if (tiles.length >= 6) break;
    if (amenities.some((a) => f.re.test(a))) tiles.push({ label: f.label, icon: f.icon });
  }
  return tiles;
}

export function HotelHeroHeader(props: {
  name: string; image: string; photoCount?: number; star: number; rooms: number; amenities: string[];
  address: string; mapUrl?: string | null; verified?: boolean; reviews?: { avg: number; count: number } | null;
  onPhotos?: () => void;
}) {
  const tiles = facilityTiles(props.star, props.rooms, props.amenities);
  return (
    <section className="grid gap-5 md:grid-cols-[320px_minmax(0,1fr)]">
      <button type="button" onClick={props.onPhotos} className="relative h-48 overflow-hidden rounded-2xl md:h-[200px]">
        <img src={props.image} alt={props.name} className="h-full w-full object-cover" />
        {props.photoCount ? (
          <span className="absolute bottom-3 left-3 rounded-md bg-foreground/70 px-2 py-1 text-xs font-semibold text-background">{props.photoCount} Photos</span>
        ) : null}
      </button>
      <div className="min-w-0 space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-primary md:text-3xl">{props.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {props.reviews ? (
            <><StarRow value={props.reviews.avg} /><span className="text-muted-foreground">{props.reviews.avg.toFixed(1)} ({props.reviews.count.toLocaleString("en-IN")} Reviews)</span></>
          ) : props.star > 0 ? <StarRow value={props.star} /> : null}
          {props.verified && (
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified Hotel
            </span>
          )}
        </div>
        {props.address && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" /> {props.address}
            {props.mapUrl && <a href={props.mapUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">View on Map</a>}
          </p>
        )}
        {tiles.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {tiles.map((t) => (
              <span key={t.label} className="flex w-[78px] flex-col items-center gap-1 rounded-xl border border-border bg-card py-2 text-xs text-foreground shadow-sm">
                <t.icon className="h-5 w-5 text-primary" /> {t.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function WhyBookCard() {
  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <h3 className="mb-3 text-lg font-bold text-primary">Why Book with Jaaga?</h3>
      <ul className="space-y-2 text-sm">
        {["Verified Hotels", "Best Price Guarantee", "Flexible Cancellation", "24×7 Customer Support", "Secure Payments"].map((t) => (
          <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> {t}</li>
        ))}
      </ul>
    </div>
  );
}

export function TrustStrip() {
  const items = [
    { icon: ShieldCheck, t: "Trusted & Verified Hotels", s: "Only verified and quality-checked properties" },
    { icon: IndianRupee, t: "Best Price Guarantee", s: "Get the best available price, always" },
    { icon: CalendarCheck, t: "Flexible Bookings", s: "Choose plans with free cancellation" },
    { icon: Headphones, t: "24×7 Support", s: "We're here to help, anytime" },
  ];
  return (
    <div className="grid gap-4 rounded-2xl bg-primary/5 p-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((i) => (
        <div key={i.t} className="flex items-center gap-3">
          <i.icon className="h-9 w-9 shrink-0 text-primary" />
          <div><p className="text-sm font-bold text-foreground">{i.t}</p><p className="text-xs text-muted-foreground">{i.s}</p></div>
        </div>
      ))}
    </div>
  );
}

export function PaymentBadges() {
  return (
    <div className="flex items-center justify-center gap-2">
      {["UPI", "VISA", "Mastercard", "RuPay"].map((b) => (
        <span key={b} className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-extrabold italic text-foreground">{b}</span>
      ))}
    </div>
  );
}

export const IncludedTick = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 text-xs"><CircleCheck className="h-3.5 w-3.5 text-primary" />{children}</span>
);
