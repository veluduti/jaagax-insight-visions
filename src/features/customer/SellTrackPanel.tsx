import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tag,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Home,
  BarChart3,
  ListChecks,
  FolderOpen,
  PackageOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePostingEntitlement } from "@/hooks/usePostingEntitlement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type Row = { id: string; status: string | null; title: string | null };

const LISTING_FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "live", label: "Live" },
  { id: "rejected", label: "Rejected" },
  { id: "draft", label: "Drafts" },
  { id: "sold", label: "Sold" },
] as const;

const bucketOf = (status: string | null) => {
  const s = (status || "").toLowerCase();
  if (s === "sold") return "sold";
  if (s === "draft") return "draft";
  if (s.includes("reject")) return "rejected";
  if (s.startsWith("live")) return "live";
  return "pending";
};

/** Right-rail "Sell & Track" control centre: quota, KYC, listing status and shortcuts. */
export default function SellTrackPanel({ onNavigateTab }: { onNavigateTab: (id: string) => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { entitlement } = usePostingEntitlement();
  const [rows, setRows] = useState<Row[]>([]);
  const [projects, setProjects] = useState(0);
  const [kycVerified, setKycVerified] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const sb = supabase as any;
      const [props, projs, kyc] = await Promise.all([
        sb.from("properties").select("id,status,title").eq("submitted_by", user.id),
        sb.from("projects").select("id", { count: "exact", head: true }).eq("submitted_by", user.id),
        sb.from("kyc_verifications").select("status").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setRows((props?.data as Row[]) || []);
      setProjects(projs?.count ?? 0);
      setKycVerified(((kyc?.data?.status as string) || "").toLowerCase() === "approved");
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: rows.length, pending: 0, live: 0, rejected: 0, draft: 0, sold: 0 };
    rows.forEach((r) => {
      base[bucketOf(r.status)] += 1;
    });
    return base;
  }, [rows]);

  const filtered = filter === "all" ? rows : rows.filter((r) => bucketOf(r.status) === filter);

  const freeLimit = entitlement?.free_limit ?? 0;
  const freeUsed = entitlement?.free_used ?? 0;
  const freeRemaining = entitlement?.free_remaining ?? 0;
  const usedPct = freeLimit > 0 ? Math.min(100, Math.round((freeUsed / freeLimit) * 100)) : 0;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Tag className="h-4 w-4 text-primary" />
          Sell & Track
        </CardTitle>
        <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onNavigateTab("selling")}>
          Manage
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Posting quota */}
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Free Posting Quota
            </span>
            <span className="text-muted-foreground">
              {freeUsed}/{freeLimit} used
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {entitlement?.has_agent_subscription
                ? "Unlimited posts with your active subscription"
                : `You have ${freeRemaining} free post${freeRemaining === 1 ? "" : "s"} remaining`}
            </span>
            <span>{usedPct}%</span>
          </div>
          <Progress value={usedPct} className="mt-2 h-1.5" />
        </div>

        {/* KYC */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" />
            KYC Verification
            {kycVerified && <Badge variant="secondary">Verified</Badge>}
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            {["Verified badge on profile", "Higher trust score (up to 100)", "Faster property approvals", "Better visibility in search"].map(
              (b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {b}
                </li>
              ),
            )}
          </ul>
          {!kycVerified && (
            <Button size="sm" className="mt-3" onClick={() => onNavigateTab("selling")}>
              Complete KYC
            </Button>
          )}
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary text-primary-foreground">TOTAL {counts.all}</Badge>
          <Badge variant="secondary">LIVE {counts.live}</Badge>
          <Badge variant="outline">PENDING {counts.pending}</Badge>
          <Badge variant="destructive">REJECTED {counts.rejected}</Badge>
          <Badge variant="outline">DRAFTS {counts.draft}</Badge>
          <Badge variant="outline">SOLD {counts.sold}</Badge>
        </div>

        {/* Shortcut tiles */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate("/sell-property")}
            className="rounded-xl border bg-card p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <Home className="mx-auto mb-2 h-6 w-6 text-primary" />
            <div className="text-sm font-semibold">Sell Your Property</div>
            <div className="text-xs text-muted-foreground">List your home for sale</div>
          </button>
          <button
            type="button"
            onClick={() => navigate("/visit/analytics")}
            className="rounded-xl border bg-card p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <BarChart3 className="mx-auto mb-2 h-6 w-6 text-primary" />
            <div className="text-sm font-semibold">Analytics</div>
            <div className="text-xs text-muted-foreground">Track performance</div>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab("selling")}
          className="w-full rounded-xl border bg-card p-4 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <ListChecks className="mx-auto mb-2 h-6 w-6 text-primary" />
          <div className="text-sm font-semibold">My Listings</div>
          <div className="text-xs text-muted-foreground">Track verification and manage</div>
        </button>

        {/* Listing filters */}
        <div className="flex flex-wrap gap-2">
          {LISTING_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                filter === f.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {f.label} ({counts[f.id]})
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            {projects > 0 ? (
              <>
                <FolderOpen className="mb-2 h-6 w-6" />
                {projects} project{projects === 1 ? "" : "s"}
              </>
            ) : (
              <>
                <FolderOpen className="mb-2 h-6 w-6" />
                No projects yet
              </>
            )}
          </div>
          <div className="flex min-h-[96px] flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
            {filtered.length > 0 ? (
              <div className="w-full space-y-1 text-left">
                {filtered.slice(0, 3).map((r) => (
                  <div key={r.id} className="truncate text-foreground">
                    {r.title || "Untitled listing"}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <PackageOpen className="mb-2 h-6 w-6" />
                No items yet
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
