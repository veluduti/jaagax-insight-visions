import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import NLLayout from "@/features/natural-living/NLLayout";
import { PageHeader, Section } from "@/features/natural-living/ui";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, MapPin, Leaf, Sprout } from "lucide-react";

const sb = supabase as any;

type State = { id: string; name: string; slug: string; description: string | null };
type District = { id: string; state_id: string; name: string; slug: string; description: string | null };
type Village = { id: string; district_id: string; name: string; slug: string; description: string | null; population: number | null };
type Farm = {
  id: string; name: string; slug: string; description: string | null;
  hero_image_url: string | null; total_area_acres: number;
  certification: string | null; farming_method: string | null;
  village_id: string | null; status: string;
};

export default function NLDigitalFarm() {
  const [params, setParams] = useSearchParams();
  const stateSlug = params.get("state");
  const districtId = params.get("district");
  const villageId = params.get("village");

  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);

  const activeState = states.find((s) => s.slug === stateSlug);
  const activeDistrict = districts.find((d) => d.id === districtId);
  const activeVillage = villages.find((v) => v.id === villageId);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await sb.from("nl_states").select("*").order("name");
      setStates(data ?? []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!activeState) { setDistricts([]); return; }
      const { data } = await sb.from("nl_districts").select("*").eq("state_id", activeState.id).order("name");
      setDistricts(data ?? []);
    })();
  }, [activeState?.id]);

  useEffect(() => {
    (async () => {
      if (!districtId) { setVillages([]); return; }
      const { data } = await sb.from("nl_villages").select("*").eq("district_id", districtId).order("name");
      setVillages(data ?? []);
    })();
  }, [districtId]);

  useEffect(() => {
    (async () => {
      const q = sb.from("nl_farms").select("*").eq("status", "approved").order("created_at", { ascending: false });
      if (villageId) q.eq("village_id", villageId);
      const { data } = await q;
      setFarms(data ?? []);
    })();
  }, [villageId]);

  const setParam = (key: string, value?: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    // when navigating up, clear deeper params
    if (key === "state") { next.delete("district"); next.delete("village"); }
    if (key === "district") { next.delete("village"); }
    setParams(next);
  };

  const crumb = (
    <div className="flex items-center flex-wrap gap-2 text-sm text-[hsl(var(--nl-ink)/0.7)]">
      <button onClick={() => { setParams(new URLSearchParams()); }} className="hover:text-[hsl(var(--nl-forest))]">India</button>
      {activeState && <><ChevronRight className="h-3.5 w-3.5" /><button onClick={() => setParam("state", activeState.slug)} className="hover:text-[hsl(var(--nl-forest))]">{activeState.name}</button></>}
      {activeDistrict && <><ChevronRight className="h-3.5 w-3.5" /><button onClick={() => setParam("district", activeDistrict.id)} className="hover:text-[hsl(var(--nl-forest))]">{activeDistrict.name}</button></>}
      {activeVillage && <><ChevronRight className="h-3.5 w-3.5" /><span className="text-[hsl(var(--nl-forest))]">{activeVillage.name}</span></>}
    </div>
  );

  return (
    <NLLayout>
      <PageHeader
        eyebrow="My Digital Farm"
        title="Own a slice of India's farmland — from your phone."
        lede="Browse by state, district and village. Meet the farmers. Choose a farm, a plot, a crop. Subscribe and we deliver the harvest to your door."
      />

      <Section>
        <div className="mb-8">{crumb}</div>

        {loading && <div className="text-sm text-[hsl(var(--nl-muted))]">Loading…</div>}

        {/* States */}
        {!stateSlug && !loading && (
          <div className="grid md:grid-cols-3 gap-6">
            {states.map((s) => (
              <button key={s.id} onClick={() => setParam("state", s.slug)}
                className="text-left border border-[hsl(var(--nl-forest)/0.2)] bg-[hsl(var(--nl-cream))] p-8 hover:border-[hsl(var(--nl-forest))] transition-colors">
                <div className="nl-eyebrow mb-3">State</div>
                <h3 className="nl-serif text-3xl mb-2" style={{ color: "hsl(var(--nl-forest))" }}>{s.name}</h3>
                <p className="text-sm text-[hsl(var(--nl-ink)/0.7)]">{s.description}</p>
                <div className="mt-6 text-xs uppercase tracking-widest text-[hsl(var(--nl-forest))] inline-flex items-center gap-1">
                  Explore districts <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Districts */}
        {stateSlug && !districtId && (
          <div>
            <h2 className="nl-serif text-3xl mb-6">Districts in {activeState?.name}</h2>
            {districts.length === 0 ? (
              <p className="text-sm text-[hsl(var(--nl-muted))]">No districts yet.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {districts.map((d) => (
                  <button key={d.id} onClick={() => setParam("district", d.id)}
                    className="text-left border border-[hsl(var(--nl-forest)/0.2)] p-6 hover:border-[hsl(var(--nl-forest))]">
                    <div className="flex items-center gap-2 mb-3 text-[hsl(var(--nl-forest))]"><MapPin className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">District</span></div>
                    <h3 className="nl-serif text-2xl mb-1">{d.name}</h3>
                    <p className="text-sm text-[hsl(var(--nl-ink)/0.7)]">{d.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Villages */}
        {districtId && !villageId && (
          <div>
            <h2 className="nl-serif text-3xl mb-6">Villages in {activeDistrict?.name}</h2>
            {villages.length === 0 ? (
              <p className="text-sm text-[hsl(var(--nl-muted))]">No villages listed here yet.</p>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {villages.map((v) => (
                  <button key={v.id} onClick={() => setParam("village", v.id)}
                    className="text-left border border-[hsl(var(--nl-forest)/0.2)] p-6 hover:border-[hsl(var(--nl-forest))]">
                    <div className="flex items-center gap-2 mb-3 text-[hsl(var(--nl-forest))]"><Leaf className="h-4 w-4" /><span className="text-xs uppercase tracking-widest">Village</span></div>
                    <h3 className="nl-serif text-2xl mb-1">{v.name}</h3>
                    {v.population && <div className="text-xs text-[hsl(var(--nl-muted))] mb-2">Population · {v.population.toLocaleString()}</div>}
                    <p className="text-sm text-[hsl(var(--nl-ink)/0.7)]">{v.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Farms */}
        {villageId && (
          <div>
            <h2 className="nl-serif text-3xl mb-6">Farms in {activeVillage?.name}</h2>
            {farms.length === 0 ? (
              <div className="border border-dashed border-[hsl(var(--nl-forest)/0.3)] p-12 text-center">
                <Sprout className="h-8 w-8 mx-auto mb-3" style={{ color: "hsl(var(--nl-forest))" }} />
                <p className="text-sm text-[hsl(var(--nl-ink)/0.7)]">No approved farms in this village yet.</p>
                <Link to="/natural-living/my-farms" className="nl-btn nl-btn-outline mt-6 inline-flex">Register your farm</Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {farms.map((f) => (
                  <Link key={f.id} to={`/natural-living/digital-farm/farms/${f.id}`}
                    className="group border border-[hsl(var(--nl-forest)/0.2)] hover:border-[hsl(var(--nl-forest))] overflow-hidden">
                    <div className="aspect-[4/3] overflow-hidden" style={{ background: "hsl(var(--nl-cream-deep))" }}>
                      {f.hero_image_url ? (
                        <img src={f.hero_image_url} alt={f.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[hsl(var(--nl-forest))]"><Sprout className="h-10 w-10" /></div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="nl-serif text-xl mb-1">{f.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-[hsl(var(--nl-muted))] mb-2">
                        <span>{f.total_area_acres} acres</span>
                        {f.farming_method && <><span>·</span><span>{f.farming_method}</span></>}
                        {f.certification && <><span>·</span><span>{f.certification}</span></>}
                      </div>
                      <p className="text-sm text-[hsl(var(--nl-ink)/0.7)] line-clamp-2">{f.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>
    </NLLayout>
  );
}
