import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import { Section } from "@/features/natural-living/ui";
import { supabase } from "@/integrations/supabase/client";
import { Sprout, MapPin, Loader2, ArrowLeft } from "lucide-react";

const sb = supabase as any;

export default function NLFarmDetail() {
  const { farmId } = useParams();
  const [farm, setFarm] = useState<any>(null);
  const [plots, setPlots] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!farmId) return;
      setLoading(true);
      const [{ data: f }, { data: p }, { data: pl }] = await Promise.all([
        sb.from("nl_farms").select("*").eq("id", farmId).maybeSingle(),
        sb.from("nl_plots").select("*").eq("farm_id", farmId).order("created_at"),
        sb.from("nl_subscription_plans").select("*").eq("farm_id", farmId).eq("is_active", true).order("price"),
      ]);
      setFarm(f);
      setPlots(p ?? []);
      setPlans(pl ?? []);
      const plotIds = (p ?? []).map((x: any) => x.id);
      if (plotIds.length) {
        const { data: c } = await sb.from("nl_crops").select("*").in("plot_id", plotIds).order("created_at");
        setCrops(c ?? []);
      } else {
        setCrops([]);
      }
      setLoading(false);
    })();
  }, [farmId]);

  if (loading) {
    return (
      <NLLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "hsl(var(--nl-forest))" }} />
        </div>
      </NLLayout>
    );
  }

  if (!farm) {
    return (
      <NLLayout>
        <Section>
          <p className="text-center">Farm not found.</p>
          <div className="text-center mt-4">
            <Link to="/natural-living/digital-farm" className="nl-btn nl-btn-outline">Back to Digital Farm</Link>
          </div>
        </Section>
      </NLLayout>
    );
  }

  return (
    <NLLayout>
      {/* Hero */}
      <section style={{ background: "hsl(var(--nl-cream))" }} className="pt-10">
        <div className="nl-container">
          <Link to="/natural-living/digital-farm" className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-[hsl(var(--nl-forest))] mb-6">
            <ArrowLeft className="h-3.5 w-3.5" /> All farms
          </Link>
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="nl-eyebrow mb-3">Farm</div>
              <h1 className="nl-serif text-4xl md:text-6xl leading-[1.05]">{farm.name}</h1>
              <div className="flex flex-wrap gap-4 mt-6 text-sm text-[hsl(var(--nl-ink)/0.75)]">
                <span>{farm.total_area_acres} acres</span>
                {farm.farming_method && <span>· {farm.farming_method}</span>}
                {farm.certification && <span>· {farm.certification}</span>}
              </div>
              <p className="mt-6 leading-relaxed text-[hsl(var(--nl-ink)/0.75)]">{farm.description}</p>
            </div>
            <div className="aspect-[4/3] overflow-hidden" style={{ background: "hsl(var(--nl-cream-deep))" }}>
              {farm.hero_image_url ? (
                <img src={farm.hero_image_url} alt={farm.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[hsl(var(--nl-forest))]"><Sprout className="h-16 w-16" /></div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Plots & crops */}
      <Section tone="sage">
        <h2 className="nl-serif text-3xl md:text-4xl mb-8">Plots & Crops</h2>
        {plots.length === 0 ? (
          <p className="text-sm text-[hsl(var(--nl-muted))]">No plots have been mapped yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {plots.map((p) => {
              const pcrops = crops.filter((c) => c.plot_id === p.id);
              return (
                <div key={p.id} className="bg-[hsl(var(--nl-cream))] border border-[hsl(var(--nl-forest)/0.2)] p-6">
                  <div className="flex items-center gap-2 text-[hsl(var(--nl-forest))] mb-2">
                    <MapPin className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">Plot</span>
                  </div>
                  <h3 className="nl-serif text-2xl mb-1">{p.name}</h3>
                  <div className="text-xs text-[hsl(var(--nl-muted))] mb-4">
                    {p.size_acres} acres {p.soil_type && `· ${p.soil_type} soil`} {p.water_source && `· ${p.water_source}`}
                  </div>
                  {pcrops.length === 0 ? (
                    <p className="text-xs text-[hsl(var(--nl-muted))]">No crops planted.</p>
                  ) : (
                    <ul className="space-y-2">
                      {pcrops.map((c) => (
                        <li key={c.id} className="flex items-center justify-between text-sm border-t border-[hsl(var(--nl-forest)/0.1)] pt-2">
                          <div>
                            <div className="font-medium">{c.name}{c.variety && <span className="text-[hsl(var(--nl-muted))]"> · {c.variety}</span>}</div>
                            <div className="text-xs text-[hsl(var(--nl-muted))]">{c.status} {c.expected_harvest_at && `· harvest ${c.expected_harvest_at}`}</div>
                          </div>
                          {c.price_per_kg && <div className="text-xs">₹{c.price_per_kg}/kg</div>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Plans */}
      <Section>
        <h2 className="nl-serif text-3xl md:text-4xl mb-2">Subscribe to this farm</h2>
        <p className="text-sm text-[hsl(var(--nl-ink)/0.7)] mb-8 max-w-xl">Pick a plan and we deliver fresh produce directly from {farm.name}.</p>
        {plans.length === 0 ? (
          <div className="border border-dashed border-[hsl(var(--nl-forest)/0.3)] p-10 text-center">
            <p className="text-sm text-[hsl(var(--nl-muted))]">This farm has no active plans yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((pl) => (
              <div key={pl.id} className="border border-[hsl(var(--nl-forest)/0.25)] bg-[hsl(var(--nl-cream))] p-6 flex flex-col">
                <div className="nl-eyebrow mb-2">{pl.tier}</div>
                <h3 className="nl-serif text-2xl mb-2">{pl.name}</h3>
                <div className="text-sm text-[hsl(var(--nl-ink)/0.7)] mb-4">{pl.description}</div>
                <ul className="text-xs text-[hsl(var(--nl-muted))] space-y-1 mb-6">
                  <li>Frequency · {pl.frequency}</li>
                  {pl.included_kg && <li>Includes · {pl.included_kg} kg per delivery</li>}
                </ul>
                <div className="mt-auto">
                  <div className="nl-serif text-3xl mb-4" style={{ color: "hsl(var(--nl-forest))" }}>
                    ₹{pl.price.toLocaleString()}<span className="text-sm text-[hsl(var(--nl-muted))]"> /{pl.frequency}</span>
                  </div>
                  <Link to={`/natural-living/subscribe/${pl.id}`} className="nl-btn nl-btn-primary w-full justify-center">Subscribe</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </NLLayout>
  );
}
