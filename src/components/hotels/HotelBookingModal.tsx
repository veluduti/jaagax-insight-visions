import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarIcon, Users, Loader2, Hotel, ChevronDown, Plus, Minus,
  BedDouble, Eye, AlertCircle, ArrowLeft, Check, Layers,
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CHECKOUT_AFTER_CHECKIN_MSG } from "@/lib/dateRange";
import { useNavigate } from "react-router-dom";
import { inr } from "@/components/hotels/BookingPricingControls";
import { RoomGroupExtras, type GroupSelection } from "@/components/hotels/RoomGroupExtras";
import { payForHotelBooking } from "@/lib/hotelPay";
import { Input } from "@/components/ui/input";
import type { MealType, PricingResult } from "@/lib/hotelPricing";
import {
  buildRoomCombinations, toOccupancyRoom, allocationLabel,
  type OccupancyRoom, type RoomCombination,
} from "@/lib/roomOccupancy";

interface HotelBookingModalProps {
  open: boolean;
  onClose: () => void;
  hotel: {
    id: string;
    name: string;
    price_per_night: number;
    discount_percentage: number | null;
  };
  bookingType: "hotel_only" | "visit_stay";
  initialCheckIn?: Date;
  initialCheckOut?: Date;
  initialGuests?: number;
  initialRooms?: number;
}

interface RoomRow {
  id: string;
  room_type: string;
  category: string | null;
  description: string | null;
  base_price: number;
  max_occupancy: number;
  max_adults: number | null;
  max_children: number | null;
  total_units: number | null;
  amenities: any;
  photos: string[] | null;
  bed_type: string | null;
  view_type: string | null;
  extra_bed_allowed: boolean | null;
  extra_bed_price: number | null;
  is_active: boolean | null;
}

interface RoomQuote {
  loading: boolean;
  perNight: number;
  nights: number;
  error: string | null;
  available: number | null;
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800";
const ymd = (d: Date) => format(d, "yyyy-MM-dd");

type Step = "dates" | "room" | "extras";

const HotelBookingModal = ({
  open,
  onClose,
  hotel,
  bookingType,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  initialRooms,
}: HotelBookingModalProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("dates");
  const [checkIn, setCheckIn] = useState<Date | undefined>(initialCheckIn ?? addDays(new Date(), 1));
  const [checkOut, setCheckOut] = useState<Date | undefined>(initialCheckOut ?? addDays(new Date(), 2));
  const [adults, setAdults] = useState(Math.max(1, initialGuests ?? 2));
  const [numChildren, setNumChildren] = useState(0);
  const [numRooms, setNumRooms] = useState(initialRooms ?? 1);
  const [isGuestDropdownOpen, setIsGuestDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [quotes, setQuotes] = useState<Record<string, RoomQuote>>({});
  const [showAllRooms, setShowAllRooms] = useState(false);
  const [groups, setGroups] = useState<GroupSelection[]>([]);
  const [groupPrices, setGroupPrices] = useState<Record<string, { price: PricingResult | null; error: string | null }>>({});
  const [submitting, setSubmitting] = useState(false);

  const nights = checkIn && checkOut ? Math.max(differenceInDays(checkOut, checkIn), 1) : 1;
  const checkInStr = checkIn ? ymd(checkIn) : "";
  const checkOutStr = checkOut ? ymd(checkOut) : "";
  const totalGuests = adults + numChildren;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsGuestDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset the flow and sync incoming search filters each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setStep("dates");
    setGroups([]);
    setGroupPrices({});
    setShowAllRooms(false);
    if (initialCheckIn) setCheckIn(initialCheckIn);
    if (initialCheckOut) setCheckOut(initialCheckOut);
    if (initialGuests) setAdults(Math.max(1, initialGuests));
    if (initialRooms) setNumRooms(initialRooms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCheckIn?.getTime(), initialCheckOut?.getTime(), initialGuests, initialRooms]);

  // --- Pre-fill guest details from the signed-in account ---
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const meta: any = user.user_metadata || {};
      setGuestEmail((v) => v || user.email || "");
      setGuestName((v) => v || meta.full_name || meta.name || "");
      setGuestPhone((v) => v || user.phone || meta.phone || "");
      const { data: profile } = await (supabase as any)
        .from("profiles").select("full_name, phone, email").eq("id", user.id).maybeSingle();
      if (cancelled || !profile) return;
      if (profile.full_name) setGuestName((v) => v || profile.full_name);
      if (profile.phone) setGuestPhone((v) => v || profile.phone);
      if (profile.email) setGuestEmail((v) => v || profile.email);
    })();
    return () => { cancelled = true; };
  }, [open]);

  // --- Load the hotel manager's actual active rooms ---
  useEffect(() => {
    if (!open || !hotel.id) return;
    let cancelled = false;
    (async () => {
      setLoadingRooms(true);
      const { data } = await (supabase as any)
        .from("hotel_rooms").select("*")
        .eq("hotel_id", hotel.id).eq("is_active", true)
        .order("base_price", { ascending: true });
      if (cancelled) return;
      setRooms((data || []) as RoomRow[]);
      setLoadingRooms(false);
    })();
    return () => { cancelled = true; };
  }, [open, hotel.id]);

  // --- Server-authoritative per-room quote (rate calendar, stop-sell, inventory) ---
  // Quoted for ONE unit so availability and per-night price are room-level facts;
  // the combination engine decides how many units are actually needed.
  useEffect(() => {
    if (!open || step !== "room" || !rooms.length || !checkInStr || !checkOutStr) return;
    let cancelled = false;
    setQuotes({});
    rooms.forEach((room) => {
      setQuotes((p) => ({ ...p, [room.id]: { loading: true, perNight: Number(room.base_price) || 0, nights, error: null, available: null } }));
      (async () => {
        try {
          const { data } = await supabase.functions.invoke("booking-engine-quote", {
            body: {
              hotel_id: hotel.id, room_id: room.id,
              check_in: checkInStr, check_out: checkOutStr,
              adults: 1, children: 0, guests: 1, num_rooms: 1,
            },
          });
          if (cancelled) return;
          const err = (data as any)?.error || null;
          setQuotes((p) => ({
            ...p,
            [room.id]: {
              loading: false,
              perNight: Number((data as any)?.per_night) || Number(room.base_price) || 0,
              nights: Number((data as any)?.nights) || nights,
              error: err,
              available: (data as any)?.available ?? null,
            },
          }));
        } catch (e: any) {
          if (cancelled) return;
          setQuotes((p) => ({
            ...p,
            [room.id]: { loading: false, perNight: Number(room.base_price) || 0, nights, error: e?.message || "Unavailable", available: null },
          }));
        }
      })();
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, rooms, checkInStr, checkOutStr, hotel.id]);

  const quotesReady = rooms.length > 0 && rooms.every((r) => quotes[r.id] && !quotes[r.id].loading);

  /** Bookable inventory per room type for EVERY night of the stay. */
  const pool: OccupancyRoom[] = useMemo(
    () => rooms
      .map((r) => {
        const q = quotes[r.id];
        // A quote error means stop-sell / blocked dates / no inventory.
        const available = q?.error ? 0 : Number(q?.available ?? r.total_units ?? 0);
        return toOccupancyRoom(r, { available, perNight: Number(q?.perNight ?? r.base_price) || 0 });
      })
      .filter((r) => r.available > 0),
    [rooms, quotes],
  );

  /** Rooms that host the whole party on their own, with enough units. */
  const singleMatches = useMemo(
    () => pool.filter((r) =>
      adults <= r.maxAdults && numChildren <= r.maxChildren &&
      totalGuests <= r.maxTotal && r.available >= numRooms),
    [pool, adults, numChildren, totalGuests, numRooms],
  );

  /** Best valid combinations using EXACTLY the requested number of rooms. */
  const exactCombos = useMemo(
    () => (quotesReady
      ? buildRoomCombinations(pool, adults, numChildren, { exactRooms: numRooms, limit: 5 })
      : []),
    [quotesReady, pool, adults, numChildren, numRooms],
  );

  /** Fallback: minimum valid combination when the requested count is not enough. */
  const fallbackCombos = useMemo(
    () => (quotesReady && exactCombos.length === 0 && singleMatches.length === 0
      ? buildRoomCombinations(pool, adults, numChildren, { maxRooms: 6, limit: 4 })
      : []),
    [quotesReady, exactCombos.length, singleMatches.length, pool, adults, numChildren],
  );

  const recommendedRooms = fallbackCombos[0]?.totalRooms ?? null;
  const showSingleList = numRooms === 1 && singleMatches.length > 0;
  const comboList = showSingleList ? [] : (exactCombos.length ? exactCombos : fallbackCombos);

  const otherRooms = useMemo(
    () => rooms.filter((r) => !singleMatches.some((s) => s.id === r.id)),
    [rooms, singleMatches],
  );

  const selectCombo = (combo: RoomCombination) => {
    setGroups(combo.items.map((it) => ({
      roomId: it.room.id,
      roomType: it.room.room_type,
      quantity: it.quantity,
      adults: it.adults,
      children: it.children,
      meals: [] as MealType[],
      extraBeds: 0,
    })));
    setGroupPrices({});
    if (combo.totalRooms !== numRooms) setNumRooms(combo.totalRooms);
    setStep("extras");
  };

  const selectSingleRoom = (room: OccupancyRoom) => {
    setGroups([{
      roomId: room.id,
      roomType: room.room_type,
      quantity: numRooms,
      adults,
      children: numChildren,
      meals: [],
      extraBeds: 0,
    }]);
    setGroupPrices({});
    setStep("extras");
  };

  const patchGroup = (roomId: string, patch: Partial<GroupSelection>) =>
    setGroups((prev) => prev.map((g) => (g.roomId === roomId ? { ...g, ...patch } : g)));

  const handleGroupPrice = (roomId: string, price: PricingResult | null, error: string | null) =>
    setGroupPrices((prev) => ({ ...prev, [roomId]: { price, error } }));

  const totals = useMemo(() => {
    const list = groups.map((g) => groupPrices[g.roomId]?.price).filter(Boolean) as PricingResult[];
    if (!groups.length || list.length !== groups.length) return null;
    const sum = (fn: (p: PricingResult) => number) => list.reduce((s, p) => s + fn(p), 0);
    return {
      roomCharges: sum((p) => p.roomCharges),
      mealTotal: sum((p) => p.mealTotal),
      extraBedTotal: sum((p) => p.extraBedTotal),
      taxableSubtotal: sum((p) => p.taxableSubtotal),
      taxAmount: sum((p) => p.taxAmount),
      grandTotal: sum((p) => p.grandTotal),
      gstRate: list[0].gstRate,
    };
  }, [groups, groupPrices]);

  const priceError = groups.map((g) => groupPrices[g.roomId]?.error).find(Boolean) || null;

  const bump = (type: "adults" | "rooms" | "children", delta: number) => {
    if (type === "adults") setAdults((v) => Math.min(20, Math.max(1, v + delta)));
    if (type === "rooms") setNumRooms((v) => Math.min(10, Math.max(1, v + delta)));
    if (type === "children") setNumChildren((v) => Math.min(10, Math.max(0, v + delta)));
  };

  const goToRooms = () => {
    if (!checkIn || !checkOut) return toast.error("Please select dates");
    if (checkOut <= checkIn) return toast.error(CHECKOUT_AFTER_CHECKIN_MSG);
    setStep("room");
  };

  const handlePayment = async () => {
    if (!groups.length || !checkIn || !checkOut) return;
    if (priceError) return toast.error(priceError);
    if (!guestName.trim() || guestName.trim().length < 2) return toast.error("Please enter your name");
    if (!/^\S+@\S+\.\S+$/.test(guestEmail.trim())) return toast.error("Please enter a valid email");
    if (!/^[+\d][\d\s-]{7,}$/.test(guestPhone.trim())) return toast.error("Please enter a valid phone number");

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please login to book", { description: "Redirecting to login..." });
        onClose();
        navigate("/auth");
        return;
      }

      let bookedByAgentId: string | null = null;
      const { data: agentRow } = await (supabase as any)
        .from("agents").select("id").eq("user_id", user.id).maybeSingle();
      if (agentRow?.id) bookedByAgentId = agentRow.id;

      const bookingId = await payForHotelBooking({
        hotel_id: hotel.id,
        hotel_name: hotel.name,
        groups: groups.map((g) => ({
          room_id: g.roomId,
          quantity: g.quantity,
          adults: g.adults,
          children: g.children,
          extra_beds: g.extraBeds,
          meals: g.meals,
        })),
        check_in: checkInStr,
        check_out: checkOutStr,
        adults,
        children: numChildren,
        num_rooms: groups.reduce((s, g) => s + g.quantity, 0),
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim(),
        guest_phone: guestPhone.trim(),
        user_id: user.id,
        booked_by_agent_id: bookedByAgentId,
      });

      toast.success("Payment successful — booking confirmed!", {
        description: "A confirmation email is on its way.",
      });
      onClose();
      navigate(`/hotels/booking/${bookingId}/confirmed`);
    } catch (err: any) {
      const msg = err?.message || "Please try again";
      if (msg === "Payment cancelled") toast.info("Payment cancelled");
      else toast.error("Payment failed", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const renderRoomCard = (r: RoomRow, occ: OccupancyRoom | undefined, fits: boolean) => {
    const q = quotes[r.id];
    const blocked = !!q?.error || (occ?.available ?? 0) < 1;
    const amenities = Array.isArray(r.amenities) ? r.amenities.slice(0, 4) : [];
    return (
      <div key={r.id} className={cn("rounded-lg border p-3 flex gap-3", blocked && "opacity-70")}>
        <img
          src={r.photos?.[0] || FALLBACK_IMG}
          onError={(e) => ((e.target as HTMLImageElement).src = FALLBACK_IMG)}
          alt={r.room_type}
          className="h-24 w-28 rounded-md object-cover shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold leading-tight">{r.room_type}</div>
              {r.category && <div className="text-xs text-muted-foreground">{r.category}</div>}
            </div>
            <div className="text-right shrink-0">
              {q?.loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="font-bold">{inr(q?.perNight ?? r.base_price)}</div>
                  <div className="text-[10px] text-muted-foreground">/ room / night</div>
                </>
              )}
            </div>
          </div>
          {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
          <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
            {r.bed_type && <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{r.bed_type}</span>}
            {r.view_type && <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{r.view_type}</span>}
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Max {occ?.maxAdults ?? r.max_adults ?? r.max_occupancy} adults
              {occ?.maxChildren ? ` + ${occ.maxChildren} child` : ""} · {occ?.maxTotal ?? r.max_occupancy} guests
            </span>
          </div>
          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {amenities.map((a: string) => (
                <Badge key={a} variant="secondary" className="text-[10px] font-normal">{a}</Badge>
              ))}
            </div>
          )}
          {blocked ? (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {q?.error || "Not available for these dates"}
            </p>
          ) : (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-emerald-500 flex items-center gap-1">
                {fits && <Check className="h-3 w-3" />}
                {fits ? "Fits all guests" : "Cannot host your whole group"}
                {occ?.available != null ? ` · ${occ.available} left` : ""}
              </span>
              <Button
                size="sm"
                disabled={!fits || q?.loading || (occ?.available ?? 0) < numRooms}
                onClick={() => occ && selectSingleRoom(occ)}
              >
                Select Room
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hotel className="h-5 w-5 text-primary" />
            {bookingType === "visit_stay" ? "Book with Site Visit" : "Book Hotel"}
          </DialogTitle>
          <DialogDescription>{hotel.name}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          {(["dates", "room", "extras"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold",
                step === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}>{i + 1}</div>
              <span className={step === s ? "font-medium" : "text-muted-foreground"}>
                {s === "dates" ? "Dates & guests" : s === "room" ? "Select room" : "Meals & price"}
              </span>
              {i < 2 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* ---------------- STEP 1 : DATES & GUESTS ---------------- */}
        {step === "dates" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Check-in</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkIn && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkIn ? format(checkIn, "MMM dd, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single" selected={checkIn}
                      onSelect={(d) => {
                        if (!d) return;
                        setCheckIn(d);
                        if (checkOut && checkOut.getTime() <= d.getTime()) setCheckOut(addDays(d, 1));
                      }}
                      disabled={(d) => d < new Date(new Date().toDateString())}
                      initialFocus className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Check-out</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkOut && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkOut ? format(checkOut, "MMM dd, yyyy") : "Select"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single" selected={checkOut} onSelect={setCheckOut}
                      disabled={(d) => d <= (checkIn || new Date())}
                      initialFocus className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-1.5" ref={dropdownRef}>
              <Label>Rooms & Guests</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsGuestDropdownOpen(!isGuestDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-input bg-background hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {numRooms} Room{numRooms > 1 ? "s" : ""}, {adults} Adult{adults > 1 ? "s" : ""}
                    {numChildren > 0 && `, ${numChildren} Child${numChildren > 1 ? "ren" : ""}`}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isGuestDropdownOpen && "rotate-180")} />
                </button>

                {isGuestDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-popover rounded-lg border shadow-lg z-50 p-4">
                    {([
                      { key: "rooms", label: "Rooms", hint: "Max 10", value: numRooms, min: 1 },
                      { key: "adults", label: "Adults", hint: "Age 18+", value: adults, min: 1 },
                      { key: "children", label: "Children", hint: "0 - 17 years", value: numChildren, min: 0 },
                    ] as const).map((row, idx) => (
                      <div key={row.key}>
                        {idx > 0 && <Separator className="my-2" />}
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <span className="text-sm font-medium">{row.label}</span>
                            <p className="text-xs text-muted-foreground">{row.hint}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => bump(row.key as any, -1)} disabled={row.value <= row.min}
                              className={cn("h-8 w-8 rounded-full border flex items-center justify-center", row.value <= row.min ? "opacity-50 cursor-not-allowed" : "hover:bg-muted")}>
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-sm font-medium w-6 text-center">{row.value}</span>
                            <button type="button" onClick={() => bump(row.key as any, 1)}
                              className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-muted">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full mt-3" onClick={() => setIsGuestDropdownOpen(false)}>Apply</Button>
                  </div>
                )}
              </div>
            </div>

            <Button className="w-full h-11" onClick={goToRooms}>
              Search rooms · {nights} night{nights > 1 ? "s" : ""}
            </Button>
          </div>
        )}

        {/* ---------------- STEP 2 : OCCUPANCY-AWARE ROOM SELECTION ---------------- */}
        {step === "room" && (
          <div className="space-y-3">
            <button className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground" onClick={() => setStep("dates")}>
              <ArrowLeft className="h-3 w-3" /> {checkInStr} → {checkOutStr} · {numRooms} room{numRooms > 1 ? "s" : ""} · {adults} adult{adults > 1 ? "s" : ""}{numChildren ? `, ${numChildren} child` : ""}
            </button>

            {(loadingRooms || !quotesReady) && rooms.length >= 0 &&
              [1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}

            {!loadingRooms && rooms.length === 0 && (
              <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                This hotel hasn't published any rooms yet.
              </div>
            )}

            {quotesReady && (
              <>
                {/* Case 1 — a single room type fits the whole group */}
                {showSingleList && (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Rooms that can host {adults} adult{adults > 1 ? "s" : ""}
                      {numChildren ? ` and ${numChildren} child${numChildren > 1 ? "ren" : ""}` : ""}.
                    </p>
                    {singleMatches.map((occ) => {
                      const raw = rooms.find((r) => r.id === occ.id)!;
                      return renderRoomCard(raw, occ, true);
                    })}
                  </>
                )}

                {/* Case 2 — needs a combination */}
                {!showSingleList && comboList.length > 0 && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm space-y-1">
                      <div className="flex items-center gap-2 font-medium">
                        <Layers className="h-4 w-4" /> Your group needs more than one room.
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {adults} Adult{adults > 1 ? "s" : ""}
                        {numChildren ? ` · ${numChildren} Child${numChildren > 1 ? "ren" : ""}` : ""}
                        {" — "}
                        {exactCombos.length
                          ? `valid options for ${numRooms} room${numRooms > 1 ? "s" : ""}`
                          : `${numRooms} room${numRooms > 1 ? "s" : ""} cannot accommodate all selected guests.`}
                      </p>
                      {!exactCombos.length && recommendedRooms && (
                        <p className="text-xs font-semibold">Recommended: {recommendedRooms} rooms</p>
                      )}
                    </div>

                    {comboList.map((combo) => (
                      <div key={combo.key} className="rounded-lg border p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-semibold">
                            Recommended combination · {combo.totalRooms} room{combo.totalRooms > 1 ? "s" : ""}
                          </div>
                          <div className="text-right">
                            <div className="font-bold">{inr(combo.perNightTotal)}</div>
                            <div className="text-[10px] text-muted-foreground">/ night · taxes extra</div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {combo.items.flatMap((it) =>
                            it.units.map((u, i) => (
                              <div key={`${it.room.id}-${i}`} className="flex items-center justify-between text-xs rounded-md bg-muted/40 px-2 py-1.5">
                                <span className="font-medium">{it.room.room_type}</span>
                                <span className="text-muted-foreground">{allocationLabel(u)}</span>
                                <span>{inr(it.room.perNight)}</span>
                              </div>
                            )),
                          )}
                        </div>
                        <Button className="w-full" size="sm" onClick={() => selectCombo(combo)}>
                          {combo.totalRooms === numRooms
                            ? `Select These ${combo.totalRooms} Room${combo.totalRooms > 1 ? "s" : ""}`
                            : `Use ${combo.totalRooms} Rooms`}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Nothing can host the group */}
                {!showSingleList && comboList.length === 0 && (
                  <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                    No available rooms can accommodate {adults} adult{adults > 1 ? "s" : ""}
                    {numChildren ? ` and ${numChildren} child${numChildren > 1 ? "ren" : ""}` : ""} for these dates.
                    Try different dates or reduce the number of guests.
                  </div>
                )}

                {/* Other room options */}
                {otherRooms.length > 0 && (
                  <>
                    <Button variant="ghost" size="sm" className="w-full"
                      onClick={() => setShowAllRooms((v) => !v)}>
                      {showAllRooms ? "Hide other room options" : "View Other Room Options"}
                    </Button>
                    {showAllRooms && otherRooms.map((r) => {
                      const occ = pool.find((p) => p.id === r.id);
                      const fits = !!occ && adults <= occ.maxAdults && numChildren <= occ.maxChildren
                        && totalGuests <= occ.maxTotal;
                      return renderRoomCard(r, occ, fits);
                    })}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ---------------- STEP 3 : MEALS, EXTRA BEDS, LIVE PRICE ---------------- */}
        {step === "extras" && groups.length > 0 && (
          <div className="space-y-4">
            <button className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground" onClick={() => setStep("room")}>
              <ArrowLeft className="h-3 w-3" /> Change room selection
            </button>

            <div className="rounded-lg border p-3 text-xs text-muted-foreground">
              {checkInStr} → {checkOutStr} · {nights} night{nights > 1 ? "s" : ""} ·{" "}
              {groups.reduce((s, g) => s + g.quantity, 0)} room(s) · {adults} adult{adults > 1 ? "s" : ""}
              {numChildren ? `, ${numChildren} child${numChildren > 1 ? "ren" : ""}` : ""}
            </div>

            {groups.map((g) => (
              <RoomGroupExtras
                key={g.roomId}
                hotelId={hotel.id}
                group={g}
                checkIn={checkInStr}
                checkOut={checkOutStr}
                onChange={(patch) => patchGroup(g.roomId, patch)}
                onPrice={handleGroupPrice}
              />
            ))}

            <Separator />

            {/* Guest details (pre-filled from the signed-in account) */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Guest details</Label>
              <Input placeholder="Full name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input type="email" placeholder="Email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
                <Input type="tel" placeholder="Phone" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
              </div>
            </div>

            <Separator />
            {priceError && <p className="text-xs text-destructive">{priceError}</p>}

            {totals && (
              <div className="space-y-1 text-sm">
                <Row label={`Room charges (${nights} night${nights !== 1 ? "s" : ""})`} value={inr(totals.roomCharges)} />
                {totals.mealTotal > 0 && <Row label="Meals" value={inr(totals.mealTotal)} />}
                {totals.extraBedTotal > 0 && <Row label="Extra beds" value={inr(totals.extraBedTotal)} />}
                <Separator className="my-2" />
                <Row label="Subtotal" value={inr(totals.taxableSubtotal)} />
                <Row label={`GST (${totals.gstRate}%)`} value={inr(totals.taxAmount)} />
                <Separator className="my-2" />
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Grand total</span><span>{inr(totals.grandTotal)}</span>
                </div>
              </div>
            )}

            <Button className="w-full h-12" onClick={handlePayment} disabled={submitting || !!priceError || !totals}>
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing payment...</>
              ) : (
                `Payment · ${inr(totals?.grandTotal || 0)}`
              )}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">
              Secure payment via Razorpay · UPI, Cards, Netbanking. Final amount is
              recalculated and confirmed by our servers before payment.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default HotelBookingModal;
