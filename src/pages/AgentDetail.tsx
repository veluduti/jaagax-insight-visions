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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import AgentKycPanel, { AgentKyc } from "@/components/agents/AgentKycPanel";

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
  city: string | null;
  languages: string | null;
  experience_years: number | null;
  bio: string | null;
  verified: boolean | null;
  avg_rating: number | null;
  total_ratings: number | null;
  created_at: string | null;
}

const BIO_MAX = 500;

const Row = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="space-y-1">
    <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="text-sm font-medium break-words">{value?.toString().trim() || "—"}</p>
  </div>
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
  const photoInput = useRef<HTMLInputElement | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("agents")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!data) {
        toast.error("Agent not found");
        setLoading(false);
        return;
      }
      setAgent(data as Agent);
      setForm(data as Agent);
      if (data.user_id) {
        const { data: k } = await (supabase as any)
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
    setSaving(true);
    try {
      const payload = {
        name: form.name ?? null,
        photo_url: form.photo_url ?? null,
        phone: form.phone ?? null,
        email: form.email ?? null,
        whatsapp_number: form.whatsapp_number ?? null,
        gender: form.gender ?? null,
        date_of_birth: form.date_of_birth || null,
        bio: (form.bio ?? "").slice(0, BIO_MAX) || null,
        languages: form.languages ?? null,
        experience_years: form.experience_years ? Number(form.experience_years) : null,
        agency_name: form.agency_name ?? null,
        office_address: form.office_address ?? null,
        city: form.city ?? null,
        cities_served: form.cities_served ?? null,
      };
      const { error } = await (supabase as any).from("agents").update(payload).eq("id", agent.id);
      if (error) throw error;
      setAgent({ ...agent, ...payload } as Agent);
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
    ? new Date(agent.created_at).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${agent.name || "Agent"} — Agent Profile | JAAGA X`}
        description={`Profile and verification details for ${agent.name || "this agent"} on JAAGA X.`}
      />
      <Navigation />

      <main className="container mx-auto max-w-5xl px-4 py-8 space-y-6">
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
                  <div className="flex items-center gap-1.5 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">
                      {agent.avg_rating ? Number(agent.avg_rating).toFixed(1) : "—"}
                    </span>
                    <span className="text-muted-foreground">
                      ({agent.total_ratings || 0} Reviews)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 pt-1 sm:grid-cols-3">
                    <Row label="Agent ID" value={agentCode} />
                    <Row label="Member Since" value={memberSince} />
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Location
                      </p>
                      <p className="flex items-center gap-1 text-sm font-medium">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {agent.city || agent.cities_served || "—"}
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

        {/* 2. Personal Information */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Row label="Phone Number" value={agent.phone} />
            <Row label="Email Address" value={agent.email} />
            <Row label="WhatsApp Number" value={agent.whatsapp_number} />
            <Row label="Gender" value={agent.gender} />
            <Row
              label="Date of Birth"
              value={
                agent.date_of_birth ? new Date(agent.date_of_birth).toLocaleDateString() : null
              }
            />
            <Row label="Languages" value={agent.languages} />
            <Row
              label="Experience"
              value={agent.experience_years ? `${agent.experience_years} years` : null}
            />
            <Row label="Agency Name" value={agent.agency_name} />
            <Row label="Office Address" value={agent.office_address} />
            <Row label="Operating City" value={agent.cities_served || agent.city} />
          </CardContent>
        </Card>

        {/* 3. About Me */}
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

        {/* 4. KYC Verification — owner only; visitors see status only */}
        {canEdit ? (
          <AgentKycPanel
            userId={agent.user_id}
            kyc={kyc}
            canEdit
            onChange={(k) => setKyc(k)}
          />
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
                capture="user"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
              />
              <Button variant="outline" size="sm" disabled={photoBusy} onClick={() => photoInput.current?.click()}>
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
                <Button key={label} variant="outline" asChild>
                  <a href={url} target="_blank" rel="noreferrer">
                    {label}
                  </a>
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
