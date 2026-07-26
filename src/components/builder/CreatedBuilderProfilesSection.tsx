import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  Eye,
  Pencil,
  Share2,
  ExternalLink,
  Loader2,
  Sparkles,
  Award,
  Home as HomeIcon,
} from "lucide-react";
import { toast } from "sonner";

interface Row {
  id: string;
  builder_name: string;
  tagline: string | null;
  slug: string | null;
  logo: string | null;
  type: string | null;
  operating_cities: string[] | null;
  number_of_projects: number | null;
  created_by_role: string | null;
  created_at: string;
}

const tierColor = (type: string | null) => {
  const t = (type || "standard").toLowerCase();
  if (t.includes("luxury")) return "bg-amber-500/15 text-amber-500 border-amber-500/30";
  if (t.includes("budget")) return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
  return "bg-primary/10 text-primary border-primary/20";
};

interface Props {
  /** Role label to stamp on new profiles: 'admin' | 'agent' | 'builder' */
  creatorRole: "admin" | "agent" | "builder";
  /** Optional heading override */
  title?: string;
}

export default function CreatedBuilderProfilesSection({ creatorRole, title }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("builder_profiles")
      .select(
        "id, builder_name, tagline, slug, logo, type, operating_cities, number_of_projects, created_by_role, created_at",
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    setRows((data as Row[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = () => {
    // Pass creator role via query string so the form can stamp it.
    navigate(`/add-builder-profile?as=${creatorRole}`);
  };

  const share = async (p: Row) => {
    const url = `${window.location.origin}/builder-profile/${p.slug || p.id}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: p.builder_name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Profile link copied");
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {title || "Builder Profiles"}
          </CardTitle>
          <CardDescription>
            Create and manage builder profiles. Each will be tagged as created by <b>{creatorRole}</b>.
          </CardDescription>
        </div>
        <Button size="sm" onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Builder Profile
        </Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              You haven't created any builder profiles yet.
            </p>
            <Button size="sm" onClick={handleCreate} className="gap-2">
              <Plus className="h-4 w-4" /> Create your first profile
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rows.map((p) => {
              const publicHref = `/builder-profile/${p.slug || p.id}`;
              return (
                <div
                  key={p.id}
                  className="p-4 border border-border rounded-lg bg-card hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {p.logo ? (
                      <img
                        src={p.logo}
                        alt=""
                        className="h-12 w-12 rounded-md border border-border object-contain bg-background p-1"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm truncate">{p.builder_name}</h4>
                        <Badge variant="outline" className={`text-[10px] capitalize ${tierColor(p.type)}`}>
                          {p.type || "standard"}
                        </Badge>
                      </div>
                      {p.tagline && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{p.tagline}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5">
                        <span className="flex items-center gap-1">
                          <HomeIcon className="h-3 w-3" /> {p.number_of_projects ?? 0} projects
                        </span>
                        {p.created_by_role && (
                          <span className="flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> by {p.created_by_role}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border">
                    <Button asChild size="sm" variant="outline" className="gap-1.5">
                      <Link to={publicHref} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-3.5 w-3.5" /> View Profile
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => navigate(`/edit-builder-profile/${p.id}`)}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => share(p)}>
                      <Share2 className="h-3.5 w-3.5" /> Share
                    </Button>
                    <Button asChild size="sm" variant="ghost" className="gap-1.5 ml-auto">
                      <Link to={publicHref} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
