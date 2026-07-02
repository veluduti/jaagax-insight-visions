import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, ShieldCheck, ArrowRight, Loader2, FileWarning } from "lucide-react";
import PartnerNav from "@/components/partners/PartnerNav";
import { supabase } from "@/integrations/supabase/client";

type App = {
  id: string; status: string; hotel_name: string; created_at: string;
  reviewed_at?: string | null; rejection_reason?: string | null; approved_hotel_id?: string | null;
  pms_setup_completed?: boolean | null;
};

const timeline = [
  { key: "submitted", label: "Submitted", desc: "Your application is in our queue" },
  { key: "review", label: "Under review", desc: "Compliance team is verifying your documents" },
  { key: "decision", label: "Decision", desc: "Approved & live, or feedback for corrections" },
];

export default function PartnerStatus() {
  const nav = useNavigate();
  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: any;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { nav("/partners/login", { replace: true }); return; }
      const load = async () => {
        const { data } = await (supabase as any)
          .from("hotel_partner_applications")
          .select("id,status,hotel_name,created_at,reviewed_at,rejection_reason,approved_hotel_id,pms_setup_completed")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);
        setApp(data?.[0] || null);
        setLoading(false);
      };
      await load();
      channel = supabase
        .channel("partner_app_status")
        .on("postgres_changes", { event: "*", schema: "public", table: "hotel_partner_applications", filter: `user_id=eq.${user.id}` }, load)
        .subscribe();
    })();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [nav]);

  if (loading) return <FullLoader />;

  if (!app) return (
    <Shell>
      <Card className="border border-border/60 bg-background/60 backdrop-blur">
        <CardContent className="p-8 text-center">
          <FileWarning className="mx-auto h-10 w-10 text-amber-400" />
          <h1 className="mt-3 text-xl font-bold">No application yet</h1>
          <p className="mt-1 text-sm text-muted-foreground">Start your KYC to submit for verification.</p>
          <Link to="/partners/kyc" className="mt-6 inline-block">
            <Button className="bg-emerald-500 text-white hover:bg-emerald-600">Start KYC</Button>
          </Link>
        </CardContent>
      </Card>
    </Shell>
  );

  const activeStep = app.status === "approved" || app.status === "rejected" ? 2 : 1;

  return (
    <Shell>
      <Card className="border border-emerald-500/20 bg-background/70 backdrop-blur">
        <CardContent className="p-8">
          <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-muted-foreground">Application</p>
              <h1 className="text-2xl font-bold">{app.hotel_name}</h1>
            </div>
            <StatusBadge status={app.status} />
          </div>

          {/* Timeline */}
          <ol className="relative border-l border-border/70">
            {timeline.map((t, i) => {
              const done = i < activeStep || (i === activeStep && app.status === "approved");
              const current = i === activeStep && app.status !== "approved" && app.status !== "rejected";
              const failed = i === 2 && app.status === "rejected";
              return (
                <li key={t.key} className="mb-6 ml-6 last:mb-0">
                  <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${done ? "bg-emerald-500" : failed ? "bg-red-500" : current ? "bg-amber-500 animate-pulse" : "bg-muted"}`}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5 text-white" /> : failed ? <XCircle className="h-3.5 w-3.5 text-white" /> : current ? <Clock className="h-3.5 w-3.5 text-white" /> : <span className="h-2 w-2 rounded-full bg-muted-foreground" />}
                  </span>
                  <p className="font-semibold">{t.label}</p>
                  <p className="text-sm text-muted-foreground">{t.desc}</p>
                </li>
              );
            })}
          </ol>

          {app.status === "rejected" && app.rejection_reason && (
            <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-4">
              <p className="text-sm font-semibold text-destructive">Needs more information</p>
              <p className="mt-1 text-sm text-destructive/80">{app.rejection_reason}</p>
              <Link to="/partners/kyc" className="mt-3 inline-block">
                <Button size="sm" variant="outline">Update documents</Button>
              </Link>
            </div>
          )}

          {app.status === "approved" && (
            <div className="mt-6 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <p className="font-semibold text-emerald-300">You're verified & live!</p>
              </div>
              <p className="mt-1 text-sm text-emerald-200/80">Next: connect your PMS & OTA channels to start receiving bookings.</p>
              <Button onClick={() => nav(app.pms_setup_completed ? "/partners/dashboard" : "/partners/pms-setup")} className="mt-3 bg-emerald-500 text-white hover:bg-emerald-600">
                {app.pms_setup_completed ? "Open Dashboard" : "Connect PMS"} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            Submitted {new Date(app.created_at).toLocaleString()}
            {app.reviewed_at && ` · Reviewed ${new Date(app.reviewed_at).toLocaleString()}`}
          </p>
        </CardContent>
      </Card>
    </Shell>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <Badge className="border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"><CheckCircle2 className="mr-1 h-3 w-3" /> Approved</Badge>;
  if (status === "rejected") return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" /> Needs info</Badge>;
  return <Badge className="border border-amber-500/40 bg-amber-500/10 text-amber-300"><Clock className="mr-1 h-3 w-3" /> Pending review</Badge>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-950/20">
      <PartnerNav />
      <div className="container mx-auto max-w-2xl px-4 py-10">{children}</div>
    </div>
  );
}

function FullLoader() {
  return (
    <Shell>
      <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>
    </Shell>
  );
}
