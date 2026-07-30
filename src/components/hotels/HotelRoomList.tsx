import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BedDouble, Users, Maximize, Check, Coffee, ShieldCheck,
  ChevronLeft, ChevronRight, AlertCircle, Loader2, Layers,
} from "lucide-react";
import { toast } from "sonner";
import { buildRoomCombinations, roomsFittingGuests, comboLabel, type OccupancyRoom } from "@/lib/roomOccupancy";


// Assumed GST rate for hotel room tariff (12% for < ₹7500/night, 18% otherwise).
// Real config should move to hotel_commission_config / a tax table later.
function gstFor(perNight: number) {
  return perNight < 7500 ? 0.12 : 0.18;
}

interface Room {
  id: string;
  room_type: string;
  category: string | null;
  description: string | null;
  base_price: number;
  max_occupancy: number;
  total_units: number;
  amenities: any;
  photos: string[] | null;
  bed_type: string | null;
  size_sqft: number | null;
  view_type: string | null;
  breakfast_included: boolean;
  extra_bed_allowed: boolean;
  extra_bed_price: number | null;
  cancellation_policy: string | null;
  min_nights: number;
}

interface Props {
  hotelId: string;
  hotelName: string;
  hotelCity?: string;
  checkIn?: string;   // YYYY-MM-DD
  checkOut?: string;  // YYYY-MM-DD
  adults?: number;
  children?: number;
  roomsWanted?: number;
}

const FALLBACK_IMG = "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800";

interface RoomQuote {
  loading: boolean;
  available: number;   // available rooms of this type across the range
  perNight: number;    // effective per-night after pricing rules
  nights: number;
  roomTotal: number;
  taxes: number;
  total: number;
}

export default function HotelRoomList({
  hotelId, hotelName, hotelCity,
  checkIn, checkOut, adults = 2, children = 0, roomsWanted = 1,
}: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Record<string, RoomQuote>>({});
  const [galleryIdx, setGalleryIdx] = useState<Record<string, number>>({});
  const navigate = useNavigate();

  // Load rooms
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("hotel_rooms").select("*")
        .eq("hotel_id", hotelId).eq("is_active", true)
        .order("base_price", { ascending: true });
      if (error) { console.error(error); setRooms([]); }
      else setRooms((data || []) as Room[]);
      setLoading(false);
    })();
  }, [hotelId]);

  // Quote each room once we have dates
  useEffect(() => {
    if (!checkIn || !checkOut || rooms.length === 0) return;
    const nights = Math.max(1, Math.round(
      (+new Date(checkOut) - +new Date(checkIn)) / 86400000
    ));

    rooms.forEach((room) => {
      setQuotes((prev) => ({
        ...prev,
        [room.id]: { loading: true, available: 0, perNight: room.base_price, nights, roomTotal: 0, taxes: 0, total: 0 },
      }));

      (async () => {
        try {
          // Availability
          const availRes: any = await (supabase as any).rpc("check_room_availability", {
            _room_id: room.id, _check_in: checkIn, _check_out: checkOut,
          });
          const available = Number(availRes?.data ?? 0);

          // Pricing (reuse existing edge function; falls back to base_price on failure)
          let perNight = Number(room.base_price) || 0;
          try {
            const { data: q, error: qErr } = await supabase.functions.invoke("booking-engine-quote", {
              body: { hotel_id: hotelId, room_id: room.id, check_in: checkIn, check_out: checkOut, guests: adults + children },
            });
            if (!qErr && q && !q.error && q.per_night) perNight = Number(q.per_night);
          } catch { /* keep base */ }

          const roomTotal = perNight * nights * roomsWanted;
          const taxes = Math.round(roomTotal * gstFor(perNight));
          const total = roomTotal + taxes;

          setQuotes((prev) => ({
            ...prev,
            [room.id]: { loading: false, available, perNight, nights, roomTotal, taxes, total },
          }));
        } catch (e) {
          console.error("quote failed", e);
          setQuotes((prev) => ({
            ...prev,
            [room.id]: { loading: false, available: room.total_units, perNight: room.base_price, nights, roomTotal: room.base_price * nights, taxes: 0, total: room.base_price * nights },
          }));
        }
      })();
    });
  }, [rooms, checkIn, checkOut, adults, children, roomsWanted, hotelId]);

  const hasDates = !!(checkIn && checkOut);
  const guests = Math.max(1, (Number(adults) || 0) + (Number(children) || 0));

  // Every room quoted (availability + price resolved)?
  const quotesReady = hasDates && rooms.length > 0 && rooms.every((r) => quotes[r.id] && !quotes[r.id].loading);

  const occupancyPool: OccupancyRoom[] = useMemo(
    () => rooms.map((r) => ({
      id: r.id,
      room_type: r.room_type,
      max_occupancy: Number(r.max_occupancy) || 0,
      available: quotesReady ? Number(quotes[r.id]?.available ?? 0) : Number(r.total_units) || 0,
      perNight: Number(quotes[r.id]?.perNight ?? r.base_price) || 0,
    })),
    [rooms, quotes, quotesReady],
  );

  // Rooms whose occupancy can host the party (given the requested room count)
  const fittingRooms = useMemo(
    () => roomsFittingGuests(rooms, guests, roomsWanted),
    [rooms, guests, roomsWanted],
  );

  const bookableRooms = useMemo(() => {
    if (!quotesReady) return fittingRooms;
    return fittingRooms.filter((r) => Number(quotes[r.id]?.available ?? 0) >= roomsWanted);
  }, [fittingRooms, quotes, quotesReady, roomsWanted]);

  const combinations = useMemo(() => {
    if (!quotesReady || bookableRooms.length > 0) return [];
    return buildRoomCombinations(occupancyPool, guests);
  }, [quotesReady, bookableRooms.length, occupancyPool, guests]);

  const displayRooms = quotesReady ? bookableRooms : fittingRooms;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">This hotel hasn't published any rooms yet.</p>
      </Card>
    );
  }

  const goCheckout = (roomId: string, qty: number) => {
    if (!hasDates) { toast.info("Please select check-in and check-out dates first"); return; }
    const params = new URLSearchParams({
      room: roomId,
      checkin: checkIn!,
      checkout: checkOut!,
      adults: String(adults ?? 2),
      children: String(children ?? 0),
      rooms: String(qty),
    });
    navigate(`/hotels/${hotelId}/checkout?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {!hasDates && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Pick check-in and check-out dates above to see live prices, taxes and availability.</span>
        </div>
      )}

      {displayRooms.length > 0 && fittingRooms.length < rooms.length && (
        <p className="text-xs text-muted-foreground">
          Showing room types that can accommodate {guests} guest{guests > 1 ? "s" : ""}.
        </p>
      )}

      {/* No single room type fits — suggest combinations */}
      {quotesReady && bookableRooms.length === 0 && combinations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm bg-muted/40 border border-border rounded-lg p-3">
            <Layers className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <span>
              No single room fits {guests} guests. These available room combinations do:
            </span>
          </div>
          {combinations.map((combo) => (
            <Card key={combo.key}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{comboLabel(combo)}</div>
                    <div className="text-xs text-muted-foreground">
                      {combo.totalRooms} room{combo.totalRooms > 1 ? "s" : ""} · sleeps up to {combo.capacity}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">₹{Math.round(combo.perNightTotal).toLocaleString()}</div>
                    <div className="text-[11px] text-muted-foreground">per night · taxes extra</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {combo.items.map((it) => (
                    <Button
                      key={it.room.id}
                      size="sm"
                      variant="outline"
                      onClick={() => goCheckout(it.room.id, it.quantity)}
                    >
                      Book {it.room.room_type} ×{it.quantity}
                    </Button>
                  ))}
                </div>
                {combo.items.length > 1 && (
                  <p className="text-[11px] text-muted-foreground">
                    Mixed room types are booked one type at a time.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Nothing works */}
      {quotesReady && bookableRooms.length === 0 && combinations.length === 0 && (
        <Card className="p-8 text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No rooms available for the selected number of guests and dates.
          </p>
        </Card>
      )}

      {!quotesReady && fittingRooms.length === 0 && (
        <Card className="p-8 text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            No rooms available for the selected number of guests and dates.
          </p>
        </Card>
      )}

      {displayRooms.map((room) => {

        const q = quotes[room.id];
        const photos = (room.photos && room.photos.length > 0) ? room.photos : [FALLBACK_IMG];
        const idx = galleryIdx[room.id] ?? 0;
        const amenityList: string[] = Array.isArray(room.amenities)
          ? room.amenities
          : (typeof room.amenities === "object" && room.amenities ? Object.keys(room.amenities) : []);
        const soldOut = hasDates && q && !q.loading && q.available < roomsWanted;
        const lowStock = hasDates && q && !q.loading && q.available > 0 && q.available <= 3;

        return (
          <Card key={room.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-[280px_1fr_240px] gap-0">
                {/* Gallery */}
                <div className="relative bg-muted h-56 md:h-full min-h-[220px] group">
                  <img
                    src={photos[idx]}
                    alt={room.room_type}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={() => setGalleryIdx((p) => ({ ...p, [room.id]: (idx - 1 + photos.length) % photos.length }))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        aria-label="Previous photo"
                      ><ChevronLeft className="h-4 w-4" /></button>
                      <button
                        onClick={() => setGalleryIdx((p) => ({ ...p, [room.id]: (idx + 1) % photos.length }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        aria-label="Next photo"
                      ><ChevronRight className="h-4 w-4" /></button>
                      <div className="absolute bottom-2 right-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded">
                        {idx + 1}/{photos.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 md:p-5 space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold">{room.room_type}</h3>
                      {room.category && <Badge variant="outline" className="text-[10px]">{room.category}</Badge>}
                    </div>
                    {room.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{room.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    {room.size_sqft && (
                      <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{room.size_sqft} sq ft</span>
                    )}
                    {room.bed_type && (
                      <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{room.bed_type}</span>
                    )}
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />Max {room.max_occupancy}</span>
                    {room.view_type && <span>{room.view_type}</span>}
                  </div>

                  {amenityList.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {amenityList.slice(0, 6).map((a) => (
                        <Badge key={a} variant="secondary" className="text-[10px] font-normal">{a}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {room.breakfast_included && (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <Coffee className="h-3.5 w-3.5" /> Free breakfast
                      </span>
                    )}
                    {room.cancellation_policy && (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <ShieldCheck className="h-3.5 w-3.5" /> {room.cancellation_policy}
                      </span>
                    )}
                    {room.min_nights > 1 && (
                      <span className="text-muted-foreground">Min {room.min_nights} nights</span>
                    )}
                  </div>

                  {hasDates && q && !q.loading && (
                    <div className="pt-1">
                      {soldOut ? (
                        <Badge variant="destructive" className="text-[10px]">Sold out for these dates</Badge>
                      ) : lowStock ? (
                        <Badge className="bg-orange-500 hover:bg-orange-500 text-[10px]">Only {q.available} left</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-emerald-200 text-emerald-700">
                          {q.available} rooms available
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Price / CTA */}
                <div className="p-4 md:p-5 border-t md:border-t-0 md:border-l border-border bg-muted/20 flex flex-col justify-between gap-3">
                  <div>
                    {hasDates && q && !q.loading ? (
                      <>
                        <div className="text-[11px] text-muted-foreground">
                          {q.nights} night{q.nights > 1 ? "s" : ""} × {roomsWanted} room{roomsWanted > 1 ? "s" : ""}
                        </div>
                        <div className="text-2xl font-bold text-foreground mt-1">
                          ₹{q.total.toLocaleString()}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          ₹{q.perNight.toLocaleString()}/night · +₹{q.taxes.toLocaleString()} taxes
                        </div>
                      </>
                    ) : hasDates && q?.loading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Checking availability…
                      </div>
                    ) : (
                      <>
                        <div className="text-[11px] text-muted-foreground">Starts from</div>
                        <div className="text-2xl font-bold text-foreground mt-1">
                          ₹{Number(room.base_price).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-muted-foreground">per night · taxes extra</div>
                      </>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    disabled={!!soldOut}
                    onClick={() => goCheckout(room.id, roomsWanted ?? 1)}
                  >
                    {soldOut ? "Sold out" : hasDates ? "Book now" : "Select dates"}
                  </Button>

                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
