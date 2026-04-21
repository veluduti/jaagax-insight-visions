import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { logWeekendActivity, formatINR, WEEKEND_STATUSES, WeekendStatus } from "@/lib/weekendBookingHelpers";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  User, Phone, Mail, MapPin, Calendar, Building2, Hotel, Car,
  IndianRupee, CheckCircle2, XCircle, Loader2, MessageCircle,
  Plus, Trash2, Activity, Clock, FileText, Sparkles, ShieldCheck,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  bookingId: string | null;
  viewerRole: "buyer" | "agent" | "admin";
  currentUserId?: string | null;
  onChanged?: () => void;
}

export const WeekendBookingDetailDrawer = ({ open, onClose, bookingId, viewerRole, currentUserId, onChanged }: Props) => {
  const [booking, setBooking] = useState<any>(null);
  const [properties, setProperties] = useState<any[]>([]);
  const [hotel, setHotel] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [itinerary, setItinerary] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentNotes, setAgentNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!bookingId) return;
    setLoading(true);
    try {
      const [b, it, ac] = await Promise.all([
        supabase.from("weekend_bookings").select("*").eq("id", bookingId).single(),
        supabase.from("weekend_booking_itinerary").select("*").eq("booking_id", bookingId).order("day_number").order("sort_order"),
        supabase.from("weekend_booking_activity_log").select("*").eq("booking_id", bookingId).order("created_at", { ascending: false }),
      ]);
      const bk = b.data;
      setBooking(bk);
      setItinerary(it.data || []);
      setActivity(ac.data || []);
      setAgentNotes(bk?.agent_notes || "");
      if (bk?.selected_property_ids?.length) {
        const { data: props } = await supabase.from("properties").select("id,title,city,locality,price,bhk,images").in("id", bk.selected_property_ids);
        setProperties(props || []);
      } else { setProperties([]); }
      if (bk?.hotel_id) {
        const { data: h } = await supabase.from("partner_hotels").select("*").eq("id", bk.hotel_id).maybeSingle();
        setHotel(h);
      } else { setHotel(null); }
      if (bk?.agent_id) {
        const { data: a } = await supabase.from("agents").select("id,name,phone,email,photo_url").eq("id", bk.agent_id).maybeSingle();
        setAgent(a);
      } else { setAgent(null); }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open && bookingId) load(); }, [open, bookingId]);

  // Realtime updates for activity log
  useEffect(() => {
    if (!open || !bookingId) return;
    const ch = supabase.channel(`weekend-${bookingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "weekend_booking_activity_log", filter: `booking_id=eq.${bookingId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "weekend_booking_itinerary", filter: `booking_id=eq.${bookingId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "weekend_bookings", filter: `id=eq.${bookingId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, bookingId]);

  const updateStatus = async (status: WeekendStatus, extra: Record<string, any> = {}) => {
    if (!booking) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("weekend_bookings").update({ status, ...extra }).eq("id", booking.id);
      if (error) throw error;
      await logWeekendActivity({
        bookingId: booking.id,
        actorId: currentUserId,
        actorRole: viewerRole,
        action: "status_changed",
        description: `Status changed to ${WEEKEND_STATUSES[status].label}`,
        metadata: { from: booking.status, to: status, ...extra },
      });
      // Notify buyer
      await supabase.from("notifications").insert({
        user_id: booking.buyer_id,
        type: "weekend_booking",
        title: `Weekend booking: ${WEEKEND_STATUSES[status].label}`,
        message: status === "awaiting_payment" ? "Agent confirmed your plan. Please complete the advance payment." : status === "confirmed" ? "Booking confirmed! Your itinerary is locked." : status === "cancelled" ? `Booking cancelled. ${extra.rejection_reason || ""}` : `Status updated to ${WEEKEND_STATUSES[status].label}`,
        link: "/dashboard/buyer?tab=weekend",
        metadata: { booking_id: booking.id },
      });
      toast.success("Updated");
      onChanged?.();
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setBusy(false); }
  };

  const saveAgentNotes = async () => {
    if (!booking) return;
    setBusy(true);
    await supabase.from("weekend_bookings").update({ agent_notes: agentNotes }).eq("id", booking.id);
    await logWeekendActivity({ bookingId: booking.id, actorId: currentUserId, actorRole: viewerRole, action: "agent_notes_updated", description: "Agent updated notes" });
    setBusy(false);
    toast.success("Notes saved");
  };

  const mockPay = async () => {
    if (!booking) return;
    setBusy(true);
    const ref = `MOCK-${Date.now()}`;
    await supabase.from("weekend_bookings").update({
      payment_status: "partial",
      payment_reference: ref,
      paid_at: new Date().toISOString(),
      status: "confirmed",
    }).eq("id", booking.id);
    await logWeekendActivity({
      bookingId: booking.id, actorId: currentUserId, actorRole: "buyer",
      action: "payment_completed",
      description: `Advance payment of ${formatINR(booking.booking_amount)} completed (mock)`,
      metadata: { reference: ref, amount: booking.booking_amount },
    });
    // Notify admin + agent
    if (booking.agent_id) {
      const { data: ag } = await supabase.from("agents").select("user_id").eq("id", booking.agent_id).maybeSingle();
      if (ag?.user_id) {
        await supabase.from("notifications").insert({
          user_id: ag.user_id, type: "weekend_booking",
          title: "Payment received", message: `${booking.buyer_name} completed advance payment.`,
          link: "/dashboard/agent?tab=weekend", metadata: { booking_id: booking.id },
        });
      }
    }
    setBusy(false);
    toast.success("Payment successful (simulated)");
    onChanged?.();
    load();
  };

  if (!booking) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl">
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "No booking selected"}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const status = booking.status as WeekendStatus;
  const statusInfo = WEEKEND_STATUSES[status] || WEEKEND_STATUSES.pending_confirmation;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b bg-gradient-to-br from-primary/5 to-purple-500/5">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                Weekend Explorer Booking
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">#{booking.id.slice(0, 8)} · created {format(new Date(booking.created_at), "PPp")}</p>
            </div>
            <Badge className={statusInfo.color} variant="outline">{statusInfo.label}</Badge>
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="itinerary">Itinerary ({itinerary.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="overview" className="px-5 py-4 space-y-4 m-0">
              {/* Buyer */}
              <Section icon={User} title="Buyer">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Field label="Name" value={booking.buyer_name} />
                  <Field label="Phone" value={booking.buyer_phone} icon={Phone} action={viewerRole !== "buyer" ? () => window.open(`tel:${booking.buyer_phone}`) : undefined} />
                  <Field label="Email" value={booking.buyer_email} icon={Mail} action={viewerRole !== "buyer" ? () => window.open(`mailto:${booking.buyer_email}`) : undefined} />
                  <Field label="City" value={booking.city} icon={MapPin} />
                </div>
                {booking.buyer_notes && <p className="mt-2 text-xs italic text-muted-foreground bg-muted/40 p-2 rounded">"{booking.buyer_notes}"</p>}
              </Section>

              {/* Requirements */}
              <Section icon={Building2} title="Requirements">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Field label="Budget" value={`${formatINR(booking.budget_min)} – ${formatINR(booking.budget_max)}`} />
                  <Field label="Type" value={booking.property_type} />
                  <Field label="BHK" value={booking.bhk_preference} />
                  <Field label="Locations" value={(booking.preferred_locations || []).join(", ") || "—"} />
                </div>
              </Section>

              {/* Properties */}
              <Section icon={Building2} title={`Selected properties (${properties.length})`}>
                <div className="space-y-2">
                  {properties.map(p => (
                    <Card key={p.id}>
                      <CardContent className="p-2.5 flex gap-3">
                        <div className="h-12 w-12 rounded bg-muted overflow-hidden shrink-0">
                          {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" alt="" /> : <Building2 className="h-4 w-4 m-auto mt-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{p.locality}, {p.city} · {formatINR(p.price)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </Section>

              {/* Schedule */}
              <Section icon={Calendar} title="Schedule">
                <div className="text-sm">{format(new Date(booking.start_date), "PPP")} → {format(new Date(booking.end_date), "PPP")}</div>
              </Section>

              {/* Hotel */}
              <Section icon={Hotel} title="Stay">
                {hotel ? (
                  <div className="text-sm">
                    <p className="font-medium">{hotel.name}</p>
                    <p className="text-xs text-muted-foreground">{hotel.locality} · {hotel.star_rating}★ · {formatINR(hotel.price_per_night)}/night</p>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Tier: {booking.hotel_tier}</p>}
              </Section>

              {/* Agent */}
              <Section icon={ShieldCheck} title="Assigned agent">
                {agent ? (
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">{agent.phone} · {agent.email}</p>
                    </div>
                    {viewerRole === "buyer" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => window.open(`tel:${agent.phone}`)}><Phone className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(`mailto:${agent.email}`)}><Mail className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </div>
                ) : <p className="text-sm text-muted-foreground">Not yet assigned</p>}
              </Section>

              {/* Pricing */}
              <Section icon={IndianRupee} title="Pricing">
                <div className="space-y-1 text-sm">
                  <Row label="Estimated total" value={formatINR(booking.estimated_total)} />
                  {booking.final_total && <Row label="Final total" value={formatINR(booking.final_total)} />}
                  <Row label="Booking advance (15%)" value={formatINR(booking.booking_amount)} />
                  <Row label="Payment status" value={<Badge variant="outline" className="capitalize">{booking.payment_status}</Badge>} />
                  {booking.payment_reference && <Row label="Reference" value={<span className="font-mono text-xs">{booking.payment_reference}</span>} />}
                </div>
              </Section>

              {/* Agent notes */}
              {(viewerRole === "agent" || viewerRole === "admin") && (
                <Section icon={FileText} title="Agent notes">
                  <Textarea rows={3} value={agentNotes} onChange={e => setAgentNotes(e.target.value)} placeholder="Internal notes about this booking…" />
                  <Button size="sm" className="mt-2" onClick={saveAgentNotes} disabled={busy}>Save notes</Button>
                </Section>
              )}

              {/* Action zone */}
              <div className="sticky bottom-0 bg-background -mx-5 px-5 py-3 border-t flex flex-wrap gap-2">
                {viewerRole === "agent" && status === "pending_confirmation" && (
                  <>
                    <Button size="sm" onClick={() => updateStatus("agent_review")} disabled={busy}><Activity className="h-3 w-3 mr-1" />Mark reviewing</Button>
                    <Button size="sm" variant="default" onClick={() => updateStatus("awaiting_payment")} disabled={busy}><CheckCircle2 className="h-3 w-3 mr-1" />Confirm plan → request payment</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus("cancelled", { rejection_reason: rejectionReason || "Rejected by agent" })} disabled={busy}><XCircle className="h-3 w-3 mr-1" />Reject</Button>
                  </>
                )}
                {viewerRole === "agent" && status === "agent_review" && (
                  <>
                    <Button size="sm" onClick={() => updateStatus("awaiting_payment")} disabled={busy}><CheckCircle2 className="h-3 w-3 mr-1" />Confirm plan → request payment</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus("cancelled", { rejection_reason: "Rejected by agent" })} disabled={busy}>Reject</Button>
                  </>
                )}
                {viewerRole === "agent" && status === "confirmed" && (
                  <Button size="sm" onClick={() => updateStatus("completed")} disabled={busy}>Mark completed</Button>
                )}
                {viewerRole === "buyer" && status === "awaiting_payment" && (
                  <Button size="sm" onClick={mockPay} disabled={busy} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                    <IndianRupee className="h-3 w-3 mr-1" />Pay {formatINR(booking.booking_amount)} (advance)
                  </Button>
                )}
                {viewerRole === "admin" && (
                  <Select value={status} onValueChange={(v) => updateStatus(v as WeekendStatus)}>
                    <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(WEEKEND_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </TabsContent>

            <TabsContent value="itinerary" className="px-5 py-4 m-0">
              <ItineraryEditor
                bookingId={booking.id}
                items={itinerary}
                canEdit={viewerRole === "agent" || viewerRole === "admin"}
                properties={properties}
                hotel={hotel}
                actorId={currentUserId}
                actorRole={viewerRole}
                onChanged={load}
              />
            </TabsContent>

            <TabsContent value="activity" className="px-5 py-4 m-0">
              <div className="space-y-2">
                {activity.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">No activity yet</p>}
                {activity.map(a => (
                  <motion.div key={a.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 text-sm border-l-2 border-primary/30 pl-3 py-1.5">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] capitalize">{a.action.replace(/_/g, " ")}</Badge>
                        {a.actor_role && <span className="text-xs text-muted-foreground">by {a.actor_role}</span>}
                      </div>
                      {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5"><Clock className="h-2.5 w-2.5 inline mr-0.5" />{format(new Date(a.created_at), "PPp")}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

const Section = ({ icon: Icon, title, children }: any) => (
  <div>
    <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wide">
      <Icon className="h-3.5 w-3.5" /> {title}
    </div>
    {children}
  </div>
);

const Field = ({ label, value, icon: Icon, action }: any) => (
  <div className="rounded-lg border bg-card p-2">
    <p className="text-[10px] uppercase text-muted-foreground tracking-wide flex items-center gap-1">{Icon && <Icon className="h-3 w-3" />}{label}</p>
    <p className="text-sm font-medium truncate flex items-center gap-1">
      {value || "—"}
      {action && <Button size="icon" variant="ghost" className="h-5 w-5 ml-auto" onClick={action}><Phone className="h-3 w-3" /></Button>}
    </p>
  </div>
);

const Row = ({ label, value }: any) => (
  <div className="flex items-center justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>
);

// Itinerary editor
const ItineraryEditor = ({ bookingId, items, canEdit, properties, hotel, actorId, actorRole, onChanged }: any) => {
  const [adding, setAdding] = useState<number | null>(null);
  const [draft, setDraft] = useState<any>({ item_type: "visit", title: "", start_time: "", end_time: "", location: "", notes: "", property_id: "" });

  const addItem = async (day: number) => {
    if (!draft.title) return toast.error("Title required");
    const { error } = await supabase.from("weekend_booking_itinerary").insert({
      booking_id: bookingId, day_number: day, ...draft,
      property_id: draft.property_id || null,
      sort_order: items.filter((i: any) => i.day_number === day).length,
    });
    if (error) return toast.error(error.message);
    await logWeekendActivity({ bookingId, actorId, actorRole, action: "itinerary_updated", description: `Added "${draft.title}" to Day ${day}` });
    setAdding(null);
    setDraft({ item_type: "visit", title: "", start_time: "", end_time: "", location: "", notes: "", property_id: "" });
    onChanged?.();
  };

  const removeItem = async (id: string, title: string) => {
    await supabase.from("weekend_booking_itinerary").delete().eq("id", id);
    await logWeekendActivity({ bookingId, actorId, actorRole, action: "itinerary_updated", description: `Removed "${title}"` });
    onChanged?.();
  };

  const ItemTypeIcon = ({ t }: { t: string }) => {
    const map: any = { visit: Building2, hotel_checkin: Hotel, hotel_checkout: Hotel, transport: Car, meal: FileText };
    const I = map[t] || Activity;
    return <I className="h-3.5 w-3.5" />;
  };

  return (
    <div className="space-y-5">
      {[1, 2].map(day => {
        const dayItems = items.filter((i: any) => i.day_number === day);
        return (
          <div key={day}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Day {day}</h4>
              {canEdit && <Button size="sm" variant="outline" onClick={() => setAdding(day)}><Plus className="h-3 w-3 mr-1" />Add</Button>}
            </div>
            {dayItems.length === 0 && <p className="text-xs text-muted-foreground italic mb-2">Nothing scheduled yet</p>}
            <div className="space-y-1.5">
              {dayItems.map((it: any) => (
                <Card key={it.id}>
                  <CardContent className="p-2.5 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary"><ItemTypeIcon t={it.item_type} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{it.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                        {it.start_time && <span>{it.start_time}{it.end_time && ` – ${it.end_time}`}</span>}
                        {it.location && <span>· {it.location}</span>}
                      </p>
                      {it.notes && <p className="text-[11px] italic text-muted-foreground">{it.notes}</p>}
                    </div>
                    {canEdit && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(it.id, it.title)}><Trash2 className="h-3 w-3" /></Button>}
                  </CardContent>
                </Card>
              ))}
            </div>
            {adding === day && (
              <Card className="mt-2 border-primary/30">
                <CardContent className="p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={draft.item_type} onValueChange={(v) => setDraft({ ...draft, item_type: v })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="visit">Property visit</SelectItem>
                        <SelectItem value="hotel_checkin">Hotel check-in</SelectItem>
                        <SelectItem value="hotel_checkout">Hotel check-out</SelectItem>
                        <SelectItem value="transport">Transport</SelectItem>
                        <SelectItem value="meal">Meal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {draft.item_type === "visit" && properties.length > 0 && (
                      <Select value={draft.property_id} onValueChange={(v) => {
                        const p = properties.find((x: any) => x.id === v);
                        setDraft({ ...draft, property_id: v, title: p ? `Visit: ${p.title}` : draft.title, location: p ? `${p.locality}, ${p.city}` : draft.location });
                      }}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Pick property" /></SelectTrigger>
                        <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                  <Input className="h-8" placeholder="Title" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input className="h-8" type="time" value={draft.start_time} onChange={e => setDraft({ ...draft, start_time: e.target.value })} />
                    <Input className="h-8" type="time" value={draft.end_time} onChange={e => setDraft({ ...draft, end_time: e.target.value })} />
                  </div>
                  <Input className="h-8" placeholder="Location" value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} />
                  <Textarea rows={2} placeholder="Notes" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => addItem(day)}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WeekendBookingDetailDrawer;
