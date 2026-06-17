import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Building2,
  ExternalLink,
  Pencil,
  Plus,
  Loader2,
  MapPin,
  Copy,
  Check,
  Share2,
  Phone,
  Mail,
  Globe,
  Award,
  Users,
  Home,
  Eye,
  Star,
  Calendar,
  Briefcase,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";

interface Profile {
  id: string;
  builder_name: string;
  tagline: string | null;
  logo: string | null;
  hero_image: string | null;
  type: string;
  number_of_projects: number | null;
  operating_cities: string[] | null;
  project_location: string | null;
  slug: string | null;
  description: string | null;
  about_mission: string | null;
  about_vision: string | null;
  awards: string[] | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  years_of_experience: number | null;
  total_units_delivered: number | null;
  customer_rating: number | null;
  total_reviews: number | null;
  specializations: string[] | null;
  rera_number: string | null;
  completed_projects_count: number | null;
  ongoing_projects_count: number | null;
}

const BuilderMyProfileCard = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("builder_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setProfile(data as Profile | null);
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-12">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-12">
          <Card className="max-w-2xl mx-auto p-8 text-center shadow-sm border-border">
            <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Building2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No Builder Profile Yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your builder profile to showcase your projects and get discovered by buyers.
            </p>
            <Button onClick={() => navigate("/add-builder-profile")}>
              <Plus className="h-4 w-4 mr-2" /> Create Builder Profile
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const publicHref = `/builder-profile/${profile.slug || profile.id}`;
  const shareUrl = `${window.location.origin}${publicHref}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Profile link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if ((navigator as any).share) {
      try {
        await (navigator as any).share({
          title: profile.builder_name,
          text: `Check out ${profile.builder_name} on JAAGA X`,
          url: shareUrl,
        });
      } catch {
        /* cancelled */
      }
    } else {
      void handleCopy();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-sm text-muted-foreground">View and manage your builder profile</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare} className="gap-2 border-border">
              <Share2 className="h-4 w-4" /> Share
            </Button>
            <Button onClick={() => navigate(`/edit-builder-profile/${profile.id}`)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit Profile
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="overflow-hidden border-border shadow-sm">
          {/* Hero Image */}
          {profile.hero_image && (
            <div className="h-48 w-full bg-muted overflow-hidden">
              <img
                src={profile.hero_image}
                alt={profile.builder_name}
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
                loading="lazy"
                decoding="async"
              />
            </div>
          )}

          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Logo */}
              <div className="flex-shrink-0">
                {profile.logo ? (
                  <img
                    src={profile.logo}
                    alt=""
                    className="h-24 w-24 rounded-xl border border-border object-contain bg-background p-2"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-12 w-12 text-primary" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{profile.builder_name}</h2>
                    {profile.tagline && <p className="text-muted-foreground mt-1">{profile.tagline}</p>}
                  </div>
                  <Badge className="capitalize bg-primary/10 text-primary border-primary/20">
                    {profile.type || "Standard"}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{profile.number_of_projects || 0}</p>
                    <p className="text-xs text-muted-foreground">Total Projects</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{profile.completed_projects_count || 0}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{profile.total_units_delivered || 0}</p>
                    <p className="text-xs text-muted-foreground">Units Delivered</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{profile.years_of_experience || 0}+</p>
                    <p className="text-xs text-muted-foreground">Years Experience</p>
                  </div>
                </div>

                {/* Operating Cities */}
                {profile.operating_cities && profile.operating_cities.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{profile.operating_cities.join(" • ")}</span>
                  </div>
                )}

                {/* Rating */}
                {profile.customer_rating && profile.customer_rating > 0 && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium ml-1">{profile.customer_rating}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">({profile.total_reviews || 0} reviews)</span>
                  </div>
                )}
              </div>
            </div>

            {/* About */}
            {profile.description && (
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-semibold text-sm text-foreground mb-2">About</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{profile.description}</p>
              </div>
            )}

            {/* Mission & Vision */}
            {(profile.about_mission || profile.about_vision) && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.about_mission && (
                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold text-sm text-foreground">Mission</h4>
                    <p className="text-sm text-muted-foreground mt-1">{profile.about_mission}</p>
                  </div>
                )}
                {profile.about_vision && (
                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold text-sm text-foreground">Vision</h4>
                    <p className="text-sm text-muted-foreground mt-1">{profile.about_vision}</p>
                  </div>
                )}
              </div>
            )}

            {/* Specializations */}
            {profile.specializations && profile.specializations.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-sm text-foreground mb-2">Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.specializations.map((s) => (
                    <Badge key={s} variant="secondary" className="bg-muted">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Awards */}
            {profile.awards && profile.awards.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" /> Awards
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.awards.map((a) => (
                    <Badge key={a} variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* RERA */}
            {profile.rera_number && (
              <div className="mt-4">
                <h3 className="font-semibold text-sm text-foreground mb-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" /> RERA
                </h3>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  {profile.rera_number}
                </Badge>
              </div>
            )}

            {/* Contact Info */}
            <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-3">
              {profile.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" /> {profile.phone}
                </div>
              )}
              {profile.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" /> {profile.email}
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Website
                  </a>
                </div>
              )}
            </div>

            {/* Shareable Link */}
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Shareable Profile Link</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 text-sm bg-muted rounded-lg border border-border text-muted-foreground focus:outline-none"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-border">
              <Button asChild variant="outline">
                <Link to={publicHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> View Public Profile
                </Link>
              </Button>
              <Button onClick={() => navigate(`/edit-builder-profile/${profile.id}`)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit Profile
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BuilderMyProfileCard;
