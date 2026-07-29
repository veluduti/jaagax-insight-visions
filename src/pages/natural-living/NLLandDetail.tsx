import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, MapPin, Ruler, Droplets, Leaf, Loader2, CheckCircle2, Home, Sprout, Route, Zap } from "lucide-react";
import NLLayout from "@/features/natural-living/NLLayout";
import { supabase } from "@/integrations/supabase/client";

export default function NLLandDetail() {
  const { id } = useParams<{ id: string }>();
  const [land, setLand] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData?.user?.id;
      // Public: approved+published OR profile_created. Owner: always.
      const { data } = await (supabase as any)
        .from("nl_land_registrations")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (data) {
        const isOwner = uid && data.user_id === uid;
        const isPublic =
          data.profile_created === true ||
          (data.status === "approved" && data.is_published === true);
        setLand(isOwner || isPublic ? data : null);
      } else {
        setLand(null);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <NLLayout>
        <div className="nl-container py-24 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--nl-forest))]" />
        </div>
      </NLLayout>
    );
  }

  if (!land) {
    return (
      <NLLayout>
        <div className="nl-container py-24 text-center">
          <p className="text-[hsl(var(--nl-muted))]">This land is not available.</p>
          <Link to="/natural-living/lands" className="nl-btn nl-btn-outline mt-4 inline-flex">
            <ArrowLeft className="h-4 w-4" /> Back to lands
          </Link>
        </div>
      </NLLayout>
    );
  }

  const location = [land.village, land.mandal, land.district, land.state, land.country]
    .filter(Boolean)
    .join(", ");

  const asList = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean).map(String);
    if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
    return [];
  };

  const suitableFor = asList(land.suitable_for);
  const waterSources = asList(land.water_sources);
  const infrastructure = asList(land.infrastructure);
  const vehicleAccess = asList(land.vehicle_access);
  const stayFacilities = asList(land.stay_facilities);
  const stayExperience = asList(land.stay_experience);

  return (
    <NLLayout>
      <section className="nl-container py-10 md:py-14">
        <Link
          to="/natural-living/lands"
          className="inline-flex items-center gap-2 text-sm text-[hsl(var(--nl-ink)/0.7)] hover:text-[hsl(var(--nl-forest))] mb-6"
        >
          <ArrowLeft className="h-4 w-4" /> Back to lands
        </Link>

        {/* Hero */}
        <div
          className="rounded-3xl overflow-hidden mb-8"
          style={{
            background:
              "linear-gradient(135deg, hsl(var(--nl-forest)/0.9), hsl(var(--nl-forest)/0.55))",
          }}
        >
          <div className="p-8 md:p-12 text-[hsl(var(--nl-cream))]">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] tracking-[0.2em] uppercase bg-white/15">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {land.status === "approved" && land.is_published ? "Verified · Live" : "Preview"}
              </div>
              {land.profile_tier && (
                <div
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] tracking-[0.2em] uppercase font-semibold"
                  style={{
                    background:
                      land.profile_tier === "luxury"
                        ? "linear-gradient(90deg,#f5c451,#c8912b)"
                        : land.profile_tier === "standard"
                          ? "rgba(255,255,255,0.25)"
                          : "rgba(255,255,255,0.15)",
                    color: "#fff",
                  }}
                >
                  {land.profile_tier} Profile
                </div>
              )}
            </div>
            <h1 className="nl-serif text-3xl md:text-5xl mt-4">
              {land.village || land.mandal || land.district || "Land parcel"}
            </h1>
            <div className="mt-3 flex items-center gap-2 text-sm opacity-90">
              <MapPin className="h-4 w-4" /> {location || "Location shared privately"}
            </div>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {land.total_area && (
                <Stat icon={<Ruler className="h-4 w-4" />} label="Total area" value={`${land.total_area} ${land.area_unit || ""}`} />
              )}
              {land.soil && <Stat icon={<Sprout className="h-4 w-4" />} label="Soil" value={land.soil} />}
              {land.water_availability && (
                <Stat icon={<Droplets className="h-4 w-4" />} label="Water" value={land.water_availability} />
              )}
              {land.farming_readiness && (
                <Stat icon={<Leaf className="h-4 w-4" />} label="Readiness" value={land.farming_readiness} />
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main */}
          <div className="md:col-span-2 space-y-6">
            <Section title="Land Overview">
              <Row label="Village" value={land.village} />
              <Row label="Mandal" value={land.mandal} />
              <Row label="District" value={land.district} />
              <Row label="State" value={land.state} />
              <Row label="Survey numbers" value={land.survey_numbers} />
              <Row label="Terrain" value={land.terrain} />
              <Row label="Current status" value={land.current_status} />
              <Row label="Available from" value={land.available_from} />
            </Section>

            <Section title="Crops & Farming">
              <Row label="Current crop" value={land.current_crop} />
              <Row label="Last crop" value={land.last_crop} />
              <Row label="Farming readiness" value={land.farming_readiness} />
              {suitableFor.length > 0 && (
                <ChipsRow label="Suitable for" items={suitableFor} />
              )}
            </Section>

            <Section title="Water & Infrastructure">
              <Row label="Water availability" value={land.water_availability} />
              <Row label="Borewells" value={land.borewell_count} />
              {waterSources.length > 0 && <ChipsRow label="Water sources" items={waterSources} />}
              <Row label="Road access" value={land.road_access} icon={<Route className="h-4 w-4" />} />
              <Row label="Electricity" value={land.electricity} icon={<Zap className="h-4 w-4" />} />
              {infrastructure.length > 0 && <ChipsRow label="Infrastructure" items={infrastructure} />}
              {vehicleAccess.length > 0 && <ChipsRow label="Vehicle access" items={vehicleAccess} />}
            </Section>

            {(stayFacilities.length > 0 || stayExperience.length > 0) && (
              <Section title="Farm Stay">
                {stayFacilities.length > 0 && (
                  <ChipsRow label="Facilities" items={stayFacilities} />
                )}
                {stayExperience.length > 0 && (
                  <ChipsRow label="Experiences" items={stayExperience} />
                )}
              </Section>
            )}

            {(land.project_tenure || land.project_duration || land.project_age) && (
              <Section title="Project">
                <Row label="Tenure" value={land.project_tenure} />
                <Row label="Duration" value={land.project_duration} />
                <Row label="Age" value={land.project_age} />
              </Section>
            )}
          </div>

          {/* Side */}
          <aside className="space-y-4">
            <div
              className="rounded-2xl border p-5 bg-[hsl(var(--nl-cream))]"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              <div className="flex items-center gap-2 mb-2 text-[hsl(var(--nl-forest))]">
                <Home className="h-4 w-4" />
                <span className="nl-eyebrow">Listed by</span>
              </div>
              <div className="font-medium text-[hsl(var(--nl-forest))]">{land.owner_name || "Land owner"}</div>
              <p className="text-xs text-[hsl(var(--nl-muted))] mt-2">
                Contact details are shared after you express interest, to protect the owner's privacy.
              </p>
              <Link
                to="/natural-living/contact"
                className="nl-btn nl-btn-primary w-full justify-center mt-4"
              >
                Enquire about this land
              </Link>
            </div>

            {(land.latitude && land.longitude) && (
              <a
                href={`https://www.google.com/maps?q=${land.latitude},${land.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl border p-5 bg-[hsl(var(--nl-cream))] hover:bg-[hsl(var(--nl-forest)/0.05)]"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                <div className="flex items-center gap-2 mb-1 text-[hsl(var(--nl-forest))]">
                  <MapPin className="h-4 w-4" />
                  <span className="nl-eyebrow">View on map</span>
                </div>
                <div className="text-xs text-[hsl(var(--nl-muted))]">
                  {Number(land.latitude).toFixed(4)}, {Number(land.longitude).toFixed(4)}
                </div>
              </a>
            )}
          </aside>
        </div>
      </section>
    </NLLayout>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider opacity-80">
        {icon} {label}
      </div>
      <div className="mt-1 nl-serif text-lg">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border p-5 md:p-6 bg-[hsl(var(--nl-cream))]"
      style={{ borderColor: "hsl(var(--border))" }}
    >
      <h2 className="nl-serif text-xl mb-4" style={{ color: "hsl(var(--nl-forest))" }}>
        {title}
      </h2>
      <div className="divide-y" style={{ borderColor: "hsl(var(--border))" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <div className="flex items-center gap-1.5 text-[hsl(var(--nl-ink)/0.65)]">
        {icon} {label}
      </div>
      <div className="text-right font-medium text-[hsl(var(--nl-ink))]">{String(value)}</div>
    </div>
  );
}

function ChipsRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="py-2.5">
      <div className="text-sm text-[hsl(var(--nl-ink)/0.65)] mb-2">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span
            key={i}
            className="px-2.5 py-1 rounded-full text-[11px] bg-[hsl(var(--nl-forest)/0.08)] text-[hsl(var(--nl-forest))]"
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}
