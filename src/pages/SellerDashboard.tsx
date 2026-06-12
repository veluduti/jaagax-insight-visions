import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Plus, Home, BarChart, LogOut, Eye, MessageSquare, TrendingUp, IndianRupee,
  Edit, CheckCircle2, Clock, XCircle, AlertCircle, Sparkles, ArrowUpRight, MapPin, Bed, Bath, Maximize2, RefreshCw,
  Phone, Mail, CalendarDays, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { motion } from "framer-motion";
const PropertyChat = lazy(() => import("@/components/chat/PropertyChat"));
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
const BoostListingDialog = lazy(() => import("@/components/property/BoostListingDialog"));

// Phase 2-6 Seller Hub upgrades — additive, non-destructive
import WalletBalance from "@/components/seller/WalletBalance";
import SubscriptionManager from "@/components/seller/SubscriptionManager";
import KYCVerification from "@/components/seller/KYCVerification";
import NotificationCenter from "@/components/seller/NotificationCenter";
import AIRecommendations from "@/components/seller/AIRecommendations";
import ActivityTimeline from "@/components/seller/ActivityTimeline";
import VisitManagement from "@/components/seller/VisitManagement";
import ReferralLink from "@/components/seller/ReferralLink";
import MarkAsSoldButton from "@/components/seller/MarkAsSoldButton";
import PriceDropDialog from "@/components/seller/PriceDropDialog";

interface AssignedAgent {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  photo_url: string | null;
  agency_name: string | null;
  experience_years: number | null;
  avg_rating: number | null;
}

interface Property {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number;
  area_sqft: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  type: string | null;
  images: any;
  description: string | null;
  verified: boolean | null;
  verification_status: string;
  rejection_reason: string | null;
  is_draft: boolean | null;
  listing_type: string | null;
  created_at: string;
  assigned_agent_id: string | null;
  agent_submitted_at: string | null;
  is_live?: boolean | null;
  published_at?: string | null;
  expiry_date?: string | null;
  is_featured?: boolean | null;
  featured_until?: string | null;
  assigned_agent?: AssignedAgent | null;
  scheduled_visit_at?: string | null;
  task_status?: string | null;
  is_sold?: boolean | null;
  has_price_drop_ribbon?: boolean | null;
  previous_price?: number | null;
}

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending Approval", color: "bg-amber-500", icon: Clock },
  under_review: { label: "Under Review", color: "bg-amber-500", icon: Clock },
  agent_assigned: { label: "Agent Assigned", color: "bg-sky-500", icon: UserCheck },
  agent_verified_pending: { label: "Awaiting Final Approval", color: "bg-blue-500", icon: CheckCircle2 },
  approved: { label: "Live", color: "bg-emerald-500", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-rose-500", icon: XCircle },
  draft: { label: "Draft", color: "bg-slate-500", icon: Edit },
  expired: { label: "Expired", color: "bg-zinc-500", icon: Clock },
};

const getDisplayStatus = (p: Property) => {
  if (p.is_draft) return "draft";
  if (p.verification_status === "approved" && p.is_live) return "approved";
  if (p.verification_status === "rejected") return "rejected";
  if (p.verification_status === "expired") return "expired";
  if (p.verification_status && STATUS_META[p.verification_status]) return p.verification_status;
  return "pending";
};

const getTaskPriority = (task: any) => {
  const hasSchedule = typeof task?.metadata?.scheduled_visit_at === "string" ? 100 : 0;
  const statusWeight = task?.status === "in_progress" ? 30 : task?.status === "completed" ? 20 : task?.status === "assigned" ? 10 : 0;
  const updatedWeight = task?.updated_at ? new Date(task.updated_at).getTime() / 1e13 : 0;
  return hasSchedule + statusWeight + updatedWeight;
};

export default function SellerDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatProperty, setChatProperty] = useState<Property | null>(null);
  const [editTarget, setEditTarget] = useState<Property | null>(null);
  const [viewTarget, setViewTarget] = useState<Property | null>(null);
  const [editForm, setEditForm] = useState({ title: "", price: "", area_sqft: "", description: "", images: "" });
  const [resubmitting, setResubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { init(); }, []);

  // Realtime: refresh when agent_tasks or own properties change
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`seller-dash-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_tasks" }, () => fetchProperties(user.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "properties", filter: `submitted_by=eq.${user.id}` }, () => fetchProperties(user.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) await fetchProperties(user.id);
    setLoading(false);
  };

  const fetchProperties = async (uid: string) => {
    const { data } = await supabase
      .from("properties")
      .select("id, title, city, locality, price, area_sqft, bedrooms, bathrooms, type, images, description, verified, verification_status, rejection_reason, is_draft, listing_type, created_at, assigned_agent_id, agent_submitted_at, is_live, published_at, expiry_date, is_featured, featured_until, is_sold, has_price_drop_ribbon, previous_price")
      .eq("submitted_by", uid)
      .order("created_at", { ascending: false });

    const props = (data as any[]) || [];
    // Hydrate assigned_agent for each property that has one
    const agentIds = Array.from(new Set(props.map((p) => p.assigned_agent_id).filter(Boolean)));
    let agentMap: Record<string, AssignedAgent> = {};
    if (agentIds.length) {
      const { data: agents } = await supabase
        .from("agents")
        .select("id, user_id, name, phone, email, photo_url, agency_name, experience_years, avg_rating")
        .in("id", agentIds);
      (agents || []).forEach((a: any) => { agentMap[a.id] = a; });
    }
    // Fetch any agent_tasks scheduled for these properties
    const propIds = props.map((p) => p.id);
    const taskMap: Record<string, { scheduled_visit_at: string | null; task_status: string | null }> = {};
    if (propIds.length) {
      const { data: tasks } = await supabase
        .from("agent_tasks" as any)
        .select("property_id, status, metadata, updated_at")
        .in("property_id", propIds)
        .order("updated_at", { ascending: false });
      (tasks || []).forEach((t: any) => {
        if (!t?.property_id) return;
        const next = {
          scheduled_visit_at: typeof t?.metadata?.scheduled_visit_at === "string" ? t.metadata.scheduled_visit_at : null,
          task_status: t?.status || null,
        };
        const existing = taskMap[t.property_id];
        if (!existing || getTaskPriority(t) > getTaskPriority({ status: existing.task_status, metadata: { scheduled_visit_at: existing.scheduled_visit_at } })) {
          taskMap[t.property_id] = next;
        }
      });
    }
    setProperties(props.map((p) => ({
      ...p,
      assigned_agent: p.assigned_agent_id ? agentMap[p.assigned_agent_id] : null,
      scheduled_visit_at: taskMap[p.id]?.scheduled_visit_at || null,
      task_status: taskMap[p.id]?.task_status || null,
    })));
  };

  const propertiesWithScheduledVisits = useMemo(
    () => properties.filter((p) => Boolean(p.scheduled_visit_at)),
    [properties],
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/");
  };

  const formatPrice = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const openEdit = (p: Property) => {
    setEditTarget(p);
    setEditForm({
      title: p.title || "",
      price: String(p.price ?? ""),
      area_sqft: String(p.area_sqft ?? ""),
      description: p.description || "",
      images: Array.isArray(p.images) ? p.images.join("\n") : "",
    });
  };

  const submitResubmit = async () => {
    if (!editTarget || !user) return;
    const priceNum = Number(editForm.price);
    const areaNum = editForm.area_sqft ? Number(editForm.area_sqft) : null;
    if (!editForm.title.trim() || !Number.isFinite(priceNum) || priceNum <= 0) {
      toast.error("Title and a valid price are required");
      return;
    }
    setResubmitting(true);
    const newImages = editForm.images.split(/\n+/).map((s) => s.trim()).filter(Boolean);

    const { error } = await supabase
      .from("properties")
      .update({
        title: editForm.title.trim(),
        price: priceNum,
        area_sqft: areaNum,
        description: editForm.description,
        images: newImages,
        verification_status: "pending",
        verified: false,
        rejection_reason: null,
      })
      .eq("id", editTarget.id);

    if (error) {
      setResubmitting(false);
      toast.error(error.message);
      return;
    }

    // Notify admins for re-review
    const { data: admins } = await supabase
      .from("user_roles" as any)
      .select("user_id")
      .eq("role", "admin");
    if (admins?.length) {
      await supabase.from("notifications").insert(
        admins.map((a: any) => ({
          user_id: a.user_id,
          type: "property_resubmitted",
          title: "Property resubmitted for review",
          message: `Seller resubmitted "${editForm.title.trim()}" after edits.`,
          link: `/admin`,
        }))
      );
    }

    setResubmitting(false);
    setEditTarget(null);
    toast.success("Resubmitted! Your property is back under review.");
    void fetchProperties(user.id);
  };

  // Anything that is not approved+live, rejected, expired, or a draft is treated as "pending review"
  // (covers verification_status: pending, agent_assigned, agent_verified_pending, under_review, etc.)
  const isPending = (p: Property) =>
    !p.is_draft &&
    p.verification_status !== "rejected" &&
    p.verification_status !== "expired" &&
    !(p.verification_status === "approved" && p.is_live === true);

  const counts = {
    all: properties.length,
    pending: properties.filter(isPending).length,
    approved: properties.filter(p => p.verification_status === "approved" && p.is_live === true).length,
    rejected: properties.filter(p => p.verification_status === "rejected").length,
    draft: properties.filter(p => p.is_draft).length,
    expired: properties.filter(p => p.verification_status === "expired").length,
  };

  const handleRenew = async (propertyId: string, title: string) => {
    if (!user) return;
    if (!window.confirm(`Renew "${title}"? It will be sent back to admin for re-approval.`)) return;
    const { error } = await (supabase as any).rpc("renew_property_listing", { _property_id: propertyId });
    if (error) {
      toast.error(error.message || "Renewal failed");
      return;
    }
    toast.success("Renewal submitted — awaiting admin re-approval");
    void fetchProperties(user.id);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500" /></div>;
  }

  const PropertyTimeline = ({ p }: { p: Property }) => {
    const status = p.verification_status || "pending";
    const isApproved = status === "approved";
    const isRejected = status === "rejected";
    const isAgentVerified = status === "agent_verified_pending" || status === "approved" || status === "rejected" || !!p.agent_submitted_at;
    const hasAgent = !!p.assigned_agent_id || isAgentVerified;
    // "Submitted" is always done once the row exists.
    // "Under Review" = admin/system has the listing in pipeline (i.e. not draft) — true for any non-draft row.
    const isUnderReview = !p.is_draft;
    const isFinalRejected = isRejected;

    const steps = [
      { key: "submitted", label: "Submitted", done: true },
      { key: "review", label: "Under Review", done: isUnderReview },
      { key: "agent", label: "Agent Assigned", done: hasAgent },
      { key: "verified", label: "Verification Done", done: isAgentVerified },
      {
        key: "final",
        label: isFinalRejected ? "Rejected" : "Approved",
        done: isApproved || isFinalRejected,
        rejected: isFinalRejected,
      },
    ];
    const completedCount = steps.filter((s) => s.done).length;
    const progressPct = (completedCount / steps.length) * 100;

    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Listing Progress</p>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            {completedCount}/{steps.length}
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all ${isFinalRejected ? "bg-rose-500" : "bg-gradient-to-r from-emerald-500 to-emerald-400"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-start justify-between gap-1 pt-1">
          {steps.map((s, i) => (
            <div key={s.key} className="flex-1 flex flex-col items-center text-center">
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center border-2 ${
                  s.done
                    ? (s as any).rejected
                      ? "bg-rose-500 border-rose-500 text-white"
                      : "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-background border-border text-muted-foreground"
                }`}
              >
                {s.done ? (
                  (s as any).rejected ? (
                    <XCircle className="h-3 w-3" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )
                ) : (
                  <span className="text-[9px] font-bold">{i + 1}</span>
                )}
              </div>
              <span className={`text-[9px] mt-1 leading-tight ${s.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const PropertyCard = ({ p }: { p: Property }) => {
    const status = getDisplayStatus(p);
    const meta = STATUS_META[status] || STATUS_META.pending;
    const StatusIcon = meta.icon;
    const hasImage = Array.isArray(p.images) && p.images.length > 0 && !!p.images[0];
    const img = hasImage ? p.images[0] : null;
    const scheduledVisitLabel = p.scheduled_visit_at
      ? new Date(p.scheduled_visit_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
      : null;

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -4 }} className="h-full">
        <Card className="overflow-hidden border-2 hover:border-emerald-500/40 hover:shadow-xl transition-all group h-full flex flex-col">
          <div className="relative h-44 overflow-hidden">
            {img ? (
              <img src={img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"  loading="lazy" decoding="async" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/40 border-b border-dashed">
                <Home className="h-8 w-8 text-muted-foreground/60 mb-1" />
                <p className="text-xs font-medium text-muted-foreground">No image uploaded</p>
                <p className="text-[10px] text-muted-foreground/70">Add photos to attract more buyers</p>
              </div>
            )}
            {img && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />}
            <Badge className={`absolute top-3 left-3 ${meta.color} text-white border-0 gap-1`}>
              <StatusIcon className="h-3 w-3" />{meta.label}
            </Badge>
            {p.is_live && p.verification_status === "approved" && (
              <Badge className="absolute top-12 left-3 bg-emerald-600 text-white border-0 gap-1 shadow-lg">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                LIVE
              </Badge>
            )}
            {p.listing_type && (
              <Badge variant="secondary" className="absolute top-3 right-3 bg-background/90">
                {p.listing_type === "rent" ? "For Rent" : "For Sale"}
              </Badge>
            )}
            {img && (
              <div className="absolute bottom-3 left-3 right-3">
                <h3 className="text-white font-semibold line-clamp-1 drop-shadow">{p.title}</h3>
                <p className="text-white/80 text-xs flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />{p.locality}, {p.city}
                </p>
              </div>
            )}
            {!img && (
              <div className="absolute bottom-3 left-3 right-3 bg-background/95 backdrop-blur rounded-md p-2 border">
                <h3 className="font-semibold line-clamp-1 text-sm">{p.title}</h3>
                <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />{p.locality}, {p.city}
                </p>
              </div>
            )}
          </div>
          <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-xl font-bold text-emerald-500">{formatPrice(p.price)}</p>
              <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {p.bedrooms != null && <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{p.bedrooms} BHK</span>}
              {p.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{p.bathrooms}</span>}
              {p.area_sqft != null && <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" />{p.area_sqft} sqft</span>}
            </div>
            {scheduledVisitLabel && (
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3">
                <div className="flex items-start gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">Agent Visit Scheduled</p>
                    <p className="text-sm font-semibold text-foreground mt-0.5">{scheduledVisitLabel}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {p.task_status === "completed" ? "Visit completed by agent." : "Your assigned agent has scheduled the property visit."}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!p.is_draft && <PropertyTimeline p={p} />}
            {status === "rejected" && (
              <div className="p-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400 space-y-2">
                {p.rejection_reason && (
                  <div>
                    <p className="font-semibold flex items-center gap-1"><AlertCircle className="h-3 w-3" />Reason</p>
                    <p className="mt-0.5">{p.rejection_reason}</p>
                  </div>
                )}
                <Button
                  size="sm"
                  className="w-full h-7 text-[11px] bg-rose-500 hover:bg-rose-600 text-white"
                  onClick={() => openEdit(p)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />Edit & Resubmit
                </Button>
              </div>
            )}
            {p.assigned_agent && (
              <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Your Dedicated Agent
                </p>
                <div className="flex items-center gap-2">
                  {p.assigned_agent.photo_url ? (
                    <img src={p.assigned_agent.photo_url} alt={p.assigned_agent.name} className="h-8 w-8 rounded-full object-cover"  loading="lazy" decoding="async" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-600">
                      {p.assigned_agent.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.assigned_agent.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {p.assigned_agent.agency_name || "Independent"} · {p.assigned_agent.experience_years || 0}y exp
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="flex-1 h-7 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => setChatProperty(p)}
                    disabled={!p.assigned_agent?.user_id}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />Chat
                  </Button>
                  <a href={`tel:${p.assigned_agent.phone}`}>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] px-2">
                      <Phone className="h-3 w-3" />
                    </Button>
                  </a>
                  {p.assigned_agent.email && (
                    <a href={`mailto:${p.assigned_agent.email}`}>
                      <Button size="sm" variant="outline" className="h-7 text-[11px] px-2">
                        <Mail className="h-3 w-3" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
            {status === "approved" && !p.assigned_agent && (
              <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 dark:text-amber-400">
                Live but no agent assigned yet — we'll notify you once one is.
              </div>
            )}
            {status === "approved" && p.expiry_date && (
              <div className="text-[11px] text-muted-foreground">
                Expires on {new Date(p.expiry_date).toLocaleDateString()}
              </div>
            )}
            {status === "expired" && (
              <div className="p-2 rounded-md bg-zinc-500/10 border border-zinc-500/30 text-xs text-zinc-700 dark:text-zinc-300">
                This listing expired. Renew to send it back for admin re-approval.
              </div>
            )}
            <div className="flex gap-2 pt-1 flex-wrap mt-auto">
              <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" onClick={() => setViewTarget(p)}>
                <Eye className="h-3 w-3 mr-1" />View Details
              </Button>
              {(status === "rejected" || status === "draft") && (
                <Button size="sm" className="flex-1 min-w-[120px] bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => navigate(`/sell-property?edit=${p.id}`)}>
                  <Edit className="h-3 w-3 mr-1" />{status === "draft" ? "Continue" : "Edit & Resubmit"}
                </Button>
              )}
              {status === "approved" && (
                <>
                  <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" onClick={() => window.open(`/property/${p.id}`, "_blank")}>
                    <ArrowUpRight className="h-3 w-3 mr-1" />View Live
                  </Button>
                  {p.is_featured ? (
                    <Badge className="bg-amber-500 text-white gap-1 px-2 py-1">
                      <Sparkles className="h-3 w-3" /> Featured
                    </Badge>
                  ) : (
                    <Suspense fallback={<Button size="sm" className="flex-1 min-w-[120px]" disabled>Boost</Button>}>
                      <BoostListingDialog
                        propertyId={p.id}
                        onBoosted={() => { void supabase.auth.getUser().then(({ data }) => data.user && fetchProperties(data.user.id)); }}
                        trigger={
                          <Button size="sm" className="flex-1 min-w-[120px] gap-1 bg-amber-500 hover:bg-amber-600 text-white">
                            <Sparkles className="h-3 w-3" /> Boost
                          </Button>
                        }
                      />
                    </Suspense>
                  )}
                </>
              )}
              {status === "pending" && (
                <Button size="sm" variant="outline" className="flex-1 min-w-[120px]" disabled>
                  <Clock className="h-3 w-3 mr-1" />Awaiting Review
                </Button>
              )}
              {status === "expired" && (
                <Button size="sm" className="flex-1 min-w-[120px] bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => handleRenew(p.id, p.title)}>
                  <RefreshCw className="h-3 w-3 mr-1" />Renew Listing
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const filterProperties = (s: string) => {
    if (s === "all") return properties;
    if (s === "approved") return properties.filter(p => p.verification_status === "approved" && p.is_live === true);
    if (s === "pending") return properties.filter(isPending);
    if (s === "rejected") return properties.filter(p => p.verification_status === "rejected");
    if (s === "draft") return properties.filter(p => p.is_draft);
    if (s === "expired") return properties.filter(p => p.verification_status === "expired");
    return properties;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-500/5">
      <Navigation />

      {/* Header */}
      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-emerald-500" />
            Seller Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, {user?.email?.split("@")[0]}</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button onClick={() => navigate("/sell-property")} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
            <Plus className="h-4 w-4 mr-1" />Sell Your Property
          </Button>
          {user?.id && <NotificationCenter userId={user.id} />}
          <Button variant="outline" size="icon" onClick={() => fetchProperties(user.id)}><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" onClick={handleSignOut}><LogOut className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        {/* Seller Hub upgrades — wallet, plan, KYC */}
        {user?.id && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <WalletBalance userId={user.id} />
            <SubscriptionManager userId={user.id} />
            <KYCVerification userId={user.id} />
          </div>
        )}
        {/* Status overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: counts.all, icon: Home, color: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-500" },
            { label: "Live", value: counts.approved, icon: CheckCircle2, color: "from-green-500/20 to-green-500/5", iconColor: "text-green-500" },
            { label: "Pending", value: counts.pending, icon: Clock, color: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-500" },
            { label: "Rejected", value: counts.rejected, icon: XCircle, color: "from-rose-500/20 to-rose-500/5", iconColor: "text-rose-500" },
            { label: "Drafts", value: counts.draft, icon: Edit, color: "from-slate-500/20 to-slate-500/5", iconColor: "text-slate-500" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={`bg-gradient-to-br ${s.color} border-2 hover:shadow-lg transition-all`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                      <p className="text-2xl font-bold mt-1">{s.value}</p>
                    </div>
                    <s.icon className={`h-8 w-8 ${s.iconColor}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick action cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent hover:shadow-lg" onClick={() => navigate("/sell-property")}>
              <CardContent className="p-5 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/20"><Plus className="h-6 w-6 text-emerald-500" /></div>
                <div>
                  <h3 className="font-semibold">Sell Your Property</h3>
                  <p className="text-xs text-muted-foreground">List your home for sale</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer border-2 hover:shadow-lg" onClick={() => navigate("/valuation")}>
              <CardContent className="p-5 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/15"><IndianRupee className="h-6 w-6 text-blue-500" /></div>
                <div>
                  <h3 className="font-semibold">Get Valuation</h3>
                  <p className="text-xs text-muted-foreground">AI price estimate</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer border-2 hover:shadow-lg" onClick={() => navigate("/agents")}>
              <CardContent className="p-5 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/15"><MessageSquare className="h-6 w-6 text-purple-500" /></div>
                <div>
                  <h3 className="font-semibold">Find Agent</h3>
                  <p className="text-xs text-muted-foreground">Get expert help</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card className="cursor-pointer border-2 hover:shadow-lg" onClick={() => navigate("/dashboard/seller/analytics")}>
              <CardContent className="p-5 flex items-center gap-3">
                <div className="p-3 rounded-xl bg-orange-500/15"><BarChart className="h-6 w-6 text-orange-500" /></div>
                <div>
                  <h3 className="font-semibold">Analytics</h3>
                  <p className="text-xs text-muted-foreground">Track performance</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {propertiesWithScheduledVisits.length > 0 && (
          <Card className="border-2 border-blue-500/20 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-blue-500" />
                Scheduled Visits
              </CardTitle>
              <CardDescription>Your assigned agent visit times are shown here as soon as they are scheduled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {propertiesWithScheduledVisits.slice(0, 3).map((p) => (
                <div key={p.id} className="flex flex-col gap-1 rounded-lg border border-blue-500/20 bg-background/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.locality}, {p.city}</p>
                  </div>
                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {new Date(p.scheduled_visit_at as string).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Listings tabs */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>My Listings</CardTitle>
                <CardDescription>Track verification and manage your properties</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="flex flex-wrap h-auto">
                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
                <TabsTrigger value="approved">Live ({counts.approved})</TabsTrigger>
                <TabsTrigger value="rejected">Rejected ({counts.rejected})</TabsTrigger>
                <TabsTrigger value="draft">Drafts ({counts.draft})</TabsTrigger>
              </TabsList>
              {(["all", "pending", "approved", "rejected", "draft"] as const).map((s) => {
                const list = filterProperties(s);
                const emptyMeta: Record<string, { icon: any; iconColor: string; title: string; subtext: string; cta?: string }> = {
                  all: { icon: Home, iconColor: "text-emerald-500", title: "No properties yet", subtext: "Start by listing your first property", cta: "Sell Your Property" },
                  pending: { icon: Clock, iconColor: "text-amber-500", title: "No properties pending approval", subtext: "Once you submit a property, it will appear here for verification", cta: "Sell Your Property" },
                  approved: { icon: CheckCircle2, iconColor: "text-emerald-500", title: "No live properties", subtext: "Your approved properties will appear here" },
                  rejected: { icon: XCircle, iconColor: "text-rose-500", title: "No rejected properties", subtext: "All your listings are approved or pending" },
                  draft: { icon: Edit, iconColor: "text-slate-500", title: "No drafts available", subtext: "Start creating a property and save it as draft", cta: "Sell Your Property" },
                };
                const meta = emptyMeta[s];
                const EmptyIcon = meta.icon;
                return (
                  <TabsContent key={s} value={s} className="mt-6">
                    {list.length === 0 ? (
                      <div className="text-center py-16 border-2 border-dashed rounded-xl">
                        <EmptyIcon className={`h-16 w-16 mx-auto mb-3 ${meta.iconColor} opacity-60`} />
                        <p className="font-semibold mb-1">{meta.title}</p>
                        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{meta.subtext}</p>
                        {meta.cta && (
                          <Button onClick={() => navigate("/sell-property")} className="bg-emerald-500 hover:bg-emerald-600 text-white">
                            <Plus className="h-4 w-4 mr-1" />{meta.cta}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {list.map((p) => <PropertyCard key={p.id} p={p} />)}
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {chatProperty && chatProperty.assigned_agent?.user_id && user?.id && (
        <Suspense fallback={null}>
          <PropertyChat
            open={!!chatProperty}
            onOpenChange={(o) => !o && setChatProperty(null)}
            propertyId={chatProperty.id}
            propertyTitle={chatProperty.title}
            agentUserId={chatProperty.assigned_agent.user_id}
            sellerUserId={user.id}
            currentUserId={user.id}
            counterpart={{
              name: chatProperty.assigned_agent.name,
              photo_url: chatProperty.assigned_agent.photo_url,
              phone: chatProperty.assigned_agent.phone,
              role: "agent",
            }}
          />
        </Suspense>
      )}

      {/* Edit & Resubmit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && !resubmitting && setEditTarget(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit & Resubmit Property</DialogTitle>
            <DialogDescription>
              Address the admin's feedback and update your details. Once resubmitted, your property will return to "Pending Approval".
            </DialogDescription>
          </DialogHeader>
          {editTarget?.rejection_reason && (
            <div className="p-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-xs text-rose-600 dark:text-rose-400">
              <p className="font-semibold">Admin's reason:</p>
              <p className="mt-0.5">{editTarget.rejection_reason}</p>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Title</label>
              <Input value={editForm.title} onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Price (₹)</label>
                <Input type="number" value={editForm.price} onChange={(e) => setEditForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium">Area (sqft)</label>
                <Input type="number" value={editForm.area_sqft} onChange={(e) => setEditForm(f => ({ ...f, area_sqft: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Description</label>
              <Textarea rows={3} value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium">Image URLs (one per line)</label>
              <Textarea rows={3} value={editForm.images} onChange={(e) => setEditForm(f => ({ ...f, images: e.target.value }))} placeholder="https://...jpg" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={resubmitting} onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={submitResubmit} disabled={resubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <RefreshCw className="h-4 w-4 mr-1" />
              {resubmitting ? "Resubmitting…" : "Resubmit for Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details dialog — only filled fields, image or "no image" */}
      <Dialog open={!!viewTarget} onOpenChange={(o) => !o && setViewTarget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewTarget?.title || "Property Details"}</DialogTitle>
            <DialogDescription>
              Showing only the details you provided.
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (() => {
            const imgs = Array.isArray(viewTarget.images) ? viewTarget.images.filter(Boolean) : [];
            const fields = ([
              ["Type", viewTarget.type],
              ["For", viewTarget.listing_type ? (viewTarget.listing_type === "rent" ? "Rent" : "Sale") : null],
              ["City", viewTarget.city],
              ["Locality", viewTarget.locality],
              ["Price", viewTarget.price ? formatPrice(viewTarget.price) : null],
              ["Area", viewTarget.area_sqft ? `${viewTarget.area_sqft} sqft` : null],
              ["BHK", viewTarget.bedrooms],
              ["Bathrooms", viewTarget.bathrooms],
              ["Description", viewTarget.description],
              ["Status", STATUS_META[viewTarget.is_draft ? "draft" : (viewTarget.verification_status || "pending")]?.label],
              ["Submitted", new Date(viewTarget.created_at).toLocaleString()],
            ] as Array<[string, any]>).filter(([, v]) => v !== null && v !== undefined && v !== "");

            return (
              <div className="space-y-4">
                {imgs.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {imgs.map((u: string, i: number) => (
                      <img key={i} src={u} alt="" className="h-32 w-full object-cover rounded border"  loading="lazy" decoding="async" />
                    ))}
                  </div>
                ) : (
                  <div className="h-40 rounded border-2 border-dashed flex flex-col items-center justify-center bg-muted/30">
                    <Home className="h-10 w-10 text-muted-foreground/60 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No image uploaded</p>
                    <p className="text-xs text-muted-foreground/70">You haven't added any photos for this property.</p>
                  </div>
                )}
                <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  {fields.map(([k, v]) => (
                    <div key={k} className="border-b pb-1.5">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">{k}</p>
                      <p className="font-medium break-words">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
