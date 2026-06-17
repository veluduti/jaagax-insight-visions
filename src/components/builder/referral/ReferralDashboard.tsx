import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Plus, Users, MousePointerClick, CheckCircle2, IndianRupee } from "lucide-react";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import referralService, { ReferralProgram, ReferralTracking } from "@/services/referralService";
import CreateReferralModal from "./CreateReferralModal";

const sb = supabase as any;

export default function ReferralDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [builderProfileId, setBuilderProfileId] = useState<string | null>(null);
  const [programs, setPrograms] = useState<ReferralProgram[]>([]);
  const [recent, setRecent] = useState<ReferralTracking[]>([]);
  const [stats, setStats] = useState({ totalReferrals: 0, totalClicks: 0, closedDeals: 0, commissionsEarned: 0 });
  const [openCreate, setOpenCreate] = useState(false);

  const load = useCallback(async (bpId: string) => {
    const s = await referralService.getReferralStats(bpId);
    setPrograms(s.programs);
    setRecent((s as any).recent ?? []);
    setStats({
      totalReferrals: s.totalReferrals,
      totalClicks: s.totalClicks,
      closedDeals: s.closedDeals,
      commissionsEarned: s.commissionsEarned,
    });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: bp } = await sb
          .from("builder_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!bp) {
          setLoading(false);
          return;
        }
        setBuilderProfileId(bp.id);
        await load(bp.id);
      } catch (e: any) {
        toast({ title: "Failed to load referrals", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast, load]);

  const copyLink = async (code: string) => {
    const link = referralService.generateReferralLink(code);
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: link });
  };

  const toggleStatus = async (p: ReferralProgram) => {
    const next = p.status === "active" ? "inactive" : "active";
    await referralService.updateProgramStatus(p.id, next);
    if (builderProfileId) await load(builderProfileId);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Referrals</h1>
            <p className="text-sm text-muted-foreground">Reward people for sending buyers your way.</p>
          </div>
          <Button onClick={() => setOpenCreate(true)} disabled={!builderProfileId}>
            <Plus className="h-4 w-4 mr-2" /> Create New Referral
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !builderProfileId ? (
          <Card className="border-border">
            <CardContent className="p-8 text-center text-muted-foreground">
              Create your builder profile first to start referrals.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard icon={Users} label="Total Referrals" value={stats.totalReferrals} />
              <StatCard icon={MousePointerClick} label="Total Clicks" value={stats.totalClicks} />
              <StatCard icon={CheckCircle2} label="Closed Deals" value={stats.closedDeals} />
              <StatCard
                icon={IndianRupee}
                label="Commissions Paid"
                value={`₹${stats.commissionsEarned.toLocaleString("en-IN")}`}
              />
            </div>

            <h2 className="text-xl font-semibold text-foreground mb-3">Programs</h2>
            {programs.length === 0 ? (
              <Card className="border-border">
                <CardContent className="p-8 text-center text-muted-foreground">No referral programs yet.</CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {programs.map((p) => (
                  <Card key={p.id} className="border-border shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">
                            {p.property?.title || "All properties"}
                          </span>
                          <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          ₹{Number(p.referral_amount).toLocaleString("en-IN")} per closed deal
                          {p.max_referrals ? ` · max ${p.max_referrals}` : ""}
                        </p>
                        <p className="text-xs font-mono mt-1 text-muted-foreground break-all">
                          {referralService.generateReferralLink(p.referral_code)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyLink(p.referral_code)}>
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => toggleStatus(p)}>
                          {p.status === "active" ? "Pause" : "Activate"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">Recent Activity</h2>
            {recent.length === 0 ? (
              <Card className="border-border">
                <CardContent className="p-8 text-center text-muted-foreground">No activity yet.</CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {recent.map((t) => (
                  <Card key={t.id} className="border-border">
                    <CardContent className="p-3 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(t.visit_date).toLocaleString("en-IN")}
                      </span>
                      <Badge variant="outline">{t.status.replace("_", " ")}</Badge>
                      <span className="font-medium">
                        ₹{Number(t.commission_amount || 0).toLocaleString("en-IN")}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {builderProfileId && (
          <CreateReferralModal
            open={openCreate}
            onOpenChange={setOpenCreate}
            builderProfileId={builderProfileId}
            onCreated={() => load(builderProfileId)}
          />
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold text-foreground mt-1">{value}</p>
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
