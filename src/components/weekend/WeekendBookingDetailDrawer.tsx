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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { logWeekendActivity, formatINR, WEEKEND_STATUSES, WeekendStatus, notifyUser, notifyAdmins } from "@/lib/weekendBookingHelpers";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  User, Phone, Mail, MapPin, Calendar, Building2, Hotel, Car,
  IndianRupee, CheckCircle2, XCircle, Loader2, MessageCircle,
  Plus, Trash2, Activity, Clock, FileText, Sparkles, ShieldCheck,
  Star, ThumbsUp, ThumbsDown, Award, Handshake, UserCheck, Target,
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
  const [busy, setBusy] = useState(false);

  // Admin: qualify + assign
  const [qualifyOpen, setQualifyOpen] = useState(false);
  const [qualifyNotes, setQualifyNotes] = useState("");
  const [availableAgents, setAvailableAgents] = useState<any[]>([]);
  const [pickAgentId, setPickAgentId] = useState<string>("");

  // Agent: decline
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Buyer: decision
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionChoice, setDecisionChoice] = useState<"interested" | "not_interested" | "undecided">("interested");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [interestedIds, setInterestedIds] = useState<string[]>([]);

  // Agent: close deal
  const [dealOpen, setDealOpen] = useState(false);
  const [dealPropertyId, setDealPropertyId] = useState("");
  const [dealAmount, setDealAmount] = useState<number | "">("");

  // Buyer: rate
  const [rateOpen, setRateOpen] = useState(false);
  const [rateStars, setRateStars] = useState(5);
  const [rateReview, setRateReview] = useState("");

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
        const { data: a } = await supabase.from("agents").select("id,name,phone,email,photo_url,trust_score,avg_rating").eq("id", bk.agent_id).maybeSingle();
        setAgent(a);
      } else { setAgent(null); }
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open && bookingId) load(); }, [open, bookingId]);

  // Realtime
  useEffect(() => {
    if (!open || !bookingId) return;
    const ch = supabase.channel(`weekend-${bookingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "weekend_booking_activity_log", filter: `booking_id=eq.${bookingId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "weekend_booking_itinerary", filter: `booking_id=eq.${bookingId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "weekend_bookings", filter: `id=eq.${bookingId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, bookingId]);

  const updateBooking = async (patch: Record<string, any>, action: string, description: string, metadata: Record<string, any> = {}) => {
    if (!booking) return null;
    setBusy(true);
    try {
      const { error } = await supabase.from("weekend_bookings").update(patch).eq("id", booking.id);
      if (error) throw error;
      await logWeekendActivity({ bookingId: booking.id, actorId: currentUserId, actorRole: viewerRole, action, description, metadata });
      toast.success("Updated");
      onChanged?.();
      await load();
      return true;
    } catch (e: any) {
      toast.error(e.message || "Failed");
      return null;
    } finally { setBusy(false); }
  };

  // === ADMIN: open qualification dialog → load agents ===
  const openQualify = async () => {
    setQualifyOpen(true);
    const { data } = await supabase
      .from("agents")
      .select("id,name,trust_score,avg_rating,cities_served,verified")
      .eq("verified", true)
      .ilike("cities_served", `%${booking?.city || ""}%`)
      .order("trust_score", { ascending: false })
      .limit(15);
    setAvailableAgents(data || []);
  };

  const submitQualify = async () => {
    if (!pickAgentId) return toast.error("Pick an agent to assign");
    const { data: ag } = await supabase.from("agents").select("user_id,name").eq("id", pickAgentId).maybeSingle();
    const ok = await updateBooking({
      status: "agent_assigned",
      admin_qualified_at: new Date().toISOString(),
      admin_qualified_by: currentUserId,
      admin_qualification_notes: qualifyNotes || null,
      agent_id: pickAgentId,
      agent_assigned_at: new Date().toISOString(),
      agent_assigned_by: currentUserId,
    }, "admin_qualified_assigned", `Admin qualified the request and assigned ${ag?.name || "an agent"}.`, { agent_id: pickAgentId, notes: qualifyNotes });
    if (ok) {
      if (ag?.user_id) {
        await notifyUser(ag.user_id, "🎯 New Weekend Explorer assignment", `You've been assigned a 2-day visit for ${booking.buyer_name} in ${booking.city}. Please accept or decline.`, "/dashboard/agent?tab=weekend", { booking_id: booking.id });
      }
      await notifyUser(booking.buyer_id, "Agent assigned ✨", `${ag?.name || "Your dedicated agent"} has been assigned to your visit. Awaiting their confirmation.`, "/dashboard/buyer?tab=weekend", { booking_id: booking.id });
      setQualifyOpen(false); setPickAgentId(""); setQualifyNotes("");
    }
  };

  // === AGENT: accept ===
  const acceptAssignment = async () => {
    const ok = await updateBooking({
      status: "agent_accepted",
      agent_accepted_at: new Date().toISOString(),
    }, "agent_accepted", `Agent accepted the assignment.`);
    if (ok) {
      await notifyUser(booking.buyer_id, "🎉 Agent confirmed!", `Your agent has accepted and will start planning your visits.`, "/dashboard/buyer?tab=weekend", { booking_id: booking.id });
      await notifyAdmins("Agent accepted weekend assignment", `${agent?.name || "Agent"} accepted booking for ${booking.buyer_name}.`, "/admin?tab=weekend", { booking_id: booking.id });
    }
  };

  const declineAssignment = async () => {
    const ok = await updateBooking({
      status: "submitted", // back to admin queue
      agent_id: null,
      agent_declined_at: new Date().toISOString(),
      agent_decline_reason: declineReason || "No reason provided",
    }, "agent_declined", `Agent declined the assignment. Reason: ${declineReason || "—"}`, { reason: declineReason });
    if (ok) {
      await notifyAdmins("⚠️ Agent declined assignment", `${agent?.name || "Agent"} declined ${booking.buyer_name}'s booking. Please reassign.`, "/admin?tab=weekend", { booking_id: booking.id });
      setDeclineOpen(false); setDeclineReason("");
    }
  };

  // === AGENT: planning → request payment → confirmed → in_progress → completed ===
  const startPlanning = () => updateBooking({ status: "in_planning" }, "planning_started", "Agent started visit planning & itinerary build.");
  const requestPayment = async () => {
    const ok = await updateBooking({ status: "awaiting_payment" }, "payment_requested", "Agent finalized the plan and requested the advance payment.");
    if (ok) await notifyUser(booking.buyer_id, "💳 Advance payment requested", `Please pay ${formatINR(booking.booking_amount)} to lock your itinerary.`, "/dashboard/buyer?tab=weekend", { booking_id: booking.id });
  };
  const startVisits = () => updateBooking({ status: "in_progress" }, "visits_started", "Property visits in progress.");
  const completeVisits = async () => {
    const remaining = (booking.final_total || booking.estimated_total || 0) - (booking.booking_amount || 0);
    const ok = await updateBooking({ status: "completed" }, "visits_completed", "Property visits completed. Buyer to share their decision and clear the balance payment.");
    if (ok) {
      await notifyUser(
        booking.buyer_id,
        "✅ Visits completed — balance payment due",
        remaining > 0
          ? `Please share your decision and pay the remaining balance of ${formatINR(remaining)} to close out your booking.`
          : `Please share your decision and rate your experience.`,
        "/dashboard/buyer?tab=weekend",
        { booking_id: booking.id, remaining },
      );
    }
  };

  // === BUYER: payment ===
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
      description: `Advance payment of ${formatINR(booking.booking_amount)} completed (mock).`,
      metadata: { reference: ref, amount: booking.booking_amount },
    });
    if (agent?.id) {
      const { data: ag } = await supabase.from("agents").select("user_id").eq("id", agent.id).maybeSingle();
      if (ag?.user_id) await notifyUser(ag.user_id, "💰 Payment received", `${booking.buyer_name} paid the advance. Itinerary is locked.`, "/dashboard/agent?tab=weekend", { booking_id: booking.id });
    }
    await notifyAdmins("Weekend booking payment received", `${booking.buyer_name} paid ${formatINR(booking.booking_amount)}.`, "/admin?tab=weekend", { booking_id: booking.id });
    setBusy(false);
    toast.success("Payment successful (simulated)");
    onChanged?.();
    load();
  };

  // === BUYER: balance payment after visits completed (or after deal closed) ===
  const mockPayFinal = async () => {
    if (!booking) return;
    const totalDue = booking.deal_amount || booking.final_total || booking.estimated_total || 0;
    const remaining = totalDue - (booking.booking_amount || 0);
    if (remaining <= 0) return toast.error("Nothing remaining to pay");
    setBusy(true);
    const ref = `MOCK-FINAL-${Date.now()}`;
    await supabase.from("weekend_bookings").update({
      final_payment_status: "paid",
      final_payment_amount: remaining,
      final_payment_reference: ref,
      final_paid_at: new Date().toISOString(),
      payment_status: "paid",
    }).eq("id", booking.id);
    await logWeekendActivity({
      bookingId: booking.id, actorId: currentUserId, actorRole: "buyer",
      action: "final_payment_completed",
      description: `Balance payment of ${formatINR(remaining)} completed (mock). Booking fully paid.`,
      metadata: { reference: ref, amount: remaining },
    });
    if (agent?.id) {
      const { data: ag } = await supabase.from("agents").select("user_id").eq("id", agent.id).maybeSingle();
      if (ag?.user_id) await notifyUser(ag.user_id, "💸 Balance payment received — ready to close deal", `${booking.buyer_name} paid the remaining ${formatINR(remaining)}. You can now close the deal.`, "/dashboard/agent?tab=weekend", { booking_id: booking.id });
    }
    await notifyAdmins("Weekend booking fully paid", `${booking.buyer_name} paid the remaining ${formatINR(remaining)}.`, "/admin?tab=weekend", { booking_id: booking.id });
    setBusy(false);
    toast.success("Balance payment successful (simulated)");
    onChanged?.();
    load();
  };

  // === BUYER: decision ===
  const submitDecision = async () => {
    const ok = await updateBooking({
      status: "buyer_decided",
      buyer_decision: decisionChoice,
      buyer_decision_at: new Date().toISOString(),
      buyer_decision_notes: decisionNotes || null,
      interested_property_ids: interestedIds,
    }, "buyer_decision", `Buyer is ${decisionChoice.replace("_", " ")}. ${decisionNotes ? "Notes: " + decisionNotes : ""}`, { decision: decisionChoice, interested_property_ids: interestedIds });
    if (ok && agent?.id) {
      const { data: ag } = await supabase.from("agents").select("user_id").eq("id", agent.id).maybeSingle();
      if (ag?.user_id) await notifyUser(ag.user_id, "📣 Buyer shared their decision", `${booking.buyer_name}: ${decisionChoice.replace("_", " ")}. Time to follow up.`, "/dashboard/agent?tab=weekend", { booking_id: booking.id });
    }
    setDecisionOpen(false);
  };

  // === AGENT: pending-task gate before closing the deal ===
  const getPendingDealBlockers = (): string[] => {
    if (!booking) return [];
    const blockers: string[] = [];
    if (!["in_progress", "completed", "buyer_decided"].includes(booking.status)) {
      blockers.push("Property visits are not yet completed");
    }
    if (booking.status === "in_progress") {
      blockers.push("Mark visits as completed first");
    }
    if (!booking.buyer_decision) {
      blockers.push("Buyer has not shared their decision yet");
    }
    if (booking.buyer_decision === "not_interested") {
      blockers.push("Buyer indicated they are not interested");
    }
    if (booking.payment_status !== "paid" || booking.final_payment_status !== "paid") {
      const totalDue = booking.final_total || booking.estimated_total || 0;
      const remaining = totalDue - (booking.booking_amount || 0);
      if (remaining > 0) blockers.push(`Buyer hasn't paid the balance of ${formatINR(remaining)}`);
    }
    return blockers;
  };

  const tryOpenCloseDeal = () => {
    const blockers = getPendingDealBlockers();
    if (blockers.length > 0) {
      toast.error("Cannot close deal yet", {
        description: blockers.map((b) => `• ${b}`).join("\n"),
        duration: 6000,
      });
      return;
    }
    setDealOpen(true);
  };

  // === AGENT: close deal ===
  const submitCloseDeal = async () => {
    if (!dealPropertyId || !dealAmount) return toast.error("Property & amount required");
    // Final guard — re-check blockers at submit time
    const blockers = getPendingDealBlockers();
    if (blockers.length > 0) {
      toast.error("Cannot close deal — pending items", { description: blockers.join(" • ") });
      return;
    }
    const ok = await updateBooking({
      status: "deal_closed",
      deal_closed_at: new Date().toISOString(),
      deal_property_id: dealPropertyId,
      deal_amount: Number(dealAmount),
    }, "deal_closed", `Deal closed for ${formatINR(Number(dealAmount))}.`, { property_id: dealPropertyId, amount: Number(dealAmount) });
    if (ok) {
      await notifyUser(booking.buyer_id, "🎉 Deal closed!", `Congratulations! Your purchase has been recorded. Please rate your agent.`, "/dashboard/buyer?tab=weekend", { booking_id: booking.id });
      await notifyAdmins("🎉 Weekend Explorer deal closed", `${agent?.name || "Agent"} closed ${booking.buyer_name}'s deal for ${formatINR(Number(dealAmount))}.`, "/admin?tab=weekend", { booking_id: booking.id });
      setDealOpen(false);
    }
  };

  // === BUYER: rate agent ===
  const submitRating = async () => {
    if (!agent?.id) return toast.error("No agent to rate");
    const ok = await updateBooking({
      agent_rating: rateStars,
      agent_review: rateReview || null,
      agent_rated_at: new Date().toISOString(),
      status: "rated",
    }, "agent_rated", `Buyer rated agent ${rateStars}/5. ${rateReview ? "Review: " + rateReview : ""}`, { rating: rateStars, review: rateReview });
    // Also record into agent_ratings (uses booking.id as booking_id)
    if (ok) {
      await supabase.from("agent_ratings").insert({
        agent_id: agent.id,
        buyer_id: booking.buyer_id,
        booking_id: booking.id,
        property_id: booking.deal_property_id || booking.selected_property_ids?.[0] || null,
        rating: rateStars,
        review: rateReview || null,
      });
      const { data: ag } = await supabase.from("agents").select("user_id").eq("id", agent.id).maybeSingle();
      if (ag?.user_id) await notifyUser(ag.user_id, "⭐ You received a rating", `${booking.buyer_name} rated you ${rateStars}/5.`, "/dashboard/agent", { booking_id: booking.id });
      setRateOpen(false);
    }
  };

  const saveAgentNotes = async () => {
    if (!booking) return;
    setBusy(true);
    await supabase.from("weekend_bookings").update({ agent_notes: agentNotes }).eq("id", booking.id);
    await logWeekendActivity({ bookingId: booking.id, actorId: currentUserId, actorRole: viewerRole, action: "agent_notes_updated", description: "Agent updated internal notes." });
    setBusy(false);
    toast.success("Notes saved");
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
  const statusInfo = WEEKEND_STATUSES[status] || WEEKEND_STATUSES.submitted;

  // Stage progression for the journey ribbon
  const STAGES: { key: WeekendStatus | WeekendStatus[]; label: string; icon: any }[] = [
    { key: ["submitted", "pending_confirmation"], label: "Submitted", icon: FileText },
    { key: "admin_review", label: "Admin Review", icon: ShieldCheck },
    { key: ["agent_assigned"], label: "Agent Assigned", icon: UserCheck },
    { key: ["agent_accepted", "in_planning", "agent_review"], label: "Planning", icon: Activity },
    { key: "awaiting_payment", label: "Payment", icon: IndianRupee },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
    { key: ["in_progress"], label: "Visits", icon: Building2 },
    { key: ["completed", "buyer_decided"], label: "Decision", icon: Target },
    { key: ["deal_closed"], label: "Deal", icon: Handshake },
    { key: ["rated"], label: "Rated", icon: Star },
  ];
  const currentStageIdx = STAGES.findIndex((s) => Array.isArray(s.key) ? (s.key as string[]).includes(status) : s.key === status);

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

          {/* Journey ribbon */}
          <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {STAGES.map((s, i) => {
              const active = i === currentStageIdx;
              const done = i < currentStageIdx;
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-1 shrink-0">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${active ? "bg-primary text-primary-foreground" : done ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-2.5 w-2.5" />
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STAGES.length - 1 && <div className={`h-px w-2 ${done ? "bg-emerald-500/40" : "bg-border"}`} />}
                </div>
              );
            })}
          </div>
        </SheetHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-5 mt-3 grid grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="itinerary">Itinerary ({itinerary.length})</TabsTrigger>
            <TabsTrigger value="activity">Activity ({activity.length})</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="overview" className="px-5 py-4 space-y-4 m-0">
              {/* PROMINENT BUYER INTEREST ALERT (admin/agent) */}
              {viewerRole !== "buyer" && booking.interested_property_ids?.length > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-3 shadow-[0_0_30px_-10px_hsl(142_76%_36%/0.4)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                      <ThumbsUp className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Buyer is interested! 🎯</p>
                      <p className="text-[11px] text-muted-foreground">{booking.buyer_name} marked {booking.interested_property_ids.length} {booking.interested_property_ids.length === 1 ? "property" : "properties"} as interesting. Time to follow up.</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {properties.filter(p => booking.interested_property_ids?.includes(p.id)).map(p => (
                      <div key={p.id} className="flex items-center gap-2 bg-background/60 rounded-md p-1.5 text-xs">
                        <Building2 className="h-3 w-3 text-emerald-600" />
                        <span className="font-medium flex-1 truncate">{p.title}</span>
                        <span className="text-muted-foreground">{formatINR(p.price)}</span>
                      </div>
                    ))}
                  </div>
                  {booking.buyer_decision_notes && (
                    <p className="mt-2 text-[11px] italic text-muted-foreground bg-background/60 rounded p-1.5">"{booking.buyer_decision_notes}"</p>
                  )}
                </motion.div>
              )}

              <Section icon={User} title="Buyer">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Field label="Name" value={booking.buyer_name} />
                  <Field label="Phone" value={booking.buyer_phone} icon={Phone} action={viewerRole !== "buyer" ? () => window.open(`tel:${booking.buyer_phone}`) : undefined} />
                  <Field label="Email" value={booking.buyer_email} icon={Mail} action={viewerRole !== "buyer" ? () => window.open(`mailto:${booking.buyer_email}`) : undefined} />
                  <Field label="City" value={booking.city} icon={MapPin} />
                </div>
                {booking.buyer_notes && <p className="mt-2 text-xs italic text-muted-foreground bg-muted/40 p-2 rounded">"{booking.buyer_notes}"</p>}
              </Section>

              <Section icon={Building2} title="Requirements">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Field label="Budget" value={`${formatINR(booking.budget_min)} – ${formatINR(booking.budget_max)}`} />
                  <Field label="Type" value={booking.property_type} />
                  <Field label="BHK" value={booking.bhk_preference} />
                  <Field label="Locations" value={(booking.preferred_locations || []).join(", ") || "—"} />
                </div>
              </Section>

              <Section icon={Building2} title={`Selected properties (${properties.length})`}>
                <div className="space-y-2">
                  {properties.map(p => (
                    <Card key={p.id}>
                      <CardContent className="p-2.5 flex gap-3 items-center">
                        <div className="h-12 w-12 rounded bg-muted overflow-hidden shrink-0">
                          {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" alt="" /> : <Building2 className="h-4 w-4 m-auto mt-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.title}</p>
                          <p className="text-xs text-muted-foreground">{p.locality}, {p.city} · {formatINR(p.price)}</p>
                        </div>
                        {booking.interested_property_ids?.includes(p.id) && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]"><ThumbsUp className="h-2.5 w-2.5 mr-0.5" />Interested</Badge>}
                        {booking.deal_property_id === p.id && <Badge variant="outline" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]"><Award className="h-2.5 w-2.5 mr-0.5" />Deal</Badge>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </Section>

              <Section icon={Calendar} title="Schedule">
                <div className="text-sm">{format(new Date(booking.start_date), "PPP")} → {format(new Date(booking.end_date), "PPP")}</div>
              </Section>

              <Section icon={Hotel} title="Stay">
                {hotel ? (
                  <div className="text-sm">
                    <p className="font-medium">{hotel.name}</p>
                    <p className="text-xs text-muted-foreground">{hotel.locality} · {hotel.star_rating}★ · {formatINR(hotel.price_per_night)}/night</p>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Tier: {booking.hotel_tier}</p>}
              </Section>

              <Section icon={ShieldCheck} title="Assigned agent">
                {agent ? (
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium flex items-center gap-2">{agent.name} {agent.trust_score && <Badge variant="outline" className="text-[10px]">Trust {agent.trust_score}</Badge>}</p>
                      <p className="text-xs text-muted-foreground">{agent.phone} · {agent.email}</p>
                    </div>
                    {viewerRole === "buyer" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => window.open(`tel:${agent.phone}`)}><Phone className="h-3 w-3" /></Button>
                        <Button size="sm" variant="outline" onClick={() => window.open(`mailto:${agent.email}`)}><Mail className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </div>
                ) : <p className="text-sm text-muted-foreground italic">Awaiting admin assignment</p>}
              </Section>

              {booking.admin_qualification_notes && (
                <Section icon={ShieldCheck} title="Admin qualification">
                  <p className="text-sm text-muted-foreground bg-muted/40 p-2 rounded">{booking.admin_qualification_notes}</p>
                </Section>
              )}

              {booking.buyer_decision && (
                <Section icon={Target} title="Buyer decision">
                  <Badge variant="outline" className="capitalize">{booking.buyer_decision.replace("_", " ")}</Badge>
                  {booking.buyer_decision_notes && <p className="text-xs text-muted-foreground mt-2 italic">{booking.buyer_decision_notes}</p>}
                </Section>
              )}

              {booking.deal_amount && (
                <Section icon={Handshake} title="Deal closed">
                  <p className="text-sm font-semibold text-emerald-600">{formatINR(booking.deal_amount)}</p>
                  {booking.deal_closed_at && <p className="text-xs text-muted-foreground">Closed on {format(new Date(booking.deal_closed_at), "PPP")}</p>}
                </Section>
              )}

              {booking.agent_rating && (
                <Section icon={Star} title="Agent rating">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(n => <Star key={n} className={`h-4 w-4 ${n <= booking.agent_rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />)}
                    <span className="text-sm font-medium ml-2">{booking.agent_rating}/5</span>
                  </div>
                  {booking.agent_review && <p className="text-xs text-muted-foreground mt-2 italic">"{booking.agent_review}"</p>}
                </Section>
              )}

              <Section icon={IndianRupee} title="Pricing & payments">
                <div className="space-y-1 text-sm">
                  <Row label="Estimated total" value={formatINR(booking.estimated_total)} />
                  {booking.final_total && <Row label="Final total" value={formatINR(booking.final_total)} />}
                  <Row label="Booking advance (15%)" value={
                    <span className="flex items-center gap-1.5">
                      {formatINR(booking.booking_amount)}
                      {booking.payment_status !== "unpaid" && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">Paid</Badge>}
                    </span>
                  } />
                  {booking.deal_amount && (() => {
                    const remaining = (booking.deal_amount || 0) - (booking.booking_amount || 0);
                    return (
                      <>
                        <Row label="Deal amount" value={<span className="font-semibold text-emerald-600">{formatINR(booking.deal_amount)}</span>} />
                        <Row label="Remaining to pay" value={
                          <span className="flex items-center gap-1.5">
                            <span className={booking.final_payment_status === "paid" ? "text-muted-foreground line-through" : "font-semibold text-amber-600"}>{formatINR(remaining)}</span>
                            {booking.final_payment_status === "paid" && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">Settled</Badge>}
                          </span>
                        } />
                        {booking.final_payment_reference && <Row label="Final ref" value={<span className="font-mono text-xs">{booking.final_payment_reference}</span>} />}
                      </>
                    );
                  })()}
                  {booking.payment_reference && <Row label="Advance ref" value={<span className="font-mono text-xs">{booking.payment_reference}</span>} />}
                </div>
              </Section>

              {(viewerRole === "agent" || viewerRole === "admin") && (
                <Section icon={FileText} title="Agent notes">
                  <Textarea rows={3} value={agentNotes} onChange={e => setAgentNotes(e.target.value)} placeholder="Internal notes about this booking…" />
                  <Button size="sm" className="mt-2" onClick={saveAgentNotes} disabled={busy}>Save notes</Button>
                </Section>
              )}

              {/* === Action zone (role + status driven) === */}
              <div className="sticky bottom-0 bg-background -mx-5 px-5 py-3 border-t flex flex-wrap gap-2">
                {/* ADMIN actions */}
                {viewerRole === "admin" && (status === "submitted" || status === "pending_confirmation") && (
                  <>
                    <Button size="sm" onClick={() => updateBooking({ status: "admin_review" }, "admin_review_started", "Admin started reviewing the request.")} disabled={busy}><ShieldCheck className="h-3 w-3 mr-1" />Mark reviewing</Button>
                    <Button size="sm" variant="default" onClick={openQualify} disabled={busy}><UserCheck className="h-3 w-3 mr-1" />Qualify & assign agent</Button>
                    <Button size="sm" variant="destructive" onClick={() => updateBooking({ status: "cancelled", rejection_reason: "Cancelled by admin" }, "cancelled", "Admin cancelled the request.")} disabled={busy}>Cancel</Button>
                  </>
                )}
                {viewerRole === "admin" && status === "admin_review" && (
                  <Button size="sm" onClick={openQualify} disabled={busy}><UserCheck className="h-3 w-3 mr-1" />Qualify & assign agent</Button>
                )}
                {viewerRole === "admin" && (
                  <div className="ml-auto text-[11px] text-muted-foreground italic flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Status is updated automatically by buyer & agent actions
                  </div>
                )}

                {/* AGENT actions */}
                {viewerRole === "agent" && status === "agent_assigned" && (
                  <>
                    <Button size="sm" onClick={acceptAssignment} disabled={busy}><CheckCircle2 className="h-3 w-3 mr-1" />Accept assignment</Button>
                    <Button size="sm" variant="destructive" onClick={() => setDeclineOpen(true)} disabled={busy}><XCircle className="h-3 w-3 mr-1" />Decline</Button>
                  </>
                )}
                {viewerRole === "agent" && status === "agent_accepted" && (
                  <Button size="sm" onClick={startPlanning} disabled={busy}><Activity className="h-3 w-3 mr-1" />Start planning</Button>
                )}
                {viewerRole === "agent" && status === "in_planning" && (
                  <Button size="sm" onClick={requestPayment} disabled={busy}><IndianRupee className="h-3 w-3 mr-1" />Request advance payment</Button>
                )}
                {viewerRole === "agent" && status === "confirmed" && (
                  <Button size="sm" onClick={startVisits} disabled={busy}><Building2 className="h-3 w-3 mr-1" />Mark visits started</Button>
                )}
                {viewerRole === "agent" && status === "in_progress" && (
                  <Button size="sm" onClick={completeVisits} disabled={busy}><CheckCircle2 className="h-3 w-3 mr-1" />Mark visits completed</Button>
                )}
                {viewerRole === "agent" && ["in_progress", "completed", "buyer_decided"].includes(status) && status !== "deal_closed" && !booking.deal_amount && (() => {
                  const blockers = getPendingDealBlockers();
                  const blocked = blockers.length > 0;
                  return (
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        onClick={tryOpenCloseDeal}
                        disabled={busy}
                        className={blocked
                          ? "bg-muted text-muted-foreground hover:bg-muted/80"
                          : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"}
                        title={blocked ? "Pending: " + blockers.join(", ") : "Close this deal"}
                      >
                        <Handshake className="h-3 w-3 mr-1" />
                        Close deal {blocked ? "🔒" : "🎉"}
                      </Button>
                      {blocked && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 max-w-[260px]">
                          Pending: {blockers[0]}
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* BUYER actions */}
                {viewerRole === "buyer" && status === "awaiting_payment" && (
                  <Button size="sm" onClick={mockPay} disabled={busy} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                    <IndianRupee className="h-3 w-3 mr-1" />Pay {formatINR(booking.booking_amount)} (advance)
                  </Button>
                )}
                {viewerRole === "buyer" && (status === "completed" || (status === "in_progress" && booking.payment_status !== "unpaid")) && !booking.buyer_decision && (
                  <Button size="sm" onClick={() => setDecisionOpen(true)} disabled={busy}><Target className="h-3 w-3 mr-1" />Share your decision</Button>
                )}
                {/* Buyer pays balance after visits completed (before or after deal close) */}
                {viewerRole === "buyer" && booking.final_payment_status !== "paid" && ["completed", "buyer_decided", "deal_closed"].includes(status) && (() => {
                  const totalDue = booking.deal_amount || booking.final_total || booking.estimated_total || 0;
                  const remaining = totalDue - (booking.booking_amount || 0);
                  if (remaining <= 0) return null;
                  return (
                    <Button size="sm" onClick={mockPayFinal} disabled={busy} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-primary-foreground">
                      <IndianRupee className="h-3 w-3 mr-1" />
                      Pay balance {formatINR(remaining)}
                    </Button>
                  );
                })()}
                {viewerRole === "buyer" && (status === "deal_closed" || status === "buyer_decided" || status === "completed") && !booking.agent_rating && agent && (
                  <Button size="sm" onClick={() => setRateOpen(true)} disabled={busy} className="bg-gradient-to-r from-amber-400 to-amber-500 text-primary-foreground"><Star className="h-3 w-3 mr-1" />Rate agent</Button>
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

        {/* ADMIN: qualify + assign dialog */}
        <Dialog open={qualifyOpen} onOpenChange={setQualifyOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Qualify & assign agent</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Qualification notes (optional)</Label>
                <Textarea rows={3} value={qualifyNotes} onChange={e => setQualifyNotes(e.target.value)} placeholder="Confirmed the buyer is genuine, budget aligned, locations available…" />
              </div>
              <div className="space-y-1.5">
                <Label>Assign agent</Label>
                <Select value={pickAgentId} onValueChange={setPickAgentId}>
                  <SelectTrigger><SelectValue placeholder="Pick an agent" /></SelectTrigger>
                  <SelectContent>
                    {availableAgents.length === 0 && <SelectItem value="none" disabled>No verified agents in {booking.city}</SelectItem>}
                    {availableAgents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} · Trust {a.trust_score} · ★{a.avg_rating || "—"}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setQualifyOpen(false)}>Cancel</Button>
              <Button onClick={submitQualify} disabled={busy || !pickAgentId}>Assign agent</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AGENT: decline dialog */}
        <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Decline this assignment</DialogTitle></DialogHeader>
            <div className="space-y-1.5">
              <Label>Why are you declining?</Label>
              <Textarea rows={3} value={declineReason} onChange={e => setDeclineReason(e.target.value)} placeholder="Schedule conflict, out of service area, etc." />
              <p className="text-xs text-muted-foreground">Admin will be notified to reassign another agent.</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDeclineOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={declineAssignment} disabled={busy}>Decline assignment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* BUYER: decision dialog */}
        <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>How were the visits?</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { v: "interested", label: "Interested", icon: ThumbsUp, cls: "border-emerald-500/40 bg-emerald-500/10" },
                  { v: "undecided", label: "Undecided", icon: Activity, cls: "border-amber-500/40 bg-amber-500/10" },
                  { v: "not_interested", label: "Not interested", icon: ThumbsDown, cls: "border-red-500/40 bg-red-500/10" },
                ] as const).map(o => {
                  const Icon = o.icon;
                  const sel = decisionChoice === o.v;
                  return (
                    <button key={o.v} onClick={() => setDecisionChoice(o.v)} className={`p-3 rounded-xl border text-center transition-all ${sel ? o.cls + " ring-2 ring-primary" : "border-border hover:border-primary/30"}`}>
                      <Icon className="h-5 w-5 mx-auto mb-1" />
                      <p className="text-xs font-medium">{o.label}</p>
                    </button>
                  );
                })}
              </div>
              {decisionChoice === "interested" && properties.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Which properties caught your eye?</Label>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {properties.map(p => (
                      <label key={p.id} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-accent">
                        <input type="checkbox" checked={interestedIds.includes(p.id)} onChange={(e) => setInterestedIds(prev => e.target.checked ? [...prev, p.id] : prev.filter(x => x !== p.id))} />
                        <span className="text-sm flex-1 truncate">{p.title}</span>
                        <span className="text-xs text-muted-foreground">{formatINR(p.price)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Notes for the agent (optional)</Label>
                <Textarea rows={3} value={decisionNotes} onChange={e => setDecisionNotes(e.target.value)} placeholder="What you liked / didn't like, next steps you want…" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDecisionOpen(false)}>Cancel</Button>
              <Button onClick={submitDecision} disabled={busy}>Submit decision</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* AGENT: close deal dialog */}
        <Dialog open={dealOpen} onOpenChange={setDealOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Close deal 🎉</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Property booked</Label>
                <Select value={dealPropertyId} onValueChange={setDealPropertyId}>
                  <SelectTrigger><SelectValue placeholder="Pick the property" /></SelectTrigger>
                  <SelectContent>
                    {(booking.interested_property_ids?.length ? properties.filter(p => booking.interested_property_ids.includes(p.id)) : properties).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Final deal amount (₹)</Label>
                <Input type="number" value={dealAmount} onChange={e => setDealAmount(e.target.value === "" ? "" : Number(e.target.value))} placeholder="e.g. 8500000" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDealOpen(false)}>Cancel</Button>
              <Button onClick={submitCloseDeal} disabled={busy} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">Confirm close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* BUYER: rate agent */}
        <Dialog open={rateOpen} onOpenChange={setRateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rate your agent</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-1 py-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setRateStars(n)}>
                    <Star className={`h-8 w-8 transition-all ${n <= rateStars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Share your experience (optional)</Label>
                <Textarea rows={4} value={rateReview} onChange={e => setRateReview(e.target.value)} placeholder="What stood out about your agent's service?" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRateOpen(false)}>Cancel</Button>
              <Button onClick={submitRating} disabled={busy} className="bg-gradient-to-r from-amber-400 to-amber-500 text-white">Submit rating</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
