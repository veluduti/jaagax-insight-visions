import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MapPin,
  Star,
  ChevronLeft,
  Loader2,
  BadgeCheck,
  Share2,
  Pencil,
  Copy,
  Camera,
  Home,
  IndianRupee,
  Briefcase,
  Activity,
  CalendarCheck,
  Handshake,
  Clock,
  ShieldCheck,
  Award,
  Building2,
  User as UserIcon,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import AgentKycPanel, { AgentKyc } from "@/components/agents/AgentKycPanel";
import ProjectExperienceEditor from "@/components/agents/ProjectExperienceEditor";
import ProjectExperienceCards from "@/components/agents/ProjectExperienceCards";
import {
  emptyDraft,
  fetchProjectExperience,
  saveProjectExperience,
  toDrafts,
  type AgentProjectExperience,
  type ProjectDraft,
} from "@/components/agents/projectExperience";

interface Agent {
  id: string;
  user_id: string | null;
  name: string | null;
  photo_url: string | null;
  phone: string | null;
  email: string | null;
  whatsapp_number?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  office_address?: string | null;
  agency_name: string | null;
  cities_served: string | null;
  localities_served?: string | null;
  city: string | null;
  district?: string | null;
  state?: string | null;
  languages: string | null;
  specializations?: string[] | null;
  experience_years: number | null;
  trust_score?: number | null;
  bio: string | null;
  verified: boolean | null;
  avg_rating: number | null;
  total_ratings: number | null;
  created_at: string | null;
}

interface PropertyRow {
  id: string;
  title: string;
  city: string | null;
  locality: string | null;
  price: number | null;
  sold_price?: number | null;
  images: any;
  type: string | null;
  is_sold: boolean | null;
  sold_at: string | null;
  sale_type: string | null;
  is_live?: boolean | null;
}

interface Review {
  id: string;
  rating: number | null;
  review: string | null;
  comment?: string | null;
  created_at: string | null;
}

const BIO_MAX = 500;

const fmtPrice = (n?: number | null) => {
  if (n == null || isNaN(Number(n)) || Number(n) <= 0) return "Price on Request";
  const v = Number(n);
  return v >= 1e7 ? `₹${(v / 1e7).toFixed(2)} Cr` : v >= 1e5 ? `₹${(v / 1e5).toFixed(2)} L` : `₹${v.toLocaleString("en-IN")}`;
};

const Row = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="space-y-1">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-medium break-words">{value?.toString().trim() || "—"}</p>
  </div>
);

const Stat = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number;
}) => (
  <div className="rounded-xl border bg-card p-4">
    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <p className="text-xl font-bold leading-none">{value}</p>
    <p className="mt-1 text-xs text-muted-foreground">{label}</p>
  </div>
);

const SectionHeader = ({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onClick: () => void } | null;
}) => (
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
    <CardTitle className="text-lg">{title}</CardTitle>
    {action && (
      <Button variant="ghost" size="sm" className="text-primary" onClick={action.onClick}>
        {action.label} <ArrowRight className="ml-1 h-3.5 w-3.5" />
      </Button>
    )}
  </CardHeader>
);

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [kyc, setKyc] = useState<AgentKyc | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Agent>>({});
  const [projects, setProjects] = useState<AgentProjectExperience[]>([]);
  const [projectDrafts, setProjectDrafts] = useState<ProjectDraft[]>([emptyDraft()]);
  const photoInput = useRef<HTMLInputElement | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [responseTime, setResponseTime] = useState<string>("—");
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAllListings, setShowAllListings] = useState(false);
  const [showAllSold, setShowAllSold] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const sb: any = supabase;
      const { data } = await sb.from("agents").select("*").eq("id", id).maybeSingle();
      if (!data) {
        toast.error("Agent not found");
        setLoading(false);
        return;
      }
      setAgent(data as Agent);
      setForm({ ...(data as Agent) });
      try {
        const rows = await fetchProjectExperience(data.id);
        setProjects(rows);
        setProjectDrafts(rows.length ? toDrafts(rows) : [emptyDraft()]);
      } catch {
        /* non-blocking */
      }

      const [{ data: props }, { data: revs }, { data: bdgs }, visits] = await Promise.all([
        sb
          .from("properties")
          .select("id, title, city, locality, price, sold_price, images, type, is_sold, sold_at, sale_type, is_live, agent_assigned_at, agent_accepted_at")
          .or(`assigned_agent_id.eq.${id},sold_by_agent_id.eq.${id}`)
          .order("created_at", { ascending: false }),
        sb.from("agent_ratings").select("id, rating, review, comment, created_at").eq("agent_id", id).order("created_at", { ascending: false }),
        sb.from("agent_badges").select("*").eq("agent_id", id),
        sb.from("visit_bookings").select("id", { count: "exact", head: true }).eq("agent_id", id),
      ]);

      const list = (props as any[]) || [];
      setProperties(list);
      setReviews((revs as Review[]) || []);
      setBadges((bdgs as any[]) || []);
      setVisitCount((visits as any)?.count || 0);

      // Average acceptance response time (assignment → acceptance)
      const deltas = list
        .filter((p) => p.agent_assigned_at && p.agent_accepted_at)
        .map((p) => (new Date(p.agent_accepted_at).getTime() - new Date(p.agent_assigned_at).getTime()) / 3.6e6)
        .filter((h) => h >= 0);
      if (deltas.length) {
        const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        setResponseTime(avg < 1 ? `${Math.max(1, Math.round(avg * 60))} min` : `${avg.toFixed(1)} hrs`);
      }

      if (data.user_id) {
        const { data: k } = await sb
          .from("agent_kyc_verifications")
          .select("*")
          .eq("user_id", data.user_id)
          .maybeSingle();
        setKyc(k || {});
      }
      setLoading(false);
    })();
  }, [id]);

  const canEdit = !!user && !!agent?.user_id && user.id === agent.user_id;
  const kycVerified = (kyc?.verification_status || "") === "verified";

  const soldProperties = useMemo(() => properties.filter((p) => p.is_sold), [properties]);
  const activeProperties = useMemo(() => properties.filter((p) => !p.is_sold), [properties]);

  const shareUrl = useMemo(
    () => `${window.location.origin}/agent/${agent?.id ?? ""}`,
    [agent?.id],
  );

  const agentCode = useMemo(
    () => (agent ? `JA-AGT-${agent.id.replace(/\D/g, "").slice(0, 6).padEnd(6, "0")}` : ""),
    [agent],
  );

  const handlePhoto = async (file: File) => {
    if (!user) return;
    setPhotoBusy(true);
    try {
      const path = `${user.id}/avatar-${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await supabase.storage.from("property-media").upload(path, file, {
        upsert: true,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("property-media").getPublicUrl(path);
      setForm((f) => ({ ...f, photo_url: data.publicUrl }));
      toast.success("Photo ready — save to apply");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSave = async () => {
    if (!agent) return;
    if (!(form.name || "").trim()) return toast.error("Name is required");
    if (!(form.phone || "").trim()) return toast.error("Phone number is required");
    setSaving(true);
    try {
      const specializations = (form.specializations_text || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const expRaw = form.experience_years as any;
      const exp = expRaw === "" || expRaw == null ? null : Number(expRaw);

      const payload: Record<string, any> = {
        name: (form.name || "").trim(),
        photo_url: form.photo_url || null,
        phone: (form.phone || "").trim(),
        email: form.email?.trim() || null,
        whatsapp_number: form.whatsapp_number?.trim() || null,
        gender: form.gender?.trim() || null,
        date_of_birth: form.date_of_birth || null,
        bio: (form.bio ?? "").slice(0, BIO_MAX).trim() || null,
        languages: form.languages?.trim() || null,
        experience_years: exp != null && Number.isFinite(exp) ? exp : null,
        agency_name: form.agency_name?.trim() || null,
        office_address: form.office_address?.trim() || null,
        city: form.city?.trim() || null,
        cities_served: form.cities_served?.trim() || null,
        localities_served: form.localities_served?.trim() || null,
        specializations: specializations.length ? specializations : null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await (supabase as any)
        .from("agents")
        .update(payload)
        .eq("id", agent.id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("You don't have permission to edit this profile.");

      setAgent(data as Agent);
      setForm({ ...(data as Agent), specializations_text: (data.specializations || []).join(", ") });
      setEditOpen(false);
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: agent?.name || "Agent Profile", url: shareUrl });
        return;
      } catch {
        /* cancelled */
      }
    }
    setShareOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-24 text-center">
          <p className="text-muted-foreground">Agent profile not found.</p>
          <Button className="mt-4" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const memberSince = agent.created_at
    ? new Date(agent.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : "—";

  const areas = [
    ...(agent.cities_served || "").split(","),
    ...(agent.localities_served || "").split(","),
    agent.city || "",
    agent.district || "",
    agent.state || "",
  ]
    .map((a) => a.trim())
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const specializations = agent.specializations || [];
  const shownReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const shownListings = showAllListings ? activeProperties : activeProperties.slice(0, 3);
  const shownSold = showAllSold ? soldProperties : soldProperties.slice(0, 3);

  const PropertyCard = ({ p, sold }: { p: PropertyRow; sold?: boolean }) => {
    const img = (Array.isArray(p.images) && p.images[0]) || "";
    return (
      <button
        onClick={() => window.open(`/property/${p.id}`, "_blank")}
        className="group flex gap-3 rounded-xl border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md"
      >
        <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
          {img ? (
            <img src={img} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold group-hover:text-primary">{p.title}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {[p.locality, p.city].filter(Boolean).join(", ") || "—"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-bold text-emerald-600">
              {fmtPrice(sold ? p.sold_price ?? p.price : p.price)}
            </span>
            {sold && (
              <Badge variant="outline" className="gap-1 text-[10px]">
                {p.sale_type === "agency" ? (
                  <>
                    <Building2 className="h-3 w-3" /> Agency
                  </>
                ) : (
                  <>
                    <UserIcon className="h-3 w-3" /> Individual
                  </>
                )}
              </Badge>
            )}
            {sold && p.sold_at && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(p.sold_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${agent.name || "Agent"} — Agent Profile | JAAGA X`}
        description={`Profile, performance and verified listings for ${agent.name || "this agent"} on JAAGA X.`}
      />
      <Navigation />

      <main className="container mx-auto max-w-5xl space-y-6 px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        {/* 1. Profile Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="overflow-hidden rounded-2xl shadow-sm">
            <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
            <CardContent className="-mt-12 flex flex-col gap-6 pb-6 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
                <Avatar className="h-28 w-28 border-4 border-background shadow-lg">
                  <AvatarImage src={agent.photo_url || undefined} alt={agent.name || "Agent"} />
                  <AvatarFallback className="text-2xl">
                    {(agent.name || "A").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold">{agent.name || "Unnamed Agent"}</h1>
                    {kycVerified && (
                      <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verified Agent
                      </Badge>
                    )}
                  </div>
                  {agent.agency_name && (
                    <p className="text-sm text-muted-foreground">{agent.agency_name}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">
                      {agent.avg_rating ? Number(agent.avg_rating).toFixed(1) : "—"}
                    </span>
                    <span className="text-muted-foreground">
                      ({agent.total_ratings || reviews.length || 0} Reviews)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 pt-1 sm:grid-cols-3">
                    <Row label="Agent ID" value={agentCode} />
                    <Row label="Member Since" value={memberSince} />
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Location</p>
                      <p className="flex items-center gap-1 text-sm font-medium">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {agent.city || agent.district || agent.state || agent.cities_served || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                {canEdit && (
                  <Button onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit Profile
                  </Button>
                )}
                <Button variant="outline" onClick={nativeShare}>
                  <Share2 className="mr-2 h-4 w-4" /> Share Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 2. Business Performance */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Business Performance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Stat icon={Home} label="Listed" value={properties.length} />
            <Stat icon={IndianRupee} label="Sold" value={soldProperties.length} />
            <Stat icon={Briefcase} label="Managed" value={properties.length} />
            <Stat icon={Activity} label="Active" value={activeProperties.length} />
            <Stat icon={CalendarCheck} label="Site Visits" value={visitCount} />
            <Stat icon={Handshake} label="Deals" value={soldProperties.length} />
          </CardContent>
        </Card>

        {/* 3. Trust Metrics */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Trust Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat
              icon={Star}
              label="Rating"
              value={agent.avg_rating ? Number(agent.avg_rating).toFixed(1) : "—"}
            />
            <Stat icon={Star} label="Reviews" value={agent.total_ratings || reviews.length || 0} />
            <Stat icon={Clock} label="Response Time" value={responseTime} />
            <Stat icon={ShieldCheck} label="KYC" value={kycVerified ? "Verified" : "Pending"} />
            <Stat icon={BadgeCheck} label="Verified" value={agent.verified ? "Yes" : "No"} />
          </CardContent>
        </Card>

        {/* 4. About Me */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">About Me</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {agent.bio?.trim() || "No biography added yet."}
            </p>
          </CardContent>
        </Card>

        {/* 5. I Specialize In */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">I Specialize In</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {specializations.length ? (
              specializations.map((s) => (
                <Badge key={s} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {s}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No specializations added yet.</p>
            )}
          </CardContent>
        </Card>

        {/* 6. Areas I Serve */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Areas I Serve</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {areas.length ? (
              areas.map((a) => (
                <Badge key={a} variant="outline" className="gap-1 rounded-full px-3 py-1 text-xs">
                  <MapPin className="h-3 w-3 text-primary" /> {a}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No service areas added yet.</p>
            )}
          </CardContent>
        </Card>

        {/* 7. Professional Information */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Professional Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Row label="Agency Name" value={agent.agency_name} />
            <Row
              label="Experience"
              value={agent.experience_years ? `${agent.experience_years} years` : null}
            />
            <Row label="Languages" value={agent.languages} />
            <Row label="Office Address" value={agent.office_address} />
            <Row label="Phone Number" value={agent.phone} />
            <Row label="Email Address" value={agent.email} />
            <Row label="WhatsApp Number" value={agent.whatsapp_number} />
            <Row label="Gender" value={agent.gender} />
            <Row
              label="Date of Birth"
              value={agent.date_of_birth ? new Date(agent.date_of_birth).toLocaleDateString() : null}
            />
            <Row label="Operating City" value={agent.cities_served || agent.city} />
          </CardContent>
        </Card>

        {/* 8. Achievements & Badges */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Achievements &amp; Badges</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {badges.length ? (
              badges.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2"
                >
                  <Award className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">{b.badge_name || "Badge"}</p>
                    {b.achieved_at && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(b.achieved_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No badges earned yet — close deals and collect reviews to unlock achievements.
              </p>
            )}
          </CardContent>
        </Card>

        {/* 9. Customer Reviews */}
        <Card className="rounded-2xl shadow-sm">
          <SectionHeader
            title="Customer Reviews"
            action={
              reviews.length > 3
                ? {
                    label: showAllReviews ? "Show less" : "View All Reviews",
                    onClick: () => setShowAllReviews((v) => !v),
                  }
                : null
            }
          />
          <CardContent className="space-y-3">
            {shownReviews.length ? (
              shownReviews.map((r) => (
                <div key={r.id} className="rounded-xl border bg-card p-3">
                  <div className="mb-1 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < (r.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"
                        }`}
                      />
                    ))}
                    {r.created_at && (
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {r.review || r.comment || "No written feedback."}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </CardContent>
        </Card>

        {/* 10. Current Property Listings */}
        <Card className="rounded-2xl shadow-sm">
          <SectionHeader
            title="Current Property Listings"
            action={
              activeProperties.length > 3
                ? {
                    label: showAllListings ? "Show less" : "View All",
                    onClick: () => setShowAllListings((v) => !v),
                  }
                : null
            }
          />
          <CardContent className="grid gap-3 md:grid-cols-2">
            {shownListings.length ? (
              shownListings.map((p) => <PropertyCard key={p.id} p={p} />)
            ) : (
              <p className="text-sm text-muted-foreground">No active listings right now.</p>
            )}
          </CardContent>
        </Card>

        {/* 11. Sold Properties */}
        <Card className="rounded-2xl shadow-sm">
          <SectionHeader
            title="Sold Properties"
            action={
              soldProperties.length > 3
                ? {
                    label: showAllSold ? "Show less" : "View All Sold Properties",
                    onClick: () => setShowAllSold((v) => !v),
                  }
                : null
            }
          />
          <CardContent className="grid gap-3 md:grid-cols-2">
            {shownSold.length ? (
              shownSold.map((p) => <PropertyCard key={p.id} p={p} sold />)
            ) : (
              <p className="text-sm text-muted-foreground">No sold properties yet.</p>
            )}
          </CardContent>
        </Card>

        {/* KYC — owner only; visitors see status only */}
        {canEdit ? (
          <AgentKycPanel userId={agent.user_id} kyc={kyc} canEdit onChange={(k) => setKyc(k)} />
        ) : (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {kycVerified ? (
                <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                  <BadgeCheck className="h-3.5 w-3.5" /> KYC Verified
                </Badge>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This agent has not completed KYC verification yet.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />

      {/* Edit Profile */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={form.photo_url || undefined} />
                <AvatarFallback>{(form.name || "A").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <input
                ref={photoInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={photoBusy}
                onClick={() => photoInput.current?.click()}
              >
                {photoBusy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="mr-2 h-4 w-4" />
                )}
                Change Photo
              </Button>
            </div>

            {(
              [
                ["name", "Full Name"],
                ["phone", "Phone Number"],
                ["email", "Email Address"],
                ["whatsapp_number", "WhatsApp Number"],
                ["gender", "Gender"],
                ["languages", "Languages"],
                ["experience_years", "Experience (years)"],
                ["agency_name", "Agency Name"],
                ["office_address", "Office Address"],
                ["cities_served", "Operating City"],
                ["localities_served", "Localities Served"],
              ] as Array<[keyof Agent, string]>
            ).map(([key, label]) => (
              <div key={String(key)} className="space-y-1.5">
                <Label>{label}</Label>
                <Input
                  type={key === "experience_years" ? "number" : "text"}
                  value={(form[key] as any) ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}

            <div className="space-y-1.5">
              <Label>I Specialize In (comma separated)</Label>
              <Input
                placeholder="Apartments, Plots, Commercial"
                value={form.specializations_text ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, specializations_text: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Date of Birth</Label>
              <Input
                type="date"
                value={(form.date_of_birth as string) ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, date_of_birth: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>About Me</Label>
                <span className="text-xs text-muted-foreground">
                  {(form.bio || "").length}/{BIO_MAX}
                </span>
              </div>
              <Textarea
                rows={5}
                maxLength={BIO_MAX}
                value={form.bio ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Profile */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input readOnly value={shareUrl} />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["WhatsApp", `https://wa.me/?text=${encodeURIComponent(shareUrl)}`],
                ["Facebook", `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`],
                ["LinkedIn", `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`],
                ["Twitter / X", `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`],
              ].map(([label, url]) => (
                <Button
                  key={label}
                  variant="outline"
                  onClick={() => window.open(url, "_blank", "noopener")}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentDetail;
