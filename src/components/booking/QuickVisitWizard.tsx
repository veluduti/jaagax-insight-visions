import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logWeekendActivity, formatINR } from "@/lib/weekendBookingHelpers";
import VisitPaymentDialog from "@/components/booking/VisitPaymentDialog";
import { fetchVisitEntitlement, type VisitEntitlement } from "@/hooks/useVisitEntitlement";
import {
  Zap, Building2, MapPin, CalendarIcon, ClipboardCheck,
  User, Check, ArrowRight, ArrowLeft, ShieldCheck, Loader2,
  PartyPopper, IndianRupee, Phone, Mail, Search, Home,
} from "lucide-react";

interface QuickVisitWizardProps {
  open: boolean;
  onClose: () => void;
  propertyId?: string;
  propertyTitle?: string;
  propertyCity?: string;
  propertyLocality?: string;
  propertyPrice?: number;
}

interface PropertyOption {
  id: string;
  title: string;
  city: string;
  locality: string;
  price: number;
  images: string[] | null;
}

const STEPS_WITH_PROPERTY = [
  { id: 0, label: "Property", icon: Home },
  { id: 1, label: "Date", icon: CalendarIcon },
  { id: 2, label: "Contact", icon: User },
  { id: 3, label: "Notes", icon: ClipboardCheck },
  { id: 4, label: "Submit", icon: Check },
];
const STEPS_NO_PROPERTY = [
  { id: 1, label: "Date", icon: CalendarIcon },
  { id: 2, label: "Contact", icon: User },
  { id: 3, label: "Notes", icon: ClipboardCheck },
  { id: 4, label: "Submit", icon: Check },
];

const QUICK_VISIT_FEE = 499; // platform concierge fee

export const QuickVisitWizard = ({
  open, onClose, propertyId: initialPropertyId, propertyTitle: initialPropertyTitle,
  propertyCity: initialPropertyCity = "Hyderabad",
  propertyLocality: initialPropertyLocality = "",
  propertyPrice: initialPropertyPrice = 0,
}: QuickVisitWizardProps) => {
  const requiresPropertyPick = !initialPropertyId;
  const STEPS = requiresPropertyPick ? STEPS_WITH_PROPERTY : STEPS_NO_PROPERTY;

  const [step, setStep] = useState(requiresPropertyPick ? 0 : 1);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Property selection (when not pre-selected)
  const [propertyId, setPropertyId] = useState<string>(initialPropertyId || "");
  const [propertyTitle, setPropertyTitle] = useState<string>(initialPropertyTitle || "");
  const [propertyCity, setPropertyCity] = useState<string>(initialPropertyCity);
  const [propertyLocality, setPropertyLocality] = useState<string>(initialPropertyLocality);
  const [propertyPrice, setPropertyPrice] = useState<number>(initialPropertyPrice);
  const [propertyOptions, setPropertyOptions] = useState<PropertyOption[]>([]);
  const [propertySearch, setPropertySearch] = useState("");
  const [loadingProps, setLoadingProps] = useState(false);

  const [visitDate, setVisitDate] = useState<Date | undefined>();
  const [visitTime, setVisitTime] = useState("11:00");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [visitEntitlement, setVisitEntitlement] = useState<VisitEntitlement | null>(null);

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

  // Admin-configured visit pricing / free allowance
  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) fetchVisitEntitlement(data.user.id).then(setVisitEntitlement);
    });
  }, [open]);

  // Fetch property options when picker is shown
  useEffect(() => {
    if (!open || !requiresPropertyPick) return;
    setLoadingProps(true);
    supabase
      .from("properties")
      .select("id,title,city,locality,price,images")
      .eq("verification_status", "approved")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setPropertyOptions((data || []) as PropertyOption[]);
        setLoadingProps(false);
      });
  }, [open, requiresPropertyPick]);

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(requiresPropertyPick ? 0 : 1);
        setCreatedBookingId(null);
        setSubmitting(false);
        setVisitDate(undefined);
        setNotes("");
        if (requiresPropertyPick) {
          setPropertyId("");
          setPropertyTitle("");
          setPropertyLocality("");
        }
      }, 300);
    }
  }, [open, requiresPropertyPick]);

  // Fee comes from admin settings; free allowance makes this visit ₹0
  const visitFee = visitEntitlement
    ? visitEntitlement.requires_payment
      ? Number(visitEntitlement.total || 0)
      : 0
    : QUICK_VISIT_FEE;
  const freeVisitsLeft = visitEntitlement?.free_remaining ?? 0;
  const estimatedTotal = visitFee;
  const bookingAmount = visitFee;

  const filteredProps = useMemo(() => {
    const q = propertySearch.trim().toLowerCase();
    if (!q) return propertyOptions;
    return propertyOptions.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.locality?.toLowerCase().includes(q),
    );
  }, [propertyOptions, propertySearch]);

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return !!propertyId;
      case 1: return !!visitDate && !!visitTime;
      case 2: return name.trim() && email.trim() && phone.trim().length >= 10;
      case 3: return true;
      default: return false;
    }
  }, [step, propertyId, visitDate, visitTime, name, email, phone]);

  /** Step 1: validate, then show the payment module (free allowance vs paid visit). */
  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to book a visit");
      return;
    }
    if (!propertyId) {
      toast.error("Please choose a property to visit");
      return;
    }
    // Allow buyers and agents (agents can book quick visits on behalf of buyers / for self-tours)
    const { data: roleRows } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id);
    const roles = (roleRows || []).map((r: any) => r.role);
    const blockedRole = roles.find((r: string) => r === "builder" || r === "hotel_manager");
    if (blockedRole) {
      toast.error("This account type can't book a Quick Visit", {
        description: `Your account role is "${blockedRole}".`,
      });
      return;
    }
    if (!visitDate) return;

    setSubmitting(true);
    const ent = await fetchVisitEntitlement(user.id);
    setVisitEntitlement(ent);
    setSubmitting(false);
    setShowPayment(true);
  };

  /** Step 2: actually create the booking once the visit is covered/paid. */
  const createBooking = async () => {
    if (!user || !visitDate) return;
    setSubmitting(true);
    try {
      const { data: booking, error } = await supabase
        .from("weekend_bookings")
        .insert({
          booking_kind: "quick_visit",
          buyer_id: user.id,
          buyer_name: name,
          buyer_email: email,
          buyer_phone: phone,
          budget_min: propertyPrice ? Math.round(propertyPrice * 0.9) : 0,
          budget_max: propertyPrice ? Math.round(propertyPrice * 1.1) : 0,
          property_type: "Apartment",
          preferred_locations: [propertyLocality || propertyCity],
          bhk_preference: "—",
          selected_property_ids: [propertyId],
          start_date: format(visitDate, "yyyy-MM-dd"),
          end_date: format(visitDate, "yyyy-MM-dd"),
          hotel_id: null,
          hotel_tier: "skip",
          include_transport: false,
          include_agent_assistance: true,
          estimated_total: estimatedTotal,
          booking_amount: bookingAmount,
          agent_id: null,
          buyer_notes: `Preferred time: ${visitTime}.${notes ? " " + notes : ""}`,
          city: propertyCity,
          status: "submitted",
        })
        .select().single();

      if (error || !booking) throw error || new Error("Failed to create booking");

      // Charge the visit: free allowance or wallet debit + invoice (admin-configured)
      const { data: charge } = await (supabase as any).rpc("charge_visit_booking", {
        _user_id: user.id,
        _booking_id: booking.id,
      });
      if (charge && charge.ok === false) {
        toast.error(
          charge.reason === "insufficient_funds"
            ? "Payment could not be completed — please top up your wallet."
            : "Visit payment could not be completed.",
        );
      } else if (charge?.invoice_number) {
        window.dispatchEvent(new Event("walletUpdated"));
        toast.success(charge.free ? "Free visit applied" : `Payment successful — invoice ${charge.invoice_number}`);
      }



      await logWeekendActivity({
        bookingId: booking.id,
        actorId: user.id,
        actorRole: "buyer",
        action: "booking_submitted",
        description: `Buyer submitted a Quick Visit request for "${propertyTitle}" on ${format(visitDate, "PPP")} at ${visitTime}. Awaiting admin qualification.`,
        metadata: { booking_kind: "quick_visit", property_id: propertyId, visit_time: visitTime },
      });

      // Notify admins
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      if (admins?.length) {
        await supabase.from("notifications").insert(admins.map(a => ({
          user_id: a.user_id,
          type: "weekend_booking",
          title: "⚡ Quick Visit request — needs qualification",
          message: `${name} requested a quick visit to ${propertyTitle} on ${format(visitDate, "MMM d")}. Please assign an agent.`,
          link: "/admin?tab=weekend",
          metadata: { booking_id: booking.id, kind: "quick_visit" },
        })));
      }

      // Notify buyer
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "weekend_booking",
        title: "Quick Visit request submitted ⚡",
        message: "Our concierge team is qualifying your request. We'll assign your agent shortly.",
        link: "/dashboard/buyer?tab=quick-visits",
        metadata: { booking_id: booking.id, kind: "quick_visit" },
      });

      setCreatedBookingId(booking.id);
      setStep(5);
      toast.success("Quick Visit request submitted!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        <div className="relative bg-gradient-to-br from-amber-500/10 via-background to-orange-500/10 px-6 pt-5 pb-4 border-b">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">Quick Visit Package</DialogTitle>
                <p className="text-xs text-muted-foreground">Single property · concierge-managed visit</p>
              </div>
            </div>
          </DialogHeader>

          {step <= 4 && (
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
            {/* Property summary - only after picking */}
            {step >= 1 && step <= 4 && propertyId && (
              <Card className="mb-4 bg-muted/30 border-amber-500/20">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{propertyTitle}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{propertyLocality || propertyCity}
                    </p>
                  </div>
                  {requiresPropertyPick && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStep(0)}>Change</Button>
                  )}
                  <Badge variant="outline" className="text-[10px]">1 property</Badge>
                </CardContent>
              </Card>
            )}

            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold mb-1">Pick a property to visit</h3>
                    <p className="text-sm text-muted-foreground">Quick Visit covers a single property of your choice.</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title, city or locality…"
                      className="pl-9"
                      value={propertySearch}
                      onChange={e => setPropertySearch(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {loadingProps && <p className="text-sm text-muted-foreground text-center py-6">Loading properties…</p>}
                    {!loadingProps && filteredProps.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">No properties match your search.</p>
                    )}
                    {filteredProps.map(p => {
                      const selected = propertyId === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPropertyId(p.id);
                            setPropertyTitle(p.title);
                            setPropertyCity(p.city);
                            setPropertyLocality(p.locality);
                            setPropertyPrice(Number(p.price) || 0);
                          }}
                          className={cn(
                            "w-full text-left flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                            selected ? "border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40" : "border-border hover:bg-muted/40"
                          )}
                        >
                          <div className="h-12 w-12 rounded-md bg-muted overflow-hidden shrink-0">
                            {p.images?.[0] ? (
                              <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover"  loading="lazy" decoding="async" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center"><Building2 className="h-5 w-5 text-muted-foreground" /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.title}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3" />{p.locality}, {p.city}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold flex items-center justify-end"><IndianRupee className="h-3 w-3" />{(Number(p.price) || 0).toLocaleString("en-IN")}</p>
                            {selected && <Check className="h-4 w-4 text-amber-600 inline-block mt-0.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
              {step === 1 && (
                <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold mb-1">Pick your visit date</h3>
                    <p className="text-sm text-muted-foreground">Our agent will reach out to confirm.</p>
                  </div>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={visitDate}
                      onSelect={setVisitDate}
                      disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                      className="rounded-md border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred time slot</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {TIME_SLOTS.map(t => (
                        <Button
                          key={t}
                          type="button"
                          variant={visitTime === t ? "default" : "outline"}
                          size="sm"
                          onClick={() => setVisitTime(t)}
                        >{t}</Button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold mb-1">Contact details</h3>
                    <p className="text-sm text-muted-foreground">We'll send confirmations to you and the agent.</p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Full name</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</Label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold mb-1">Anything special?</h3>
                    <p className="text-sm text-muted-foreground">Optional — share questions, accessibility needs, etc.</p>
                  </div>
                  <Textarea rows={5} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. I'd like to see the clubhouse, parking and a sample flat." />

                  <Card className="bg-emerald-500/5 border-emerald-500/30">
                    <CardContent className="p-3 space-y-1.5 text-sm">
                      <div className="flex items-center justify-between"><span className="text-muted-foreground">Visit date</span><span className="font-medium">{visitDate ? format(visitDate, "PPP") : "—"} · {visitTime}</span></div>
                      <div className="flex items-center justify-between"><span className="text-muted-foreground">Property</span><span className="font-medium truncate max-w-[240px]">{propertyTitle}</span></div>
                      <div className="flex items-center justify-between border-t pt-1.5"><span className="text-muted-foreground">Visit fee</span><span className="font-semibold">{visitFee > 0 ? formatINR(visitFee) : "Free"}</span></div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold mb-1">Ready to submit?</h3>
                    <p className="text-sm text-muted-foreground">Our admin will review and assign a verified agent. You'll be notified once accepted.</p>
                  </div>
                  <Card><CardContent className="p-4 space-y-2 text-sm">
                    <Row label="Buyer" value={name} />
                    <Row label="Phone / Email" value={`${phone} · ${email}`} />
                    <Row label="Date / Time" value={visitDate ? `${format(visitDate, "PPP")} · ${visitTime}` : "—"} />
                    <Row label="Property" value={propertyTitle} />
                    <Row label="City" value={propertyCity} />
                    <div className="border-t pt-2 flex items-center justify-between">
                      <span className="text-muted-foreground">Total today</span>
                      <span className="text-lg font-semibold flex items-center gap-0.5"><IndianRupee className="h-4 w-4" />{QUICK_VISIT_FEE}</span>
                    </div>
                  </CardContent></Card>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    Payment is collected after the agent accepts and finalizes the plan.
                  </div>
                </motion.div>
              )}

              {step === 5 && createdBookingId && (
                <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6 space-y-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 mx-auto flex items-center justify-center shadow-lg">
                    <PartyPopper className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Quick Visit request submitted!</h3>
                    <p className="text-sm text-muted-foreground mt-1">Our concierge team is reviewing and will assign your agent shortly.</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <Button onClick={onClose}>Close</Button>
                    <Button variant="outline" onClick={() => { onClose(); setTimeout(() => window.location.href = "/dashboard/buyer?tab=quick-visits", 200); }}>
                      View my bookings <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {step <= 4 && (
          <div className="flex items-center justify-between gap-2 px-6 py-3 border-t bg-muted/20">
            <Button variant="ghost" disabled={step <= (requiresPropertyPick ? 0 : 1) || submitting} onClick={() => setStep(s => Math.max(requiresPropertyPick ? 0 : 1, s - 1))}>
              <ArrowLeft className="h-3 w-3 mr-1" />Back
            </Button>
            <p className="text-xs text-muted-foreground hidden sm:block">Step {step} of {STEPS.length}</p>
            {step < 4 ? (
              <Button disabled={!canNext} onClick={() => setStep(s => s + 1)}>
                Next <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                {submitting ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Submitting…</> : <><Check className="h-3 w-3 mr-1" />Submit request</>}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value }: any) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium truncate ml-2 max-w-[60%] text-right">{value}</span>
  </div>
);

export default QuickVisitWizard;
