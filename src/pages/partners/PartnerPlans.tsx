import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Play, CheckCircle2, Minus, Leaf, Crown, Building2, Handshake, Loader2, Rocket, Layers, Tag, ShieldCheck, Headphones, Info, X, Hotel, Palmtree, BedDouble, Users, Home, CalendarDays, Briefcase, LayoutList, CalendarCheck, BarChart3, CreditCard, Share2, Settings2, LineChart, UserRound, Network, Headset } from "lucide-react";
import heroAsset from "@/assets/pricing-purple-twilight-resort.png.asset.json";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerFooter from "@/components/partners/PartnerFooter";
import HubHero, { P, card, btnPrimary, btnGhost, btnOutline } from "@/components/partners/hub/HubHero";
import { supabase } from "@/integrations/supabase/client";
import { yearlySavingsPercent, gstBreakup } from "@/lib/partnerPlans";
import "./partner-register.css";

type Plan = { plan_key: string; name: string; tagline: string | null; monthly_price: number | null; yearly_price: number | null; property_limit: number | null; commission_min: number | null; commission_max: number | null; features: string[]; comparison: Record<string, boolean>; support_level: string | null; is_popular: boolean; property_types: string[] };
const TYPES: [string, string, any][] = [["all", "All", null], ["hotel", "Hotels", Hotel], ["resort", "Resorts", Palmtree], ["pg", "PG / Hostels", BedDouble], ["coliving", "Co-living", Users], ["serviced_apartment", "Service Apartments", Building2], ["villa", "Villas / Holiday Homes", Home], ["homestay", "Homestays", Home], ["event", "Event / Banquet", CalendarDays], ["corporate", "Corporate Stays", Briefcase]];
const COL_ICONS: Record<string, any> = { list: LayoutList, bookings: CalendarCheck, inventory: BarChart3, payments: CreditCard, channel: Share2, pms: Settings2, analytics: LineChart, crm: UserRound, api: Network, support: Headset };
const COLS = [["bookings", "Bookings & Reservations"], ["inventory", "Inventory & Rates"], ["payments", "Payments & Settlements"], ["channel", "Channel Distribution"], ["pms", "Operations (PMS)"], ["analytics", "Analytics & Reports"], ["crm", "Guest / Resident CRM"], ["api", "API Integrations"]];
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const icons: Record<string, any> = { starter: Leaf, growth: Crown, enterprise: Building2, commission: Handshake };

export default function PartnerPlans() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [err, setErr] = useState(false);
  const [type, setType] = useState("all");
  const [model, setModel] = useState<"subscription" | "commission" | "enterprise">("subscription");
  const [yearly, setYearly] = useState(false);
  const [video, setVideo] = useState(false);
  useEffect(() => {
    (supabase as any).from("partner_plans").select("*").eq("is_active", true).order("sort_order").then(({ data, error }: any) => error ? setErr(true) : setPlans(data ?? []));
  }, []);
  const visible = useMemo(() => (plans ?? []).filter((p) => type === "all" || !p.property_types?.length || p.property_types.includes(type)), [plans, type]);
  const subs = visible.filter((p) => p.plan_key !== "commission");
  const commission = visible.find((p) => p.plan_key === "commission");
  const reg = (plan: string) => `/partners/register?plan=${plan}${yearly ? "&billing=yearly" : ""}${type !== "all" ? `&type=${type}` : ""}`;
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const pick = (m: typeof model) => { setModel(m); go(m === "commission" ? "plan-commission" : m === "enterprise" ? "plan-enterprise" : "plan-growth"); };

  return (
    <div className="min-h-screen bg-[hsl(260,40%,98%)] text-[hsl(255,40%,14%)]">
      <PartnerNav />
      <HubHero image={heroAsset.url} title="Jaaga" accent="Pricing" text="Flexible plans for every property and business size. List, manage, distribute and grow with Jaaga."
        side={<ul className="hidden space-y-2 rounded-2xl bg-[hsl(265,60%,15%)]/80 p-5 text-sm text-white backdrop-blur lg:block">{["No setup hassle", "Scalable for single or multi-property", "Transparent pricing", "Commission or subscription plans", "Dedicated partner support"].map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="h-4 w-4" />{x}</li>)}</ul>}>
        <button onClick={() => go("plans")} className={btnPrimary}>Choose a Plan <ArrowRight className="h-4 w-4" /></button>
        <button onClick={() => setVideo(true)} className={btnGhost}><Play className="h-4 w-4" /> Watch 2-Min Pricing Overview</button>
      </HubHero>
      <main className="relative z-10 mx-auto -mt-10 w-full max-w-[1640px] space-y-5 px-4 pb-12 lg:px-6">
        <div className={`${card} flex flex-wrap items-center gap-2 !p-3 xl:flex-nowrap`}>
          <span className="mr-1 whitespace-nowrap px-2 font-bold">See Pricing For</span>
          <div className="flex flex-1 gap-1.5 overflow-x-auto">{TYPES.map(([k, l, I]) => <button key={k} onClick={() => setType(k)} className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold ${type === k ? "bg-[hsl(265,75%,30%)] px-6 text-white" : "border border-[hsl(265,40%,92%)] bg-white hover:bg-[hsl(268,80%,97%)]"}`}>{I && <I className="h-4 w-4" style={{ color: P }} />}{l}</button>)}</div>
          <div className="shrink-0 flex items-center gap-1 rounded-lg bg-[hsl(268,80%,96%)] p-1 text-sm font-semibold">
            <button onClick={() => setYearly(false)} className={`rounded-md px-3 py-1.5 ${!yearly ? "bg-white shadow" : ""}`}>Monthly</button>
            <button onClick={() => setYearly(true)} className={`rounded-md px-3 py-1.5 ${yearly ? "bg-white shadow" : ""}`}>Yearly</button>
          </div>
        </div>
        {err && <p className={card}>Plans couldn't load right now. Please refresh the page.</p>}
        {!plans && !err && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" style={{ color: P }} /></div>}
        {plans && (
          <div id="plans" className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,0.85fr)_repeat(4,minmax(0,1fr))]">
            <div className={`${card} !p-4`}>
              <h2 className="text-xl font-extrabold leading-tight" style={{ color: "hsl(265,70%,25%)" }}>Choose Your Pricing Model</h2>
              {([["subscription", "Subscription Plan", "Pay a fixed fee and use Jaaga's full operations platform."], ["commission", "Commission Plan", "Pay only on successful bookings."], ["enterprise", "Enterprise Plan", "Custom pricing for large portfolios, chains and multi-brand operators."]] as const).map(([k, t, d]) => (
                <button key={k} onClick={() => pick(k)} className={`mt-2 flex w-full gap-2 rounded-xl p-2.5 text-left ${model === k ? "bg-[hsl(268,80%,94%)]" : "hover:bg-[hsl(268,80%,97%)]"}`}>
                  <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${model === k ? "border-[hsl(268,84%,52%)] bg-[hsl(268,84%,52%)] ring-2 ring-white ring-inset" : "border-[hsl(260,15%,70%)]"}`} />
                  <span><span className="block font-bold">{t}</span><span className="block text-xs text-[hsl(260,15%,45%)]">{d}</span></span>
                </button>
              ))}
            </div>
            {subs.map((p) => {
              const Icon = icons[p.plan_key] ?? Layers; const pop = p.is_popular;
              const price = yearly ? p.yearly_price : p.monthly_price;
              const save = yearlySavingsPercent(p.monthly_price, p.yearly_price);
              const gst = price ? gstBreakup(price) : null;
              return (
                <div key={p.plan_key} id={`plan-${p.plan_key}`} className={`flex flex-col rounded-2xl p-4 shadow-sm ${pop ? "bg-gradient-to-b from-[hsl(265,75%,30%)] to-[hsl(268,84%,42%)] text-white" : "border border-[hsl(265,40%,90%)] bg-white"} ${model === "enterprise" && p.plan_key === "enterprise" ? "ring-2 ring-[hsl(268,84%,52%)]" : ""}`}>
                  <div className="flex items-center gap-2"><Icon className="h-6 w-6" style={{ color: pop ? "hsl(45,95%,60%)" : P }} /><h3 className="whitespace-nowrap text-xl font-extrabold">{p.name}</h3>{pop && <span className="ml-auto whitespace-nowrap rounded-full bg-[hsl(268,90%,88%)] text-[hsl(265,75%,30%)] px-2 py-0.5 text-xs font-bold">Most Popular</span>}</div>
                  <p className={`mt-1 text-xs ${pop ? "text-white/85" : "text-[hsl(260,15%,45%)]"}`}>{p.tagline}</p>
                  {price != null ? (<>
                    <div className="mt-3"><span className="text-[32px] font-extrabold leading-none" style={{ color: pop ? undefined : "hsl(265,70%,25%)" }}>{inr(price)}</span><span className="text-sm"> / {yearly ? "year" : "month"}</span></div>
                    <div className="mt-1 flex items-center gap-2 text-sm">{yearly ? `${inr(p.monthly_price!)} / month billed monthly` : `or ${inr(p.yearly_price!)} / year`}{save > 0 && <span className="whitespace-nowrap rounded bg-[hsl(85,75%,65%)] px-1.5 text-xs font-bold text-[hsl(145,63%,20%)]">Save {save}%</span>}</div>
                    {gst && <p className={`mt-1 text-xs ${pop ? "text-white/75" : "text-[hsl(260,15%,45%)]"}`}>+ 18% GST {inr(gst.gst)} = {inr(gst.total)} total</p>}
                  </>) : (<><div className="mt-3 whitespace-nowrap text-[28px] font-extrabold" style={{ color: P }}>Custom Pricing</div><p className="text-xs text-[hsl(260,15%,45%)]">Based on inventory, locations and business needs.</p></>)}
                  <ul className="mt-3 flex-1 space-y-1 border-t border-current/10 pt-2.5 text-[13px] leading-snug">{p.features.map((f) => <li key={f} className="flex gap-2"><Check strokeWidth={3.5} className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${pop ? "text-[hsl(145,70%,60%)]" : "text-[hsl(145,63%,40%)]"}`} />{f}</li>)}</ul>
                  {p.plan_key === "enterprise"
                    ? <Link to="/partners/partner-with-jaaga#enquiry" className={`${btnOutline} mt-4 !py-2`}>Talk to Sales</Link>
                    : <Link to={reg(p.plan_key)} className={pop ? "mt-4 rounded-lg bg-white py-2 text-center text-sm font-bold" : `${btnOutline} mt-4 !py-2`} style={pop ? { color: P } : undefined}>{pop ? `Choose ${p.name}` : "Get Started"}</Link>}
                </div>
              );
            })}
            {commission && (
              <div id="plan-commission" className={`${card} !p-4 flex flex-col ${model === "commission" ? "ring-2 ring-[hsl(268,84%,52%)]" : ""}`}>
                <div className="flex items-center gap-2"><Handshake className="h-6 w-6" style={{ color: P }} /><h3 className="text-base font-extrabold leading-tight">{commission.name}</h3></div>
                <p className="mt-1 text-[13px] leading-snug">{commission.tagline}</p>
                <div className="mt-2.5 rounded-xl bg-[hsl(268,80%,96%)] p-2 text-center"><div className="text-sm font-semibold">Commission from</div><div className="whitespace-nowrap text-3xl font-extrabold" style={{ color: P }}>{commission.commission_min}% – {commission.commission_max}%</div><div className="text-xs text-[hsl(260,15%,45%)]">Final rate agreed during onboarding</div></div>
                <ul className="mt-3 flex-1 space-y-1 text-[13px] leading-snug">{commission.features.map((f) => <li key={f} className="flex gap-2"><Check strokeWidth={3.5} className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(145,63%,40%)]" />{f}</li>)}</ul>
                <Link to={reg("commission")} className={`${btnOutline} mt-4 !py-2`}>List on Commission Plan <ArrowRight className="h-4 w-4" /></Link>
              </div>
            )}
          </div>
        )}
        {plans && subs.length > 0 && (
          <section className={`${card} overflow-x-auto`}>
            <h2 className="text-xl font-extrabold">Feature Comparison</h2><p className="text-sm text-[hsl(260,15%,45%)]">See what's included in each plan.</p>
            <table className="mt-3 w-full min-w-[900px] text-center text-sm">
              <thead><tr className="text-xs font-bold"><th className="p-2 text-left">Plan</th>{[["list", "List Properties"], ...COLS, ["support", "Dedicated Support"]].map(([k, l]) => { const I = COL_ICONS[k]; return <th key={k} className="border-l border-[hsl(265,40%,94%)] p-2 align-bottom">{I && <I className="mx-auto mb-1 h-5 w-5" style={{ color: P }} />}{l}</th>; })}</tr></thead>
              <tbody>{subs.map((p) => <tr key={p.plan_key} className="border-t odd:bg-[hsl(268,60%,98%)]"><td className="p-2 text-left font-bold"><span className="inline-flex items-center gap-2">{(() => { const I = icons[p.plan_key] ?? Layers; return <I className="h-4 w-4" style={{ color: p.plan_key === "growth" ? "hsl(40,95%,50%)" : p.plan_key === "starter" ? "hsl(145,63%,40%)" : P }} />; })()}{p.name}</span></td><td className="p-2">{p.property_limit ? `Up to ${p.property_limit}` : "Unlimited"}</td>
                {COLS.map(([k]) => <td key={k} className="p-2">{p.comparison?.[k] ? <CheckCircle2 className="mx-auto h-5 w-5 text-[hsl(145,63%,40%)]" /> : <Minus className="mx-auto h-4 w-4 text-[hsl(260,15%,60%)]" />}</td>)}<td className="p-2">{p.support_level}</td></tr>)}</tbody>
            </table>
          </section>
        )}
        <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
          <div className={`${card} grid grid-cols-2 items-center gap-4 sm:grid-cols-3 lg:grid-cols-5`}>
            {[[Rocket, "Quick Onboarding", "Get live in a few days"], [Layers, "Scale Anytime", "Upgrade or switch plans easily"], [Tag, "Transparent Pricing", "No hidden charges"], [ShieldCheck, "Secure Payments", "Trusted & compliant"], [Headphones, "Partner Support", "Onboarding, training & ongoing help"]].map(([I, t, d]: any) => <div key={t} className="flex gap-2"><I className="h-6 w-6 shrink-0" style={{ color: P }} /><div><div className="text-sm font-bold">{t}</div><div className="text-xs text-[hsl(260,15%,45%)]">{d}</div></div></div>)}
          </div>
          <div className="flex flex-col items-start justify-between gap-3 rounded-2xl bg-gradient-to-r from-[hsl(265,75%,22%)] to-[hsl(268,84%,45%)] p-5 text-white sm:flex-row sm:items-center">
            <div><h2 className="text-xl font-extrabold">Ready to Get Started?</h2><p className="text-sm text-white/85">Choose a plan, list your property and start growing with Jaaga today.</p></div>
            <button onClick={() => go("plans")} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-white px-5 py-2.5 font-bold" style={{ color: P }}>Choose a Plan <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
        <p className="flex items-center gap-1 text-xs text-[hsl(260,15%,45%)]"><Info className="h-3.5 w-3.5" />Prices exclude 18% GST. Plan is confirmed with our team during registration before any charge.</p>
      </main>
      <PartnerFooter />
      {video && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(255,40%,8%)]/60 p-4" onClick={() => setVideo(false)}><div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}><div className="flex justify-between"><h3 className="text-xl font-extrabold">Pricing in 2 minutes</h3><button aria-label="Close" onClick={() => setVideo(false)}><X className="h-5 w-5" /></button></div><ol className="mt-3 list-decimal space-y-1 pl-5 text-sm"><li>Subscription: fixed monthly or yearly fee, yearly saves about 17%.</li><li>Commission: no upfront fee, pay a share of each confirmed booking.</li><li>Enterprise: custom terms for groups and chains.</li><li>You can upgrade or switch later.</li></ol></div></div>}
    </div>
  );
}
