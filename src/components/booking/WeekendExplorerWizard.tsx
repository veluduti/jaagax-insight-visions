import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logWeekendActivity, formatINR } from "@/lib/weekendBookingHelpers";
import {
  Sparkles, IndianRupee, Building2, MapPin, BedDouble,
  CalendarIcon, Hotel, ClipboardCheck, User, Check,
  ArrowRight, ArrowLeft, Search, Plus, X, Plane, Car,
  ShieldCheck, Loader2, PartyPopper,
} from "lucide-react";

interface WeekendExplorerWizardProps {
  open: boolean;
  onClose: () => void;
  packageId?: string | null;
  packageName?: string;
  packageDuration?: number;
  packageDiscount?: number | null;
  defaultCity?: string;
}

type Property = {
  id: string;
  title: string;
  city: string;
  locality: string;
  price: number;
  bhk: number | null;
  bedrooms: number | null;
  area_sqft: number | null;
  type: string | null;
  images: string[] | null;
};

type Hotel = {
  id: string;
  name: string;
  city: string;
  locality: string;
  star_rating: number | null;
  price_per_night: number;
  images: string[] | null;
};

const STEPS = [
  { id: 1, label: "Requirements", icon: ClipboardCheck },
  { id: 2, label: "Properties", icon: Building2 },
  { id: 3, label: "Dates", icon: CalendarIcon },
  { id: 4, label: "Stay", icon: Hotel },
  { id: 5, label: "Summary", icon: Sparkles },
  { id: 6, label: "Contact", icon: User },
  { id: 7, label: "Submit", icon: Check },
];

export const WeekendExplorerWizard = ({
  open, onClose, packageName = "Weekend Property Explorer",
  packageDuration = 2, packageDiscount = 15, defaultCity = "Hyderabad",
}: WeekendExplorerWizardProps) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Step 1
  const [budgetMin, setBudgetMin] = useState(3000000);
  const [budgetMax, setBudgetMax] = useState(10000000);
  const [propertyType, setPropertyType] = useState("Apartment");
  const [bhk, setBhk] = useState("3");
  const [city, setCity] = useState(defaultCity);
  const [locations, setLocations] = useState<string[]>([]);

  // Step 2
  const [searchQuery, setSearchQuery] = useState("");
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProps, setSelectedProps] = useState<Property[]>([]);
  const [propsLoading, setPropsLoading] = useState(false);

  // Step 3
  const [startDate, setStartDate] = useState<Date | undefined>(addDays(new Date(), 7));
  const endDate = useMemo(() => startDate ? addDays(startDate, packageDuration - 1) : undefined, [startDate, packageDuration]);

  // Step 4
  const [hotelTier, setHotelTier] = useState<"budget" | "premium" | "skip">("budget");
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [includeTransport, setIncludeTransport] = useState(true);

  // Step 6
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);

  // Load user
  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        setEmail(data.user.email || "");
        setName(data.user.user_metadata?.full_name || data.user.user_metadata?.name || "");
        setPhone(data.user.user_metadata?.phone || "");
      }
    });
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setSelectedProps([]);
        setCreatedBookingId(null);
        setSubmitting(false);
      }, 300);
    }
  }, [open]);

  // Load properties (Step 2)
  useEffect(() => {
    if (step !== 2) return;
    setPropsLoading(true);
    supabase.from("properties")
      .select("id,title,city,locality,price,bhk,bedrooms,area_sqft,type,images")
      .eq("verified", true)
      .ilike("city", `%${city}%`)
      .gte("price", budgetMin * 0.7)
      .lte("price", budgetMax * 1.3)
      .limit(30)
      .then(({ data }) => {
        setProperties(data || []);
        setPropsLoading(false);
      });
  }, [step, city, budgetMin, budgetMax]);

  // Load hotels (Step 4)
  useEffect(() => {
    if (step !== 4 || hotelTier === "skip") return;
    const priceMax = hotelTier === "budget" ? 4000 : 20000;
    const priceMin = hotelTier === "budget" ? 0 : 4000;
    supabase.from("partner_hotels")
      .select("id,name,city,locality,star_rating,price_per_night,images")
      .eq("is_active", true)
      .ilike("city", `%${city}%`)
      .gte("price_per_night", priceMin)
      .lte("price_per_night", priceMax)
      .order("star_rating", { ascending: false })
      .limit(8)
      .then(({ data }) => setHotels(data || []));
  }, [step, hotelTier, city]);

  const filteredProperties = useMemo(() => {
    if (!searchQuery) return properties;
    const q = searchQuery.toLowerCase();
    return properties.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.locality?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q)
    );
  }, [properties, searchQuery]);

  const selectedHotel = hotels.find(h => h.id === selectedHotelId);

  const propertiesTotal = selectedProps.reduce((s, p) => s + (p.price || 0), 0);
  const hotelTotal = selectedHotel ? selectedHotel.price_per_night * (packageDuration - 1) : 0;
  const transportFee = includeTransport ? 2500 : 0;
  const agentFee = 1500;
  const subtotal = hotelTotal + transportFee + agentFee;
  const discount = packageDiscount ? Math.round(subtotal * (packageDiscount / 100)) : 0;
  const estimatedTotal = subtotal - discount;
  const bookingAmount = Math.round(estimatedTotal * 0.15); // 15% advance

  const canNext = useMemo(() => {
    switch (step) {
      case 1: return budgetMin > 0 && budgetMax > budgetMin && propertyType && bhk;
      case 2: return selectedProps.length >= 1;
      case 3: return !!startDate;
      case 4: return hotelTier === "skip" || !!selectedHotelId;
      case 5: return true;
      case 6: return name.trim() && email.trim() && phone.trim();
      default: return false;
    }
  }, [step, budgetMin, budgetMax, propertyType, bhk, selectedProps, startDate, hotelTier, selectedHotelId, name, email, phone]);

  const toggleProperty = (p: Property) => {
    setSelectedProps(prev =>
      prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p]
    );
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to book");
      return;
    }
    // Allow buyers and agents to book the Weekend Explorer
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (roleRows || []).map((r: any) => r.role);
    const blockedRole = roles.find((r: string) => r === "builder" || r === "hotel_manager");
    if (blockedRole) {
      toast.error("This account type can't book the Weekend Explorer", {
        description: `Your account role is "${blockedRole}".`,
      });
      return;
    }
    if (!startDate || !endDate) return;
    setSubmitting(true);
    try {
      // Find an assigned agent for the first selected property
      let agentId: string | null = null;
      if (selectedProps[0]?.id) {
        const { data: prop } = await supabase
          .from("properties")
          .select("assigned_agent_id")
          .eq("id", selectedProps[0].id)
          .maybeSingle();
        agentId = prop?.assigned_agent_id || null;
      }
      // Fallback to any verified agent in the city
      if (!agentId) {
        const { data: agents } = await supabase
          .from("agents")
          .select("id")
          .eq("verified", true)
          .ilike("cities_served", `%${city}%`)
          .limit(1);
        agentId = agents?.[0]?.id || null;
      }

      // NOTE: Per the concierge flow, we DO NOT auto-assign an agent here.
      // The Admin reviews the request, qualifies it, then assigns the right agent.
      const { data: booking, error } = await supabase
        .from("weekend_bookings")
        .insert({
          buyer_id: user.id,
          buyer_name: name,
          buyer_email: email,
          buyer_phone: phone,
          budget_min: budgetMin,
          budget_max: budgetMax,
          property_type: propertyType,
          preferred_locations: locations.length ? locations : [city],
          bhk_preference: bhk,
          selected_property_ids: selectedProps.map(p => p.id),
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          hotel_id: selectedHotelId,
          hotel_tier: hotelTier,
          include_transport: includeTransport,
          include_agent_assistance: true,
          estimated_total: estimatedTotal,
          booking_amount: bookingAmount,
          agent_id: null,
          buyer_notes: notes,
          city,
          status: "submitted",
        })
        .select()
        .single();

      if (error || !booking) throw error || new Error("Failed to create booking");

      await logWeekendActivity({
        bookingId: booking.id,
        actorId: user.id,
        actorRole: "buyer",
        action: "booking_submitted",
        description: `Buyer submitted a 2-day Weekend Explorer request for ${selectedProps.length} property visit(s) in ${city}. Awaiting admin qualification.`,
        metadata: { property_count: selectedProps.length, estimated_total: estimatedTotal },
      });

      // Notify all admins (they qualify and assign the agent)
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        await supabase.from("notifications").insert(admins.map(a => ({
          user_id: a.user_id,
          type: "weekend_booking",
          title: "🆕 Weekend Explorer request — needs qualification",
          message: `${name} submitted a 2-day visit request in ${city}. Please review and assign an agent.`,
          link: "/admin?tab=weekend",
          metadata: { booking_id: booking.id },
        })));
      }

      // Notify buyer
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "weekend_booking",
        title: "Request submitted ✨",
        message: "Our concierge team is qualifying your request. We'll assign your dedicated agent shortly.",
        link: "/dashboard/buyer?tab=weekend",
        metadata: { booking_id: booking.id },
      });

      setCreatedBookingId(booking.id);
      setStep(8);
      toast.success("Request submitted!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden gap-0">
        {/* Premium gradient header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-background to-purple-500/10 px-6 pt-5 pb-4 border-b">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-md">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">{packageName}</DialogTitle>
                <p className="text-xs text-muted-foreground">2-Day guided property visit + stay package</p>
              </div>
            </div>
          </DialogHeader>

          {/* Stepper */}
          {step <= 7 && (
            <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const active = step === s.id;
                const done = step > s.id;
                return (
                  <div key={s.id} className="flex items-center gap-1 shrink-0">
                    <div className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                      active && "bg-primary text-primary-foreground shadow-sm",
                      done && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                      !active && !done && "bg-muted text-muted-foreground"
                    )}>
                      {done ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                      <span className="hidden sm:inline">{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className={cn("h-px w-3", done ? "bg-emerald-500/40" : "bg-border")} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* STEP 1 — Requirements */}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div>
                    <h3 className="text-base font-semibold mb-1">Tell us what you're looking for</h3>
                    <p className="text-sm text-muted-foreground">We'll curate the experience around your needs.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> Budget min</Label>
                      <Input type="number" value={budgetMin} onChange={e => setBudgetMin(+e.target.value)} placeholder="30,00,000" />
                      <p className="text-xs text-muted-foreground">{formatINR(budgetMin)}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" /> Budget max</Label>
                      <Input type="number" value={budgetMax} onChange={e => setBudgetMax(+e.target.value)} placeholder="1,00,00,000" />
                      <p className="text-xs text-muted-foreground">{formatINR(budgetMax)}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Property type</Label>
                      <Select value={propertyType} onValueChange={setPropertyType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Apartment">Apartment</SelectItem>
                          <SelectItem value="Villa">Villa</SelectItem>
                          <SelectItem value="Plot">Plot</SelectItem>
                          <SelectItem value="House">Independent House</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> BHK</Label>
                      <Select value={bhk} onValueChange={setBhk}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["1", "2", "3", "4", "5+"].map(b => <SelectItem key={b} value={b}>{b} BHK</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Preferred city</Label>
                      <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Hyderabad" />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2 — Properties */}
              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold">Pick properties to visit</h3>
                      <p className="text-sm text-muted-foreground">Browse and add to your visit list ({selectedProps.length} selected)</p>
                    </div>
                    <Badge variant="secondary">{selectedProps.length}/6</Badge>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Search by title, locality..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                  </div>
                  {selectedProps.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-muted/40 border">
                      {selectedProps.map(p => (
                        <Badge key={p.id} variant="default" className="gap-1 pr-1">
                          {p.title.slice(0, 25)}
                          <button onClick={() => toggleProperty(p)} className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  {propsLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading…</div>
                  ) : filteredProperties.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">No matching properties. Try widening your filters.</div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {filteredProperties.map(p => {
                        const sel = !!selectedProps.find(x => x.id === p.id);
                        return (
                          <Card key={p.id} className={cn("cursor-pointer transition-all", sel ? "ring-2 ring-primary border-primary/50" : "hover:border-primary/30")} onClick={() => toggleProperty(p)}>
                            <CardContent className="p-3 flex gap-3">
                              <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden shrink-0 relative">
                                {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" alt=""  loading="lazy" decoding="async" /> : <Building2 className="h-6 w-6 m-auto mt-7 text-muted-foreground" />}
                                {sel && <div className="absolute inset-0 bg-primary/30 flex items-center justify-center"><Check className="h-6 w-6 text-primary-foreground" /></div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{p.title}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.locality}, {p.city}</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <span className="text-sm font-semibold text-primary">{formatINR(p.price)}</span>
                                  {p.bhk && <Badge variant="outline" className="text-[10px]">{p.bhk} BHK</Badge>}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* STEP 3 — Dates */}
              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold mb-1">Pick your start date</h3>
                    <p className="text-sm text-muted-foreground">End date is auto-set to {packageDuration} days from start.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start"><CalendarIcon className="h-4 w-4 mr-2" />{startDate ? format(startDate, "PPP") : "Pick date"}</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={(d) => d < new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>End date</Label>
                      <div className="h-10 rounded-md border bg-muted/30 px-3 flex items-center text-sm">
                        {endDate ? format(endDate, "PPP") : "—"}
                      </div>
                    </div>
                  </div>
                  <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
                    <CardContent className="p-4 flex items-center gap-3">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                      <div className="text-sm">
                        <p className="font-medium">{packageDuration}-day visit window</p>
                        <p className="text-xs text-muted-foreground">Day 1: arrival + first visits · Day 2: remaining visits + checkout</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* STEP 4 — Hotel */}
              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold mb-1">Where would you like to stay?</h3>
                    <p className="text-sm text-muted-foreground">Optional — skip if you have your own arrangement.</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { v: "budget", label: "Budget", desc: "₹1.5–4k/night" },
                      { v: "premium", label: "Premium", desc: "₹4k+/night" },
                      { v: "skip", label: "Skip", desc: "Own stay" },
                    ] as const).map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => { setHotelTier(opt.v); if (opt.v === "skip") setSelectedHotelId(null); }}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all",
                          hotelTier === opt.v ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"
                        )}
                      >
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                  {hotelTier !== "skip" && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {hotels.length === 0 ? (
                        <div className="sm:col-span-2 text-center text-sm text-muted-foreground py-6">No hotels found. Try the other tier or skip.</div>
                      ) : hotels.map(h => {
                        const sel = selectedHotelId === h.id;
                        return (
                          <Card key={h.id} className={cn("cursor-pointer transition-all", sel ? "ring-2 ring-primary" : "hover:border-primary/30")} onClick={() => setSelectedHotelId(h.id)}>
                            <CardContent className="p-3 flex gap-3">
                              <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden shrink-0">
                                {h.images?.[0] ? <img src={h.images[0]} className="w-full h-full object-cover" alt=""  loading="lazy" decoding="async" /> : <Hotel className="h-6 w-6 m-auto mt-5 text-muted-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{h.name}</p>
                                <p className="text-xs text-muted-foreground">{h.locality} · {h.star_rating}★</p>
                                <p className="text-sm font-semibold text-primary mt-1">{formatINR(h.price_per_night)}<span className="text-xs text-muted-foreground font-normal">/night</span></p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                  <label className="flex items-center gap-2 text-sm pt-2">
                    <input type="checkbox" checked={includeTransport} onChange={e => setIncludeTransport(e.target.checked)} className="rounded" />
                    <Car className="h-4 w-4 text-muted-foreground" />
                    Include local transport between visits (₹2,500)
                  </label>
                </motion.div>
              )}

              {/* STEP 5 — Summary */}
              {step === 5 && (
                <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold mb-1">Package summary</h3>
                    <p className="text-sm text-muted-foreground">Review before submitting.</p>
                  </div>
                  <Card>
                    <CardContent className="p-4 space-y-3 text-sm">
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 mt-0.5 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">{selectedProps.length} properties to visit</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{selectedProps.map(p => p.title).join(" · ")}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <CalendarIcon className="h-4 w-4 mt-0.5 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">{startDate && format(startDate, "PPP")} → {endDate && format(endDate, "PPP")}</p>
                          <p className="text-xs text-muted-foreground">{packageDuration} days</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Hotel className="h-4 w-4 mt-0.5 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">{selectedHotel ? selectedHotel.name : hotelTier === "skip" ? "Own stay arrangement" : "Hotel TBD"}</p>
                          {selectedHotel && <p className="text-xs text-muted-foreground">{selectedHotel.locality} · {selectedHotel.star_rating}★</p>}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 mt-0.5 text-emerald-500" />
                        <div className="flex-1">
                          <p className="font-medium">Included</p>
                          <p className="text-xs text-muted-foreground">Agent assistance · {includeTransport ? "Local transport · " : ""}Visit scheduling</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
                    <CardContent className="p-4 space-y-1 text-sm">
                      {selectedHotel && <Row label={`Hotel × ${packageDuration - 1} nights`} value={formatINR(hotelTotal)} />}
                      {includeTransport && <Row label="Local transport" value={formatINR(transportFee)} />}
                      <Row label="Agent assistance" value={formatINR(agentFee)} />
                      {discount > 0 && <Row label={`Package discount (${packageDiscount}%)`} value={`− ${formatINR(discount)}`} className="text-emerald-600" />}
                      <div className="border-t pt-2 mt-2 flex items-center justify-between font-semibold">
                        <span>Estimated total</span><span className="text-primary text-base">{formatINR(estimatedTotal)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground pt-1">Pay only {formatINR(bookingAmount)} (15%) advance after agent confirms.</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* STEP 6 — Contact */}
              {step === 6 && (
                <motion.div key="s6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold mb-1">Your contact details</h3>
                    <p className="text-sm text-muted-foreground">Our agent will reach out within a few hours.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 ..." /></div>
                    <div className="space-y-1.5 sm:col-span-2"><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
                    <div className="space-y-1.5 sm:col-span-2"><Label>Anything else?</Label><Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special requests, arrival times, language preference..." /></div>
                  </div>
                </motion.div>
              )}

              {/* STEP 7 — Confirm */}
              {step === 7 && (
                <motion.div key="s7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 text-center py-4">
                  <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg">
                    <ClipboardCheck className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold">Ready to submit?</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">Your request will be marked <Badge variant="outline" className="mx-1">Submitted</Badge> and our concierge team will qualify it and assign your dedicated agent.</p>
                </motion.div>
              )}

              {/* STEP 8 — Success */}
              {step === 8 && (
                <motion.div key="s8" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl">
                    <PartyPopper className="h-10 w-10 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-xl font-bold">Request submitted!</h3>
                    <p className="text-sm text-muted-foreground mt-1">Our agent will contact you shortly to confirm your visit plan.</p>
                  </div>
                  <Card className="bg-muted/30 max-w-sm mx-auto">
                    <CardContent className="p-4 text-left text-sm space-y-1">
                      <p className="font-medium">What's next?</p>
                      <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                        <li>✓ Admin qualifies your request</li>
                        <li>✓ Dedicated agent is assigned</li>
                        <li>✓ Agent accepts & calls to plan visits</li>
                        <li>✓ You pay the 15% advance to lock the itinerary</li>
                        <li>✓ Visits → your decision → close deal → rate agent</li>
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer */}
        {step <= 7 && (
          <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-6 py-3">
            <Button variant="ghost" disabled={step === 1 || submitting} onClick={() => setStep(s => Math.max(1, s - 1))}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <span className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</span>
            {step < 7 ? (
              <Button disabled={!canNext} onClick={() => setStep(s => s + 1)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button disabled={submitting} onClick={handleSubmit} className="bg-gradient-to-r from-primary to-purple-500 text-primary-foreground">
                {submitting ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Submitting</> : <>Submit Request <Check className="h-4 w-4 ml-1" /></>}
              </Button>
            )}
          </div>
        )}
        {step === 8 && (
          <div className="border-t bg-muted/20 px-6 py-3 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={() => { onClose(); window.location.href = "/dashboard/buyer?tab=weekend"; }}>
              View My Bookings <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value, className }: { label: string; value: string; className?: string }) => (
  <div className={cn("flex items-center justify-between text-sm", className)}>
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default WeekendExplorerWizard;
