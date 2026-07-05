import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import { Section } from "@/features/natural-living/ui";
import NLProtectedRoute from "@/features/natural-living/NLProtectedRoute";
import { supabase } from "@/integrations/supabase/client";
import { useNLAuth } from "@/features/natural-living/useNLAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sprout } from "lucide-react";

const sb = supabase as any;

function Inner() {
  const { user } = useNLAuth();
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await sb
      .from("nl_subscriptions")
      .select("*, plan:nl_subscription_plans(name,tier,frequency,price), farm:nl_farms(id,name)")
      .eq("customer_user_id", user.id)
      .order("created_at", { ascending: false });
    setSubs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user?.id]);

  const cancel = async (id: string) => {
    const { error } = await sb.from("nl_subscriptions").update({ status: "cancelled" }).eq("id", id);
    if (error) toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
    else { toast({ title: "Subscription cancelled" }); void load(); }
  };

  return (
    <NLLayout>
      <Section>
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="nl-eyebrow mb-2">My subscriptions</div>
            <h1 className="nl-serif text-4xl md:text-5xl">Your harvest, on repeat.</h1>
          </div>
          <Link to="/natural-living/digital-farm" className="nl-btn nl-btn-outline">Browse farms</Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} /></div>
        ) : subs.length === 0 ? (
          <div className="border border-dashed border-[hsl(var(--nl-forest)/0.3)] p-12 text-center">
            <Sprout className="h-8 w-8 mx-auto mb-3" style={{ color: "hsl(var(--nl-forest))" }} />
            <p className="text-sm text-[hsl(var(--nl-ink)/0.7)] mb-4">You don't have any subscriptions yet.</p>
            <Link to="/natural-living/digital-farm" className="nl-btn nl-btn-primary">Explore Digital Farm</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {subs.map((s) => (
              <div key={s.id} className="border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream))] p-6 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="nl-eyebrow mb-1">{s.plan?.tier} · {s.plan?.frequency}</div>
                  <h3 className="nl-serif text-2xl">{s.plan?.name}</h3>
                  {s.farm && <p className="text-sm text-[hsl(var(--nl-ink)/0.7)]">from <Link to={`/natural-living/digital-farm/farms/${s.farm.id}`} className="underline">{s.farm.name}</Link></p>}
                  <div className="text-xs text-[hsl(var(--nl-muted))] mt-2">Since {new Date(s.starts_on).toLocaleDateString()} · ₹{s.amount_paid?.toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs uppercase tracking-widest ${s.status === "active" ? "text-[hsl(var(--nl-forest))]" : "text-[hsl(var(--nl-muted))]"}`}>{s.status}</span>
                  {s.status === "active" && (
                    <button onClick={() => cancel(s.id)} className="nl-btn nl-btn-outline">Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </NLLayout>
  );
}

export default function NLMySubscriptions() {
  return <NLProtectedRoute><Inner /></NLProtectedRoute>;
}
