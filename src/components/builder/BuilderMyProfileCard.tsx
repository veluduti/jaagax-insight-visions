import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, ExternalLink, Pencil, Plus, Loader2, MapPin, Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
}

const BuilderMyProfileCard = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("builder_profiles")
        .select("id, builder_name, tagline, logo, hero_image, type, number_of_projects, operating_cities, project_location, slug")
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
      <Card><CardContent className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent></Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No builder profile yet</h3>
            <p className="text-sm text-muted-foreground">Create your profile to showcase your projects.</p>
          </div>
          <Button onClick={() => navigate("/add-builder-profile")}>
            <Plus className="h-4 w-4 mr-2" /> Create Builder Profile
          </Button>
        </CardContent>
      </Card>
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
      } catch { /* cancelled */ }
    } else {
      void handleCopy();
    }
  };

  return (
    <Card className="overflow-hidden">
      {profile.hero_image && (
        <div className="h-40 w-full bg-muted overflow-hidden">
          <img src={profile.hero_image} alt={profile.builder_name} className="w-full h-full object-cover" onError={(e) = loading="lazy" decoding="async" /> (e.currentTarget.style.display = "none")} />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start gap-4">
          {profile.logo ? (
            <img src={profile.logo} alt="" className="h-16 w-16 rounded-lg border border-border object-contain bg-background"  loading="lazy" decoding="async" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl truncate">{profile.builder_name}</CardTitle>
            {profile.tagline && <p className="text-sm text-muted-foreground mt-1">{profile.tagline}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className="capitalize">{profile.type}</Badge>
              {profile.number_of_projects ? <Badge variant="outline">{profile.number_of_projects} Projects</Badge> : null}
              {profile.project_location && (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {profile.project_location}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Share2 className="h-3.5 w-3.5" /> Your shareable profile link
          </div>
          <div className="flex gap-2">
            <Input readOnly value={shareUrl} className="text-xs font-mono bg-background" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" size="icon" onClick={handleCopy} aria-label="Copy link">
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={handleShare} aria-label="Share">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Share this link with buyers, partners, or on social media.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to={publicHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" /> View Public Profile
            </Link>
          </Button>
          <Button onClick={() => navigate(`/edit-builder-profile/${profile.id}`)}>
            <Pencil className="h-4 w-4 mr-2" /> Edit Profile
          </Button>
          <Button variant="ghost" onClick={() => navigate("/add-builder-profile")}>
            <Plus className="h-4 w-4 mr-2" /> Add Another
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BuilderMyProfileCard;
