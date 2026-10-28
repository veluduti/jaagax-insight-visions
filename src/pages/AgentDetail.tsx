import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
  ChevronRight,
  Loader2,
  BadgeCheck,
  Share2,
  Pencil,
  Copy,
  Heart,
  Phone,
  Mail,
  MessageCircle,
  CalendarCheck,
  Clock,
  ShieldCheck,
  Award,
  Building2,
  BedDouble,
  Bath,
  Ruler,
  Quote,
  Plus,
  Trash2,
  Navigation as NavigationIcon,
  Languages,
  Home,
  Landmark,
  TrendingUp,
  KeyRound,
  Users,
  Sparkles,
  Briefcase,
  Crown,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import AgentKycPanel, { AgentKyc } from "@/components/agents/AgentKycPanel";
import ProjectExperienceEditor from "@/components/agents/ProjectExperienceEditor";
import AgentTemplateUpload from "@/components/agents/AgentTemplateUpload";
import ProjectExperienceCards from "@/components/agents/ProjectExperienceCards";
import {
  emptyDraft,
  fetchProjectExperience,
  saveProjectExperience,
  toDrafts,
  type AgentProjectExperience,
  type ProjectDraft,
} from "@/components/agents/projectExperience";
import {
  agentPublicLabel,
  agentAvatarInitials,
  agentLanguages,
  canRevealAgentContact,
  LANGUAGE_OPTIONS,
} from "@/lib/agentPrivacy";
import {
  agentAreasList,
  agentProfileStats,
  agentServiceChips,
  agentSpecializations,
  agentTrustItems,
  agentTypeChips,
  buildMailLink,
  buildTelLink,
  buildWhatsAppLink,
  formatAgentPropertyPrice,
  MEETING_TIME_SLOTS,
  type AgentProfileLike,
} from "@/lib/agentProfile";
import { loadGoogleMaps } from "@/lib/googleMaps";
import { agentCityCentre } from "@/components/agents/AgentDiscoveryMap";
import agentsHero from "@/assets/agents-hero.jpg";

/* ---------------- types ---------------- */

interface Agent extends AgentProfileLike {
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
  languages_spoken?: string[] | null;
  agent_code?: string | null;
  specializations?: string[] | null;
  experience_years: number | null;
  trust_score?: number | null;
  bio: string | null;
  verified: boolean | null;
  avg_rating: number | null;
  total_ratings: number | null;
  sales_count?: number | null;
  rent_count?: number | null;
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
  listing_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqft?: number | null;
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
  is_verified?: boolean | null;
  agent_reply?: string | null;
  created_at: string | null;
}

interface Faq {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

const BIO_MAX = 500;

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "properties", label: "Properties" },
  { id: "services", label: "Services" },
  { id: "areas", label: "Areas Covered" },
  { id: "reviews", label: "Reviews" },
  { id: "stories", label: "Client Stories" },
  { id: "certifications", label: "Certifications" },
  { id: "faqs", label: "FAQs" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const SPEC_ICONS: Record<string, any> = {
  residential: Home,
  commercial: Building2,
  plots: Landmark,
  rental: KeyRound,
  investment: TrendingUp,
  nri: Users,
  management: Briefcase,
  luxury: Crown,
};

/* ---------------- small pieces ---------------- */

const Stars = ({ value, size = "h-3.5 w-3.5" }: { value: number; size?: string }) => (
  <span className="inline-flex items-center gap-0.5">
    {Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`${size} ${i < Math.round(value) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
      />
    ))}
  </span>
);

const propertyBadge = (p: PropertyRow): string =>
  /rent|lease/i.test(p.listing_type || "") ? "For Rent" : "For Sale";

/** Small Google map centred on the agent's city centre (agents have no saved pins). */
const OfficeMap = ({ agent }: { agent: Agent }) => {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const centre = agentCityCentre(agent as any);

  useEffect(() => {
    if (!centre) return;
    if (window.location.hostname === "localhost") {
      setError("Map preview is available on the published website.");
      return;
    }
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !container.current) return;
        const map = new google.maps.Map(container.current, {
          center: { lat: centre[0], lng: centre[1] },
          zoom: 12,
          clickableIcons: false,
          mapTypeControl: false,
          streetViewControl: false,
        });
        new google.maps.Marker({
          map,
          position: { lat: centre[0], lng: centre[1] },
          title: agent.agency_name || "Office area",
        });
      })
      .catch(() => setError("The map could not load."));
    return () => {
      cancelled = true;
    };
  }, [centre, agent.agency_name]);

  if (!centre) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">
        Map location not available yet
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-muted px-3 text-center text-xs text-muted-foreground">
        {error}
      </div>
    );
  }
  return <div ref={container} className="h-40 w-full rounded-xl" />;
};

/* ---------------- main page ---------------- */

const AgentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [kyc, setKyc] = useState<AgentKyc | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("overview");

  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Agent>>({});
  const [projects, setProjects] = useState<AgentProjectExperience[]>([]);
  const [projectDrafts, setProjectDrafts] = useState<ProjectDraft[]>([emptyDraft()]);

  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // contact gating
  const [contactAllowed, setContactAllowed] = useState(false);
  const [contactChecked, setContactChecked] = useState(false);

  // contact form
  const [channel, setChannel] = useState<"whatsapp" | "call" | "email">("whatsapp");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // meeting scheduler
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingSlot, setMeetingSlot] = useState<string>("");
  const [meetingName, setMeetingName] = useState("");
  const [meetingContact, setMeetingContact] = useState("");
  const [meetingNote, setMeetingNote] = useState("");
  const [meetingSaving, setMeetingSaving] = useState(false);

  // FAQ editor (owner)
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqDraft, setFaqDraft] = useState<{ id?: string; question: string; answer: string }>({
    question: "",
    answer: "",
  });
  const [faqSaving, setFaqSaving] = useState(false);

  /* ---------- data loading ---------- */

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

      const [{ data: props }, { data: revs }, { data: bdgs }, { data: faqRows }] = await Promise.all([
        sb
          .from("properties")
          .select(
            "id, title, city, locality, price, sold_price, images, type, listing_type, bedrooms, bathrooms, area_sqft, is_sold, sold_at, sale_type, is_live",
          )
          .or(`assigned_agent_id.eq.${id},sold_by_agent_id.eq.${id}`)
          .order("created_at", { ascending: false }),
        sb
          .from("agent_ratings")
          .select("id, rating, review, comment, is_verified, agent_reply, created_at")
          .eq("agent_id", id)
          .order("created_at", { ascending: false }),
        sb.from("agent_badges").select("*").eq("agent_id", id),
        sb.from("agent_faqs").select("id, question, answer, sort_order").eq("agent_id", id).order("sort_order"),
      ]);

      setProperties((props as PropertyRow[]) || []);
      setReviews((revs as Review[]) || []);
      setBadges((bdgs as any[]) || []);
      setFaqs((faqRows as Faq[]) || []);

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

  // favorite state for the signed-in user
  useEffect(() => {
    if (!user || !id) {
      setIsFavorite(false);
      return;
    }
    supabase
      .from("agent_favorites")
      .select("agent_id")
      .eq("user_id", user.id)
      .eq("agent_id", id)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [user, id]);

  // Contact details stay private until the agent is assigned to (and has
  // accepted) the signed-in user's property — same rule as Find an Agent.
  useEffect(() => {
    if (!user || !id || !agent) {
      setContactChecked(!!agent);
      return;
    }
    if (user.id === agent.user_id) {
      setContactAllowed(true);
      setContactChecked(true);
      return;
    }
    (async () => {
      const { data: assigned } = await supabase
        .from("properties")
        .select("id, lifecycle_status")
        .eq("listed_by", user.id)
        .eq("assigned_agent_id", id)
        .limit(5);
      const allowed = (assigned || []).some((p) => canRevealAgentContact(p.lifecycle_status));
      setContactAllowed(allowed);
      setContactChecked(true);
    })();
  }, [user, id, agent]);

  /* ---------- derived ---------- */

  const canEdit = !!user && !!agent?.user_id && user.id === agent.user_id;
  const displayName = canEdit ? agent?.name || "Unnamed Agent" : agentPublicLabel(agent);
  const kycVerified = (kyc?.verification_status || "") === "verified";

  const stats = useMemo(() => (agent ? agentProfileStats(agent) : null), [agent]);
  const areas = useMemo(() => (agent ? agentAreasList(agent) : []), [agent]);
  const serviceChips = useMemo(() => (agent ? agentServiceChips(agent) : []), [agent]);
  const typeChips = useMemo(() => (agent ? agentTypeChips(agent) : []), [agent]);
  const specializations = useMemo(() => (agent ? agentSpecializations(agent) : []), [agent]);
  const trustItems = useMemo(
    () => (agent ? agentTrustItems(agent, kycVerified) : []),
    [agent, kycVerified],
  );

  const soldProperties = useMemo(() => properties.filter((p) => p.is_sold), [properties]);
  const activeProperties = useMemo(() => properties.filter((p) => !p.is_sold), [properties]);
  const featuredProperties = activeProperties.slice(0, 4);
  const stories = useMemo(
    () => reviews.filter((r) => (r.review || r.comment || "").trim().length > 40),
    [reviews],
  );
  const highlightReview = stories[0] || null;

  const shareUrl = useMemo(
    () => `${window.location.origin}/agent/${agent?.id ?? ""}`,
    [agent?.id],
  );

  const languages = agent ? agentLanguages(agent) : [];
  const locationLabel = agent
    ? [agent.city, agent.state].filter(Boolean).join(", ") || areas[0] || ""
    : "";

  /* ---------- actions ---------- */

  const toggleFavorite = async () => {
    if (!user) {
      toast.info("Sign in to save favorite agents.");
      navigate("/auth");
      return;
    }
    if (!agent) return;
    if (isFavorite) {
      const { error } = await supabase
        .from("agent_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("agent_id", agent.id);
      if (error) return toast.error("Could not update favorites.");
      setIsFavorite(false);
    } else {
      const { error } = await supabase
        .from("agent_favorites")
        .insert({ user_id: user.id, agent_id: agent.id });
      if (error) return toast.error("Could not update favorites.");
      setIsFavorite(true);
      toast.success("Agent saved to favorites");
    }
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${displayName} — JAAGA X Agent`, url: shareUrl });
        return;
      } catch {
        /* cancelled */
      }
    }
    setShareOpen(true);
  };

  const requireAuth = (): boolean => {
    if (!user) {
      toast.info("Sign in to contact this agent.");
      navigate("/auth");
      return false;
    }
    return true;
  };

  const recordInquiry = async (msg: string, ch: string) => {
    if (!user || !agent) return;
    const sb: any = supabase;
    const name =
      (user.user_metadata?.full_name as string) || user.email?.split("@")[0] || "Customer";
    await sb.from("agent_inquiries").insert({
      agent_id: agent.id,
      sender_user_id: user.id,
      sender_name: name,
      message: msg,
      channel: ch,
    });
  };

  const handleSend = async () => {
    if (!agent) return;
    const msg = message.trim();
    if (!msg) return toast.error("Please write a short message first.");
    if (msg.length > 1000) return toast.error("Message is too long (max 1000 characters).");
    if (!requireAuth()) return;

    setSending(true);
    try {
      await recordInquiry(msg, channel);

      if (!contactAllowed) {
        toast.success(
          "Your enquiry has been sent to the agent. Contact details are shared once the agent is assigned to your property.",
        );
        setMessage("");
        return;
      }

      const label = agentPublicLabel(agent);
      if (channel === "whatsapp") {
        const link = buildWhatsAppLink(agent.whatsapp_number || agent.phone, msg);
        if (!link) {
          toast.success("Enquiry sent — the agent will reach out to you.");
        } else {
          window.open(link, "_blank", "noopener");
          toast.success("Opening WhatsApp…");
        }
      } else if (channel === "call") {
        const link = buildTelLink(agent.phone);
        if (link) window.location.href = link;
        else toast.info("This agent has no phone number on record yet.");
      } else {
        const link = buildMailLink(agent.email, `Property enquiry via JAAGA X for ${label}`, msg);
        if (link) window.location.href = link;
        else toast.info("This agent has no email on record yet.");
      }
      setMessage("");
    } finally {
      setSending(false);
    }
  };

  const submitMeeting = async () => {
    if (!agent) return;
    if (!requireAuth()) return;
    if (!meetingName.trim()) return toast.error("Please enter your name.");
    if (!meetingDate) return toast.error("Please pick a date.");
    if (meetingDate < new Date().toISOString().slice(0, 10))
      return toast.error("Please pick a future date.");
    if (!meetingSlot) return toast.error("Please pick a time slot.");

    setMeetingSaving(true);
    try {
      const sb: any = supabase;
      const { error } = await sb.from("agent_meeting_requests").insert({
        agent_id: agent.id,
        requester_user_id: user!.id,
        requester_name: meetingName.trim(),
        requester_contact: meetingContact.trim() || null,
        preferred_date: meetingDate,
        time_slot: meetingSlot,
        message: meetingNote.trim() || null,
      });
      if (error) throw error;
      toast.success("Meeting request sent — the agent will confirm your slot.");
      setMeetingOpen(false);
      setMeetingDate("");
      setMeetingSlot("");
      setMeetingNote("");
    } catch (e: any) {
      toast.error(e.message || "Could not send the meeting request.");
    } finally {
      setMeetingSaving(false);
    }
  };

  const saveFaq = async () => {
    if (!agent) return;
    if (!faqDraft.question.trim() || !faqDraft.answer.trim())
      return toast.error("Question and answer are both required.");
    setFaqSaving(true);
    try {
      const sb: any = supabase;
      if (faqDraft.id) {
        const { error } = await sb
          .from("agent_faqs")
          .update({ question: faqDraft.question.trim(), answer: faqDraft.answer.trim() })
          .eq("id", faqDraft.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("agent_faqs").insert({
          agent_id: agent.id,
          question: faqDraft.question.trim(),
          answer: faqDraft.answer.trim(),
          sort_order: faqs.length,
        });
        if (error) throw error;
      }
      const { data } = await sb
        .from("agent_faqs")
        .select("id, question, answer, sort_order")
        .eq("agent_id", agent.id)
        .order("sort_order");
      setFaqs((data as Faq[]) || []);
      setFaqOpen(false);
      setFaqDraft({ question: "", answer: "" });
      toast.success("FAQ saved");
    } catch (e: any) {
      toast.error(e.message || "Could not save FAQ");
    } finally {
      setFaqSaving(false);
    }
  };

  const deleteFaq = async (faqId: string) => {
    const sb: any = supabase;
    const { error } = await sb.from("agent_faqs").delete().eq("id", faqId);
    if (error) return toast.error("Could not delete FAQ");
    setFaqs((f) => f.filter((x) => x.id !== faqId));
  };

  const handleSave = async () => {
    if (!agent) return;
    if (!(form.name || "").trim()) return toast.error("Name is required");
    if (!(form.phone || "").trim()) return toast.error("Phone number is required");
    setSaving(true);
    try {
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
        languages: (form.languages_spoken || []).join(", ") || form.languages?.trim() || null,
        languages_spoken: form.languages_spoken || [],
        experience_years: exp != null && Number.isFinite(exp) ? exp : null,
        agency_name: form.agency_name?.trim() || null,
        office_address: form.office_address?.trim() || null,
        city: form.city?.trim() || null,
        cities_served: form.cities_served?.trim() || null,
        localities_served: form.localities_served?.trim() || null,
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

      const rows = await saveProjectExperience(
        agent.id,
        projectDrafts,
        projects.map((p) => p.id),
      );
      setProjects(rows);
      setProjectDrafts(rows.length ? toDrafts(rows) : [emptyDraft()]);

      setAgent(data as Agent);
      setForm({ ...(data as Agent) });
      setEditOpen(false);
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message || "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- render states ---------- */

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

  /* ---------- sub-renderers ---------- */

  const PropertyCard = ({ p }: { p: PropertyRow }) => {
    const img = (Array.isArray(p.images) && p.images[0]) || "";
    const badge = propertyBadge(p);
    return (
      <div className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md">
        <div className="relative h-40 bg-muted">
          {img ? (
            <img src={img} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white ${
              badge === "For Rent" ? "bg-violet-600" : "bg-emerald-600"
            }`}
          >
            {p.is_sold ? "Sold" : badge}
          </span>
        </div>
        <div className="space-y-1.5 p-3.5">
          <p className="truncate text-sm font-semibold">{p.title}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            {[p.locality, p.city].filter(Boolean).join(", ") || "—"}
          </p>
          <p className="text-base font-bold text-emerald-600">
            {formatAgentPropertyPrice(p.is_sold ? p.sold_price ?? p.price : p.price)}
            {badge === "For Rent" && !p.is_sold && (
              <span className="text-xs font-normal text-muted-foreground"> /month</span>
            )}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            {p.bedrooms != null && (
              <span className="flex items-center gap-1">
                <BedDouble className="h-3 w-3" /> {p.bedrooms} Beds
              </span>
            )}
            {p.bathrooms != null && (
              <span className="flex items-center gap-1">
                <Bath className="h-3 w-3" /> {p.bathrooms} Baths
              </span>
            )}
            {p.area_sqft != null && (
              <span className="flex items-center gap-1">
                <Ruler className="h-3 w-3" /> {Number(p.area_sqft).toLocaleString("en-IN")} sq ft
              </span>
            )}
          </div>
          <div className="flex gap-2 pt-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`/property/${p.id}`, "_blank")}
            >
              View Details
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1"
              onClick={() => {
                setChannel("whatsapp");
                setMessage(
                  `Hi, I'm interested in "${p.title}" (${[p.locality, p.city].filter(Boolean).join(", ")}). Please share more details.`,
                );
                document.getElementById("get-in-touch")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <MessageCircle className="h-3.5 w-3.5" /> Contact
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const bioText = agent.bio?.trim() || "";
  const bioLong = bioText.length > 280;

  /* ---------- page ---------- */

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${displayName} — Agent Profile | JAAGA X`}
        description={`Profile, performance and verified listings for ${displayName} on JAAGA X.`}
      />
      <Navigation />

      {/* Hero banner */}
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden">
          <img src={agentsHero} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        </div>

        <div className="relative container mx-auto max-w-7xl px-4 pb-8 pt-6">
          {/* breadcrumb + actions */}
          <div className="mb-6 flex items-center justify-between">
            <nav className="flex items-center gap-1.5 text-xs text-white/70">
              <Link to="/" className="hover:text-white">Home</Link>
              <ChevronRight className="h-3 w-3" />
              <Link to="/agents" className="hover:text-white">Find an Agent</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-white">{displayName}</span>
            </nav>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit Profile
                </Button>
              )}
              <button
                type="button"
                aria-label="Share profile"
                onClick={nativeShare}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
                onClick={toggleFavorite}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            {/* identity */}
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end">
              <div className="overflow-hidden rounded-2xl border-4 border-white/80 shadow-xl">
                <Avatar className="h-36 w-32 rounded-none">
                  <AvatarImage src={agent.photo_url || undefined} alt={displayName} className="object-cover" />
                  <AvatarFallback className="rounded-none bg-primary text-3xl text-primary-foreground">
                    {canEdit ? (agent.name || "A").charAt(0).toUpperCase() : agentAvatarInitials(agent)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="space-y-2.5 pb-1">
                {(agent.verified || kycVerified) && (
                  <Badge className="gap-1 bg-emerald-500 text-white hover:bg-emerald-500">
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified Agent
                  </Badge>
                )}
                <h1 className="flex items-center gap-2 text-3xl font-bold text-white">
                  {displayName}
                  {(agent.verified || kycVerified) && (
                    <BadgeCheck className="h-6 w-6 text-emerald-400" />
                  )}
                </h1>
                {agent.agency_name && (
                  <p className="flex items-center gap-1.5 text-sm text-white/85">
                    <Building2 className="h-3.5 w-3.5" /> {agent.agency_name}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
                  {locationLabel && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {locationLabel}
                    </span>
                  )}
                  {languages.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Languages className="h-3.5 w-3.5" /> {languages.join(", ")}
                    </span>
                  )}
                </div>
                {(serviceChips.length > 0 || typeChips.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {serviceChips.map((c) => (
                      <span
                        key={c.id}
                        className="rounded-md bg-emerald-500/90 px-2.5 py-1 text-[11px] font-semibold text-white"
                      >
                        {c.label}
                      </span>
                    ))}
                    {typeChips.map((c) => (
                      <span
                        key={c.id}
                        className="rounded-md bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur"
                      >
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* stats + contact buttons */}
            <div className="space-y-4">
              <div className="flex divide-x divide-white/15 rounded-2xl bg-white/10 px-2 py-3 backdrop-blur">
                <div className="px-4 text-center">
                  <p className="flex items-center justify-center gap-1 text-xl font-bold text-white">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {stats && stats.rating > 0 ? stats.rating.toFixed(1) : "—"}
                  </p>
                  <p className="text-[11px] text-white/70">
                    ({stats?.reviewCount || 0} reviews)
                  </p>
                </div>
                <div className="px-4 text-center">
                  <p className="text-xl font-bold text-white">
                    {stats && stats.yearsExperience > 0 ? `${stats.yearsExperience}+` : "—"}
                  </p>
                  <p className="text-[11px] text-white/70">Years Experience</p>
                </div>
                <div className="px-4 text-center">
                  <p className="text-xl font-bold text-white">
                    {stats && stats.propertiesHandled > 0 ? `${stats.propertiesHandled}+` : "—"}
                  </p>
                  <p className="text-[11px] text-white/70">Properties Handled</p>
                </div>
                <div className="px-4 text-center">
                  <p className="text-xl font-bold text-white">
                    {stats && stats.happyClients > 0 ? `${stats.happyClients}+` : "—"}
                  </p>
                  <p className="text-[11px] text-white/70">Happy Clients</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600"
                  onClick={() => {
                    setChannel("whatsapp");
                    document.getElementById("get-in-touch")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <MessageCircle className="h-4 w-4" /> Contact Now
                </Button>
                <Button
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => {
                    setChannel("call");
                    document.getElementById("get-in-touch")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <Phone className="h-4 w-4" /> Call Now
                </Button>
                <Button
                  variant="secondary"
                  className="gap-1.5"
                  onClick={() => {
                    setChannel("email");
                    document.getElementById("get-in-touch")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <Mail className="h-4 w-4" /> Send Email
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto max-w-7xl overflow-x-auto px-4">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
                  tab === t.id
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left column — tab content */}
          <div className="min-w-0 space-y-6">
            {tab === "overview" && (
              <>
                {/* About Me */}
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">About Me</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {bioText ? (
                      <>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                          {bioExpanded || !bioLong ? bioText : `${bioText.slice(0, 280)}…`}
                        </p>
                        {bioLong && (
                          <button
                            className="flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
                            onClick={() => setBioExpanded((v) => !v)}
                          >
                            {bioExpanded ? "Read Less" : "Read More"}
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition ${bioExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No biography added yet.</p>
                    )}

                    {highlightReview && (
                      <div className="relative rounded-xl bg-emerald-50 p-5">
                        <Quote className="absolute left-3 top-3 h-6 w-6 text-emerald-200" />
                        <p className="pl-7 text-sm italic leading-relaxed text-emerald-900">
                          “{highlightReview.review || highlightReview.comment}”
                        </p>
                        <p className="mt-2 pl-7 text-xs font-medium text-emerald-700">
                          — Verified customer review
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Trust items */}
                {trustItems.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {trustItems.map((t) => {
                      const icons: Record<string, any> = {
                        verified: ShieldCheck,
                        local: MapPin,
                        experienced: Award,
                        "top-rated": Star,
                        certified: BadgeCheck,
                      };
                      const Icon = icons[t.id] || ShieldCheck;
                      return (
                        <div
                          key={t.id}
                          className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-4 text-center"
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
                            <Icon className="h-4 w-4 text-emerald-700" />
                          </span>
                          <p className="text-xs font-semibold">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground">{t.subtitle}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Specializations + Areas */}
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="rounded-2xl shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">My Specializations</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 sm:grid-cols-2">
                      {specializations.length ? (
                        specializations.map((s) => {
                          const Icon = SPEC_ICONS[s.id] || Sparkles;
                          return (
                            <div key={s.id} className="flex items-start gap-2.5 rounded-xl border p-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                                <Icon className="h-4 w-4 text-emerald-700" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold">{s.label}</p>
                                <p className="text-[11px] text-muted-foreground">{s.subtitle}</p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="col-span-2 text-sm text-muted-foreground">
                          No specializations added yet.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-lg">Areas I Cover</CardTitle>
                      {areas.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-700"
                          onClick={() => setTab("areas")}
                        >
                          View on Map <ChevronRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {areas.length ? (
                        <>
                          {areas.slice(0, 8).map((a) => (
                            <Badge
                              key={a}
                              variant="outline"
                              className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800"
                            >
                              {a}
                            </Badge>
                          ))}
                          {areas.length > 8 && (
                            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                              +{areas.length - 8} More Areas
                            </Badge>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">No service areas added yet.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Featured properties */}
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg">
                      Featured Properties by {displayName}
                    </CardTitle>
                    {activeProperties.length > 4 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-700"
                        onClick={() => setTab("properties")}
                      >
                        View All Properties <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {featuredProperties.length ? (
                      featuredProperties.map((p) => <PropertyCard key={p.id} p={p} />)
                    ) : (
                      <p className="col-span-full text-sm text-muted-foreground">
                        No active listings right now.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {tab === "properties" && (
              <>
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      Active Listings ({activeProperties.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {activeProperties.length ? (
                      activeProperties.map((p) => <PropertyCard key={p.id} p={p} />)
                    ) : (
                      <p className="col-span-full text-sm text-muted-foreground">
                        No active listings right now.
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      Sold Properties ({soldProperties.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {soldProperties.length ? (
                      soldProperties.map((p) => <PropertyCard key={p.id} p={p} />)
                    ) : (
                      <p className="col-span-full text-sm text-muted-foreground">
                        No sold properties yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {tab === "services" && (
              <>
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Services Offered</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    {specializations.length ? (
                      specializations.map((s) => {
                        const Icon = SPEC_ICONS[s.id] || Sparkles;
                        return (
                          <div key={s.id} className="flex items-start gap-3 rounded-xl border p-4">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                              <Icon className="h-5 w-5 text-emerald-700" />
                            </span>
                            <div>
                              <p className="font-semibold">{s.label}</p>
                              <p className="text-sm text-muted-foreground">{s.subtitle}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="col-span-2 text-sm text-muted-foreground">
                        This agent has not listed their services yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
                <ProjectExperienceCards projects={projects} />
              </>
            )}

            {tab === "areas" && (
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Areas I Cover</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {areas.length ? (
                      areas.map((a) => (
                        <Badge
                          key={a}
                          variant="outline"
                          className="gap-1 rounded-full border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800"
                        >
                          <MapPin className="h-3 w-3" /> {a}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No service areas added yet.</p>
                    )}
                  </div>
                  <OfficeMap agent={agent} />
                  <p className="text-[11px] text-muted-foreground">
                    Map shows the approximate city centre — exact coverage is confirmed directly
                    with the agent.
                  </p>
                </CardContent>
              </Card>
            )}

            {tab === "reviews" && (
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    Customer Reviews ({agent.total_ratings || reviews.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reviews.length ? (
                    reviews.map((r) => (
                      <div key={r.id} className="rounded-xl border bg-card p-4">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <Stars value={r.rating || 0} />
                          {r.is_verified && (
                            <Badge className="bg-emerald-100 text-[10px] text-emerald-800 hover:bg-emerald-100">
                              ✓ Verified
                            </Badge>
                          )}
                          {r.created_at && (
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {r.review || r.comment || "No written feedback."}
                        </p>
                        {r.agent_reply && (
                          <div className="mt-2 rounded-lg border-l-2 border-emerald-300 bg-emerald-50 p-2.5">
                            <p className="text-[11px] font-medium text-emerald-800">
                              Response from the agent
                            </p>
                            <p className="text-xs text-emerald-900">{r.agent_reply}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No reviews yet.</p>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === "stories" && (
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Client Stories</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stories.length ? (
                    stories.map((s) => (
                      <div
                        key={s.id}
                        className="relative rounded-xl border bg-gradient-to-br from-emerald-50/60 to-transparent p-5"
                      >
                        <Quote className="absolute right-4 top-4 h-8 w-8 text-emerald-100" />
                        <div className="mb-2 flex items-center gap-2">
                          <Stars value={s.rating || 0} />
                          {s.is_verified && (
                            <Badge className="bg-emerald-100 text-[10px] text-emerald-800 hover:bg-emerald-100">
                              ✓ Verified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm italic leading-relaxed text-foreground/80">
                          “{s.review || s.comment}”
                        </p>
                        {s.created_at && (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {new Date(s.created_at).toLocaleDateString("en-IN", {
                              month: "long",
                              year: "numeric",
                            })}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No detailed client stories yet — they appear here as customers share their
                      experiences.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === "certifications" && (
              <>
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Verification</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {kycVerified ? (
                      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <ShieldCheck className="h-8 w-8 text-emerald-600" />
                        <div>
                          <p className="font-semibold text-emerald-900">KYC Verified</p>
                          <p className="text-sm text-emerald-700">
                            Identity and documents verified by JAAGA X.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        This agent has not completed KYC verification yet.
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card className="rounded-2xl shadow-sm">
                  <CardHeader className="pb-2">
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
                        No badges earned yet — close deals and collect reviews to unlock
                        achievements.
                      </p>
                    )}
                  </CardContent>
                </Card>
                {canEdit && (
                  <AgentKycPanel userId={agent.user_id} kyc={kyc} canEdit onChange={(k) => setKyc(k)} />
                )}
              </>
            )}

            {tab === "faqs" && (
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => {
                        setFaqDraft({ question: "", answer: "" });
                        setFaqOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" /> Add FAQ
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {faqs.length ? (
                    faqs.map((f) => (
                      <details key={f.id} className="group rounded-xl border bg-card px-4 py-3">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">
                          {f.question}
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
                        </summary>
                        <p className="mt-2 text-sm text-muted-foreground">{f.answer}</p>
                        {canEdit && (
                          <div className="mt-2 flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => {
                                setFaqDraft({ id: f.id, question: f.question, answer: f.answer });
                                setFaqOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive"
                              onClick={() => deleteFaq(f.id)}
                            >
                              <Trash2 className="mr-1 h-3 w-3" /> Delete
                            </Button>
                          </div>
                        )}
                      </details>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No FAQs added yet{canEdit ? " — add common questions customers ask you." : "."}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-16 lg:self-start">
            {/* Get in touch */}
            <Card id="get-in-touch" className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Get in Touch with {displayName}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Have a question or need property advice? Reach out directly.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                  {(
                    [
                      ["whatsapp", "WhatsApp", MessageCircle],
                      ["call", "Call", Phone],
                      ["email", "Email", Mail],
                    ] as const
                  ).map(([idKey, label, Icon]) => (
                    <button
                      key={idKey}
                      onClick={() => setChannel(idKey)}
                      className={`flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                        channel === idKey
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                </div>
                <Textarea
                  rows={3}
                  maxLength={1000}
                  placeholder={`Hi, I am interested in properties${locationLabel ? ` in ${locationLabel}` : ""}. Please share more details.`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <Button
                  className="w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MessageCircle className="h-4 w-4" />
                  )}
                  {channel === "whatsapp"
                    ? "Send on WhatsApp"
                    : channel === "call"
                      ? "Call the Agent"
                      : "Send Email"}
                </Button>
                {contactChecked && !contactAllowed && (
                  <p className="rounded-lg bg-muted/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
                    For your privacy, the agent's direct contact details are shared once the agent
                    is assigned to your property. Your enquiry still reaches the agent.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick contact details */}
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Quick Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {contactAllowed ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 text-emerald-600" />
                        {agent.phone || "Not shared"}
                      </span>
                      {agent.phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            const link = buildTelLink(agent.phone);
                            if (link) window.location.href = link;
                          }}
                        >
                          Call
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="truncate">{agent.email || "Not shared"}</span>
                      </span>
                      {agent.email && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            const link = buildMailLink(
                              agent.email,
                              `Property enquiry via JAAGA X`,
                              "",
                            );
                            if (link) window.location.href = link;
                          }}
                        >
                          Email
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Contact details are private. They are shared automatically once this agent is
                    assigned to your property and accepts the assignment.
                  </p>
                )}
                <div className="flex items-center gap-2 border-t pt-3 text-muted-foreground">
                  <Clock className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs">Available Mon – Sat, 9:00 AM – 8:00 PM</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => {
                    if (!requireAuth()) return;
                    setMeetingName(
                      (user?.user_metadata?.full_name as string) || meetingName,
                    );
                    setMeetingOpen(true);
                  }}
                >
                  <CalendarCheck className="h-4 w-4" /> Schedule a Meeting
                </Button>
              </CardContent>
            </Card>

            {/* Office location */}
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">Office Location</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-emerald-700"
                  onClick={() => setTab("areas")}
                >
                  View on Map
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <OfficeMap agent={agent} />
                {agent.agency_name && (
                  <p className="text-sm font-semibold">{agent.agency_name}</p>
                )}
                {agent.office_address ? (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {agent.office_address}
                  </p>
                ) : (
                  locationLabel && (
                    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {locationLabel}
                    </p>
                  )
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={() => {
                    const q = encodeURIComponent(
                      agent.office_address || locationLabel || agent.agency_name || "",
                    );
                    if (q) window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, "_blank", "noopener");
                  }}
                >
                  <NavigationIcon className="h-3.5 w-3.5" /> Get Directions
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <Footer />

      {/* Schedule a Meeting */}
      <Dialog open={meetingOpen} onOpenChange={setMeetingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule a Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Your Name</Label>
              <Input value={meetingName} onChange={(e) => setMeetingName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone or Email (optional)</Label>
              <Input
                value={meetingContact}
                onChange={(e) => setMeetingContact(e.target.value)}
                placeholder="So the agent can confirm with you"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preferred Date</Label>
              <Input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Time Slot</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {MEETING_TIME_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setMeetingSlot(slot)}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
                      meetingSlot === slot
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "hover:border-emerald-300"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Textarea
                rows={2}
                maxLength={500}
                value={meetingNote}
                onChange={(e) => setMeetingNote(e.target.value)}
                placeholder="What would you like to discuss?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMeetingOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitMeeting}
              disabled={meetingSaving}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {meetingSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Request Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FAQ editor (owner) */}
      <Dialog open={faqOpen} onOpenChange={setFaqOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{faqDraft.id ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Question</Label>
              <Input
                value={faqDraft.question}
                maxLength={200}
                onChange={(e) => setFaqDraft((d) => ({ ...d, question: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Answer</Label>
              <Textarea
                rows={4}
                maxLength={1000}
                value={faqDraft.answer}
                onChange={(e) => setFaqDraft((d) => ({ ...d, answer: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFaqOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveFaq} disabled={faqSaving}>
              {faqSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save FAQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile (owner) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-medium">Profile Photo (JAAGAX template)</Label>
              <AgentTemplateUpload
                value={form.photo_url}
                onChange={(url) => {
                  setForm((f) => ({ ...f, photo_url: url }));
                  toast.success("Template uploaded — save to apply");
                }}
                name={form.name}
              />
            </div>

            {(
              [
                ["name", "Full Name"],
                ["phone", "Phone Number"],
                ["email", "Email Address"],
                ["whatsapp_number", "WhatsApp Number"],
                ["gender", "Gender"],
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

            <div className="space-y-2">
              <Label>Languages I speak</Label>
              <p className="text-xs text-muted-foreground">
                Customers are matched to agents who speak their preferred language.
              </p>
              <div className="flex flex-wrap gap-2">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const selected = (form.languages_spoken || []).includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() =>
                        setForm((f) => {
                          const cur = f.languages_spoken || [];
                          return {
                            ...f,
                            languages_spoken: cur.includes(lang)
                              ? cur.filter((l) => l !== lang)
                              : [...cur, lang],
                          };
                        })
                      }
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            <ProjectExperienceEditor value={projectDrafts} onChange={setProjectDrafts} />

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
