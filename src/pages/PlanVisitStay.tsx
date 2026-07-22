import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { nextDayISO, CHECKOUT_AFTER_CHECKIN_MSG, isValidDateRangeISO } from "@/lib/dateRange";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Hotel,
  Loader2,
  MapPin,
  Search,
  Users,
  Sparkles,
  Home,
} from "lucide-react";

type TimeSlot = "morning" | "afternoon" | "evening";

interface PropertyLite {
  id: string;
  title: string;
  city: string;
  locality: string;
  images?: string[] | null;
  builder_id?: string | null;
  assigned_agent_id?: string | null;
  price?: number | null;
}

interface HotelLite {
  id: string;
  name: string;
  city: string;
  locality: string;
  price_per_night: number;
  star_rating?: number | null;
  images?: string[] | null;
  discount_percentage?: number | null;
}

const TIME_SLOTS: { value: TimeSlot; label: string; sub: string }[] = [
  { value: "morning", label: "Morning", sub: "9 AM – 12 PM" },
  { value: "afternoon", label: "Afternoon", sub: "12 PM – 4 PM" },
  { value: "evening", label: "Evening", sub: "4 PM – 7 PM" },
];

const slotToTimeString = (s: TimeSlot) =>
  s === "morning" ? "10:00" : s === "afternoon" ? "14:00" : "17:00";

const todayISO = () => new Date().toISOString().split("T")[0];

const PlanVisitStay = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const initialPropertyId = searchParams.get("propertyId") || "";
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // Property selection
  const [property, setProperty] = useState<PropertyLite | null>(null);
  const [propertySearch, setPropertySearch] = useState("");
  const [propertyResults, setPropertyResults] = useState<PropertyLite[]>([]);
  const [searchingProps, setSearchingProps] = useState(false);

  // Visit details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [visitDate, setVisitDate] = useState(todayISO());
  const [timeSlot, setTimeSlot] = useState<TimeSlot>("morning");
  const [visitors, setVisitors] = useState(1);
  const [message, setMessage] = useState("");

  // Stay
  const [needsStay, setNeedsStay] = useState<"yes" | "no">("no");
  const [hotels, setHotels] = useState<HotelLite[]>([]);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<HotelLite | null>(null);
  const [checkIn, setCheckIn] = useState(todayISO());
  const [checkOut, setCheckOut] = useState(todayISO());
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [roomType, setRoomType] = useState("Standard");

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) {
      const redirect = `/plan-visit-stay${initialPropertyId ? `?propertyId=${initialPropertyId}` : ""}`;
      navigate(`/auth?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [authLoading, user, navigate, initialPropertyId]);

  // Prefill from auth
  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      setName((user.user_metadata as any)?.full_name || "");
    }
  }, [user]);

  // Load initial property if provided
  useEffect(() => {
    if (!initialPropertyId) return;
    supabase
      .from("properties")
      .select("id,title,city,locality,images,builder_id,assigned_agent_id,price")
      .eq("id", initialPropertyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProperty(data as PropertyLite);
      });
  }, [initialPropertyId]);

  // Default checkout = visit date + 1
  useEffect(() => {
    setCheckIn(visitDate);
    const d = new Date(visitDate);
    d.setDate(d.getDate() + 1);
    setCheckOut(d.toISOString().split("T")[0]);
  }, [visitDate]);

  // Load hotels by property locality/city when entering step 2 with stay
  useEffect(() => {
    if (step !== 2 || needsStay !== "yes" || !property) return;
    setLoadingHotels(true);
    (async () => {
      // Try locality first, fall back to city
      const { data: byLocality } = await supabase
        .from("partner_hotels")
        .select("id,name,city,locality,price_per_night,star_rating,images,discount_percentage")
        .eq("is_active", true)
        .ilike("locality", `%${property.locality}%`)
        .limit(20);
      let list = (byLocality as HotelLite[]) || [];
      if (list.length === 0) {
        const { data: byCity } = await supabase
          .from("partner_hotels")
          .select("id,name,city,locality,price_per_night,star_rating,images,discount_percentage")
          .eq("is_active", true)
          .ilike("city", `%${property.city}%`)
          .limit(20);
        list = (byCity as HotelLite[]) || [];
      }
      setHotels(list);
      setLoadingHotels(false);
    })();
  }, [step, needsStay, property]);

  // Property search (when no property pre-selected)
  useEffect(() => {
    if (property || propertySearch.trim().length < 2) {
      setPropertyResults([]);
      return;
    }
    setSearchingProps(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("properties")
        .select("id,title,city,locality,images,builder_id,assigned_agent_id,price")
        .or(`title.ilike.%${propertySearch}%,locality.ilike.%${propertySearch}%,city.ilike.%${propertySearch}%`)
        .eq("verified", true)
        .limit(8);
      setPropertyResults((data as PropertyLite[]) || []);
      setSearchingProps(false);
    }, 300);
    return () => clearTimeout(t);
  }, [propertySearch, property]);

  const stayNights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const a = new Date(checkIn).getTime();
    const b = new Date(checkOut).getTime();
    return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
  }, [checkIn, checkOut]);

  const stayTotal = useMemo(() => {
    if (!selectedHotel) return 0;
    const base = selectedHotel.price_per_night * stayNights * rooms;
    const discount = selectedHotel.discount_percentage || 0;
    return Math.round(base * (1 - discount / 100));
  }, [selectedHotel, stayNights, rooms]);

  const validateStep1 = (): string | null => {
    if (!property) return "Please select a property to visit";
    if (!name.trim()) return "Name is required";
    if (!/^\+?\d{7,15}$/.test(phone.replace(/\s/g, ""))) return "Enter a valid phone number";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Enter a valid email";
    if (!visitDate) return "Visit date is required";
    if (new Date(visitDate) < new Date(todayISO())) return "Visit date can't be in the past";
    if (visitors < 1 || visitors > 10) return "Visitors must be between 1 and 10";
    return null;
  };

  const validateStep2 = (): string | null => {
    if (needsStay === "no") return null;
    if (!selectedHotel) return "Please select a hotel for your stay";
    if (!checkIn || !checkOut) return "Check-in / Check-out dates required";
    if (stayNights < 1) return "Check-out must be after check-in";
    if (guests < 1 || rooms < 1) return "Guests and rooms must be at least 1";
    return null;
  };

  const goNext = () => {
    if (step === 1) {
      const err = validateStep1();
      if (err) return toast({ title: "Check details", description: err, variant: "destructive" });
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) return toast({ title: "Check stay details", description: err, variant: "destructive" });
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!user || !property) return;
    setSubmitting(true);
    try {
      // 1) Create visit booking
      const { data: visit, error: visitErr } = await supabase
        .from("visit_bookings")
        .insert({
          buyer_id: user.id,
          property_id: property.id,
          buyer_name: name,
          buyer_phone: phone,
          buyer_email: email,
          visit_date: visitDate,
          visit_time: slotToTimeString(timeSlot),
          city: property.city,
          locality: property.locality,
          notes: [
            `Time slot: ${timeSlot}`,
            `Visitors: ${visitors}`,
            message ? `Message: ${message}` : "",
          ]
            .filter(Boolean)
            .join(" | "),
          status: "pending",
        })
        .select()
        .single();

      if (visitErr) throw visitErr;

      // 2) Optional hotel booking linked via property_id
      let hotelBookingId: string | null = null;
      if (needsStay === "yes" && selectedHotel) {
        const { data: hotelBooking, error: hotelErr } = await supabase
          .from("hotel_bookings")
          .insert({
            user_id: user.id,
            hotel_id: selectedHotel.id,
            property_id: property.id,
            guest_name: name,
            guest_email: email,
            guest_phone: phone,
            check_in: checkIn,
            check_out: checkOut,
            num_guests: guests,
            num_rooms: rooms,
            room_type: roomType,
            booking_type: "visit_stay",
            total_amount: stayTotal,
            status: "pending",
            special_requests: `Linked to visit ${visit.id}`,
          })
          .select()
          .single();
        if (hotelErr) throw hotelErr;
        hotelBookingId = hotelBooking?.id || null;
      }

      // 3) Notifications
      // Buyer confirmation
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "booking",
        title: "Visit request submitted ✅",
        message: `Your visit to ${property.title} on ${visitDate} (${timeSlot}) is awaiting confirmation.${
          hotelBookingId ? ` Stay request at ${selectedHotel?.name} also submitted.` : ""
        }`,
        link: "/dashboard/buyer",
        metadata: { booking_id: visit.id, hotel_booking_id: hotelBookingId },
      });

      // Notify admins
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if (admins && admins.length > 0) {
        await supabase.from("notifications").insert(
          admins.map((a: any) => ({
            user_id: a.user_id,
            type: "admin_visit_event",
            title: "New visit request",
            message: `${name} requested visit for ${property.title} on ${visitDate}.${
              hotelBookingId ? " Includes stay booking." : ""
            }`,
            link: "/admin",
            metadata: { booking_id: visit.id, property_id: property.id },
          }))
        );
      }

      // Notify assigned agent (if any)
      if (property.assigned_agent_id) {
        const { data: agentRow } = await supabase
          .from("agents")
          .select("user_id")
          .eq("id", property.assigned_agent_id)
          .maybeSingle();
        if (agentRow?.user_id) {
          await supabase.from("notifications").insert({
            user_id: agentRow.user_id,
            type: "visit_request",
            title: "New visit request",
            message: `${name} requested a visit for ${property.title} on ${visitDate} (${timeSlot}).`,
            link: "/dashboard/agent/visits",
            metadata: { booking_id: visit.id, property_id: property.id },
          });
        }
      }

      // Notify builder (if listed by builder)
      if (property.builder_id) {
        await supabase.from("notifications").insert({
          user_id: property.builder_id,
          type: "visit_request",
          title: "New visit request",
          message: `${name} requested a visit for ${property.title} on ${visitDate}.`,
          link: "/dashboard/builder/visits",
          metadata: { booking_id: visit.id, property_id: property.id },
        });
      }

      toast({
        title: "Request submitted 🎉",
        description: "We've sent your request. Track status in your dashboard.",
      });
      navigate("/dashboard/buyer");
    } catch (e: any) {
      console.error("Plan visit+stay submit error", e);
      toast({
        title: "Something went wrong",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto container-padding py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Badge variant="secondary" className="mb-3">
            <Sparkles className="h-3 w-3 mr-1" /> Plan Visit + Stay
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Book your site visit</h1>
          <p className="text-muted-foreground">
            Schedule a visit and add a nearby stay in just 3 simple steps.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 md:gap-4 mb-8">
          {[1, 2, 3].map((s, i) => (
            <div key={s} className="flex items-center gap-2 md:gap-4">
              <div
                className={`flex items-center justify-center rounded-full h-9 w-9 text-sm font-semibold border ${
                  step >= s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              <span className={`text-sm hidden md:inline ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                {s === 1 ? "Visit Details" : s === 2 ? "Stay (Optional)" : "Review & Confirm"}
              </span>
              {i < 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {/* STEP 1 */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-primary" /> Visit Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Property */}
                <div className="space-y-2">
                  <Label>Property</Label>
                  {property ? (
                    <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0">
                        {property.images?.[0] && (
                          <img src={property.images[0]} alt={property.title} className="h-12 w-12 rounded object-cover"  loading="lazy" decoding="async" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{property.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {property.locality}, {property.city}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setProperty(null)}>
                        Change
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by title, locality, or city"
                          className="pl-9"
                          value={propertySearch}
                          onChange={(e) => setPropertySearch(e.target.value)}
                        />
                      </div>
                      {searchingProps && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Searching…
                        </p>
                      )}
                      {propertyResults.length > 0 && (
                        <div className="border rounded-lg divide-y max-h-64 overflow-auto">
                          {propertyResults.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setProperty(p);
                                setPropertyResults([]);
                                setPropertySearch("");
                              }}
                              className="w-full text-left p-3 hover:bg-muted/50 flex items-center gap-3"
                            >
                              {p.images?.[0] && (
                                <img src={p.images[0]} alt={p.title} className="h-10 w-10 rounded object-cover"  loading="lazy" decoding="async" />
                              )}
                              <div className="min-w-0">
                                <p className="font-medium truncate">{p.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {p.locality}, {p.city}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Or browse all{" "}
                        <Link to="/search" className="text-primary underline">
                          properties
                        </Link>
                      </p>
                    </div>
                  )}
                </div>

                {/* Contact */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                {/* Date / Slot / Visitors */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Visit Date *</Label>
                    <Input type="date" min={todayISO()} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Slot *</Label>
                    <Select value={timeSlot} onValueChange={(v) => setTimeSlot(v as TimeSlot)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_SLOTS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label} <span className="text-muted-foreground">({s.sub})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Visitors *</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={visitors}
                      onChange={(e) => setVisitors(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="msg">Message (optional)</Label>
                  <Textarea
                    id="msg"
                    rows={3}
                    placeholder="Any specific questions or requirements?"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-primary" /> Need a Stay?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup value={needsStay} onValueChange={(v) => setNeedsStay(v as "yes" | "no")} className="grid md:grid-cols-2 gap-3">
                  <label className={`border rounded-lg p-4 cursor-pointer flex items-start gap-3 ${needsStay === "no" ? "border-primary bg-primary/5" : ""}`}>
                    <RadioGroupItem value="no" />
                    <div>
                      <p className="font-medium">No, just the visit</p>
                      <p className="text-sm text-muted-foreground">Skip stay and continue.</p>
                    </div>
                  </label>
                  <label className={`border rounded-lg p-4 cursor-pointer flex items-start gap-3 ${needsStay === "yes" ? "border-primary bg-primary/5" : ""}`}>
                    <RadioGroupItem value="yes" />
                    <div>
                      <p className="font-medium">Yes, I need a hotel</p>
                      <p className="text-sm text-muted-foreground">Choose from partner hotels nearby.</p>
                    </div>
                  </label>
                </RadioGroup>

                {needsStay === "yes" && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-sm font-medium mb-2">
                        Hotels near {property?.locality}, {property?.city}
                      </p>
                      {loadingHotels ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading hotels…
                        </div>
                      ) : hotels.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No partner hotels found nearby. You can still submit the visit request.
                        </p>
                      ) : (
                        <div className="grid md:grid-cols-2 gap-3">
                          {hotels.map((h) => {
                            const active = selectedHotel?.id === h.id;
                            return (
                              <button
                                type="button"
                                key={h.id}
                                onClick={() => setSelectedHotel(h)}
                                className={`text-left border rounded-lg overflow-hidden transition ${
                                  active ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/50"
                                }`}
                              >
                                {h.images?.[0] && (
                                  <img src={h.images[0]} alt={h.name} className="h-32 w-full object-cover"  loading="lazy" decoding="async" />
                                )}
                                <div className="p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium truncate">{h.name}</p>
                                    {h.star_rating ? (
                                      <Badge variant="secondary">{h.star_rating}★</Badge>
                                    ) : null}
                                  </div>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {h.locality}
                                  </p>
                                  <p className="text-sm mt-2">
                                    ₹{h.price_per_night.toLocaleString()} <span className="text-muted-foreground">/night</span>
                                    {h.discount_percentage ? (
                                      <Badge variant="secondary" className="ml-2">-{h.discount_percentage}%</Badge>
                                    ) : null}
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {selectedHotel && (
                      <div className="grid md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Check-in</Label>
                          <Input type="date" min={todayISO()} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Check-out</Label>
                          <Input type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Guests</Label>
                          <Input type="number" min={1} max={10} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Rooms</Label>
                          <Input type="number" min={1} max={5} value={rooms} onChange={(e) => setRooms(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2 md:col-span-4">
                          <Label>Room Type</Label>
                          <Select value={roomType} onValueChange={setRoomType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Standard">Standard</SelectItem>
                              <SelectItem value="Deluxe">Deluxe</SelectItem>
                              <SelectItem value="Suite">Suite</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-4 rounded-lg bg-muted/40 p-3 text-sm flex items-center justify-between">
                          <span>
                            {stayNights} night{stayNights !== 1 ? "s" : ""} × {rooms} room{rooms !== 1 ? "s" : ""}
                          </span>
                          <span className="font-semibold">₹{stayTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" /> Review & Confirm
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <section className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Property</p>
                  <div className="flex items-center gap-3 border rounded-lg p-3">
                    {property?.images?.[0] && (
                      <img src={property.images[0]} className="h-14 w-14 rounded object-cover" alt=""  loading="lazy" decoding="async" />
                    )}
                    <div>
                      <p className="font-medium">{property?.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {property?.locality}, {property?.city}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Visit</p>
                  <div className="border rounded-lg p-3 grid md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />{visitDate} • {timeSlot}</div>
                    <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" />{visitors} visitor{visitors !== 1 ? "s" : ""}</div>
                    <div className="md:col-span-2"><strong>{name}</strong> • {phone} • {email}</div>
                    {message && <div className="md:col-span-2 text-muted-foreground">"{message}"</div>}
                  </div>
                </section>

                <section className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Stay</p>
                  {needsStay === "yes" && selectedHotel ? (
                    <div className="border rounded-lg p-3 text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{selectedHotel.name}</p>
                        <p className="font-semibold">₹{stayTotal.toLocaleString()}</p>
                      </div>
                      <p className="text-muted-foreground">
                        {checkIn} → {checkOut} • {stayNights} night{stayNights !== 1 ? "s" : ""} • {rooms} room{rooms !== 1 ? "s" : ""} • {guests} guest{guests !== 1 ? "s" : ""} • {roomType}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground border rounded-lg p-3">No stay selected.</p>
                  )}
                </section>

                <p className="text-xs text-muted-foreground">
                  By confirming, your request goes to the builder/agent for approval. You'll be notified of any updates.
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Nav buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => (step > 1 ? setStep((step - 1) as 1 | 2) : navigate(-1))}
            disabled={submitting}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 1 ? "Back" : "Previous"}
          </Button>
          {step < 3 ? (
            <Button onClick={goNext}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Submitting…
                </>
              ) : (
                <>Confirm Request</>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default PlanVisitStay;
