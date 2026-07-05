import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import { Section } from "@/features/natural-living/ui";
import { supabase } from "@/integrations/supabase/client";
import { useNLAuth } from "@/features/natural-living/useNLAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const sb = supabase as any;

export default function NLSubscribe() {
  const { planId } = useParams();
  const { user, profile } = useNLAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<any>(null);
  const [farm, setFarm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    delivery_address: "",
    delivery_city: profile?.city ?? "",
    delivery_pincode: "",
    notes: "",
  });

  useEffect(() => {
    (async () => {
      if (!planId) return;
      setLoading(true);
      const { data: p } = await sb.from("nl_subscription_plans").select("*").eq("id", planId).maybeSingle();
      setPlan(p);
      if (p?.farm_id) {
        const { data: f } = await sb.from("nl_farms").select("*").eq("id", p.farm_id).maybeSingle();
        setFarm(f);
      }
      setLoading(false);
    })();
  }, [planId]);

  useEffect(() => {
    if (profile?.city && !form.delivery_city) setForm((f) => ({ ...f, delivery_city: profile.city ?? "" }));
  }, [profile?.city]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate(`/natural-living/auth?next=/natural-living/subscribe/${planId}`);
      return;
    }
    if (!plan) return;
    setSaving(true);
    const { data, error } = await sb.from("nl_subscriptions").insert({
      customer_user_id: user.id,
      plan_id: plan.id,
      farm_id: plan.farm_id,
      plot_id: plan.plot_id,
      crop_id: plan.crop_id,
      amount_paid: plan.price,
      status: "active",
      ...form,
    }).select().single();
    setSaving(false);
    if (error) {
      toast({ title: "Could not subscribe", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Subscription confirmed", description: `You're now subscribed to ${plan.name}.` });
    navigate("/natural-living/my-subscriptions");
  };

  if (loading) {
    return <NLLayout><div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} /></div></NLLayout>;
  }
  if (!plan) {
    return <NLLayout><Section><p className="text-center">Plan not found.</p></Section></NLLayout>;
  }

  return (
    <NLLayout>
      <Section>
        <div className="max-w-3xl mx-auto">
          <div className="nl-eyebrow mb-3">Subscribe</div>
          <h1 className="nl-serif text-4xl md:text-5xl mb-2">{plan.name}</h1>
          {farm && <p className="text-sm text-[hsl(var(--nl-ink)/0.7)] mb-8">from <Link to={`/natural-living/digital-farm/farms/${farm.id}`} className="underline">{farm.name}</Link></p>}

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            <div className="border border-[hsl(var(--nl-forest)/0.2)] p-5">
              <div className="nl-eyebrow mb-1">Plan</div>
              <div className="nl-serif text-xl">{plan.tier}</div>
            </div>
            <div className="border border-[hsl(var(--nl-forest)/0.2)] p-5">
              <div className="nl-eyebrow mb-1">Frequency</div>
              <div className="nl-serif text-xl">{plan.frequency}</div>
            </div>
            <div className="border border-[hsl(var(--nl-forest)/0.2)] p-5">
              <div className="nl-eyebrow mb-1">Price</div>
              <div className="nl-serif text-xl" style={{ color: "hsl(var(--nl-forest))" }}>₹{plan.price.toLocaleString()}</div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="nl-eyebrow block mb-2">Delivery address</label>
              <textarea required rows={3} className="w-full border border-[hsl(var(--nl-forest)/0.25)] bg-[hsl(var(--nl-cream))] p-3 text-sm"
                value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="nl-eyebrow block mb-2">City</label>
                <input required className="w-full border border-[hsl(var(--nl-forest)/0.25)] bg-[hsl(var(--nl-cream))] p-3 text-sm"
                  value={form.delivery_city} onChange={(e) => setForm({ ...form, delivery_city: e.target.value })} />
              </div>
              <div>
                <label className="nl-eyebrow block mb-2">Pincode</label>
                <input required className="w-full border border-[hsl(var(--nl-forest)/0.25)] bg-[hsl(var(--nl-cream))] p-3 text-sm"
                  value={form.delivery_pincode} onChange={(e) => setForm({ ...form, delivery_pincode: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="nl-eyebrow block mb-2">Notes (optional)</label>
              <textarea rows={2} className="w-full border border-[hsl(var(--nl-forest)/0.25)] bg-[hsl(var(--nl-cream))] p-3 text-sm"
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <button type="submit" disabled={saving} className="nl-btn nl-btn-primary w-full justify-center">
              {saving ? "Confirming…" : `Confirm subscription — ₹${plan.price.toLocaleString()}`}
            </button>
            {!user && <p className="text-xs text-[hsl(var(--nl-muted))] text-center">You'll be asked to sign in first.</p>}
          </form>
        </div>
      </Section>
    </NLLayout>
  );
}
