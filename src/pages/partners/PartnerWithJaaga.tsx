import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowRight, Play, Handshake, Layers, Building2, Network, BarChart3, FileText, CalendarDays, TrendingUp,
  CreditCard, Users, Headphones, BedDouble, Palmtree, Hotel, Building, Home, Castle, User, MapPin, Phone,
  Mail, ChevronDown, Send, Rocket, Link2, CheckCircle2, Search, X,
} from "lucide-react";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerFooter from "@/components/partners/PartnerFooter";
import { supabase } from "@/integrations/supabase/client";
import heroAsset from "@/assets/partner-hub-twilight.png.asset.json";
import ctaAsset from "@/assets/partner-owner-hotel.png.asset.json";
const heroImg = heroAsset.url;
const ctaImg = ctaAsset.url;
import "./partner-register.css";

const P = "hsl(268,84%,52%)";
const sections = [
  { id: "overview", label: "Partnership Overview", sub: "What it means to partner with Jaaga", icon: Handshake },
  { id: "models", label: "Partnership Models", sub: "Marketplace, Subscription, Enterprise", icon: Layers },
  { id: "who", label: "Who Can Partner", sub: "Hotel groups, chains, operators, enterprises", icon: Building2 },
  { id: "integrations", label: "Integrations & Distribution", sub: "PMS, Channel Manager, OTAs, APIs", icon: Network },
  { id: "commercials", label: "Commercials & Benefits", sub: "Commission, pricing, revenue opportunities", icon: BarChart3 },
  { id: "process", label: "Partnership Process", sub: "From enquiry to go-live", icon: FileText },
];
const benefits = [
  { icon: CalendarDays, t: "Wider Distribution", d: "Across OTAs, corporates and long-stay markets" },
  { icon: TrendingUp, t: "Higher Occupancy", d: "Improve visibility and revenue" },
  { icon: Layers, t: "Simpler Operations", d: "Manage inventory, rates, bookings and partners" },
  { icon: CreditCard, t: "Secure Payments", d: "Collect globally, settle on time" },
  { icon: Network, t: "Seamless Integrations", d: "Connect with your PMS, Channel Manager or API" },
  { icon: Users, t: "Corporate & Long-Stays", d: "Access business, team and extended-stay demand" },
  { icon: Headphones, t: "Dedicated Partner Support", d: "Onboarding, training and account management" },
];
type ModelKey = "marketplace" | "subscription" | "enterprise";
const models: { key: ModelKey; icon: any; t: string; d: string; tag: string; features: string[]; pricing: string }[] = [
  { key: "marketplace", icon: Handshake, t: "Marketplace Partner", d: "List your properties on Jaaga and receive bookings.", tag: "Commission Based",
    features: ["Listing on Jaaga stays search", "Bookings with secure online payment", "Partner dashboard for rooms, rates and calendar", "Reviews and guest messaging"],
    pricing: "Commission on confirmed bookings only. The exact rate is agreed with our team during the Discuss & Align stage." },
  { key: "subscription", icon: Layers, t: "Subscription Partner", d: "Use Jaaga's operational platform (PMS, inventory, payments, analytics).", tag: "Monthly / Annual",
    features: ["Front desk, housekeeping and maintenance", "Inventory, supplies and rent collection", "Analytics and reports", "Long-stay, mess and visitor tools"],
    pricing: "Monthly or annual plan based on property size and modules. A quote is shared after your enquiry." },
  { key: "enterprise", icon: Building2, t: "Enterprise Partner", d: "For hotel groups, chains, and large property portfolios.", tag: "Custom Commercials",
    features: ["Multi-property portfolio dashboard", "Property groups and brand settings", "PMS / channel manager integration", "Dedicated relationship manager"],
    pricing: "Custom commercial agreement covering distribution, platform use and integrations." },
];
const categories = [
  { key: "hotel", label: "Hotel Owners", icon: BedDouble, model: "marketplace" as ModelKey, info: "Sell rooms nightly with rate plans, add-ons and corporate rates." },
  { key: "resort", label: "Resort Operators", icon: Palmtree, model: "marketplace" as ModelKey, info: "Reach leisure and family travellers with packages and experiences." },
  { key: "pg", label: "PG / Hostel Operators", icon: Hotel, model: "subscription" as ModelKey, info: "Fill beds with long-stay bookings, rent collection and mess tools." },
  { key: "coliving", label: "Co-living Operators", icon: Users, model: "subscription" as ModelKey, info: "Manage residents, leads, visitors and monthly rent in one place." },
  { key: "serviced_apartment", label: "Service Apartment Operators", icon: Building, model: "marketplace" as ModelKey, info: "Win corporate and extended-stay demand with GST invoices." },
  { key: "villa", label: "Villa / Holiday Home Owners", icon: Castle, model: "marketplace" as ModelKey, info: "List whole-home stays with house rules and deposits." },
  { key: "homestay", label: "Homestay Owners", icon: Home, model: "marketplace" as ModelKey, info: "Share local hospitality with simple listing and payouts." },
  { key: "event", label: "Event / Banquet Operators", icon: CalendarDays, model: "enterprise" as ModelKey, info: "Discuss venue listings and event enquiries with our team." },
];
const integrations = [
  { name: "HyperGuest", status: "Live", d: "Connected today for international hotel inventory and bookings." },
  { name: "RateGain", status: "On request", d: "Channel manager connection set up per partner after approval." },
  { name: "Hotelogix", status: "On request", d: "PMS connection set up per partner after approval." },
  { name: "Cloudbeds", status: "On request", d: "PMS connection set up per partner after approval." },
];
const steps = [
  { icon: FileText, t: "Send Enquiry", d: "Share your business and requirements." },
  { icon: Users, t: "Discuss & Align", d: "Our team will understand your needs and share commercials." },
  { icon: Handshake, t: "Onboard & Integrate", d: "Complete agreement and set up integration (if required)." },
  { icon: Rocket, t: "Go Live", d: "List properties, start receiving bookings and grow with Jaaga." },
];
const STAGE_LABEL: Record<string, string> = { enquiry: "Enquiry received", discussion: "Discuss & Align", onboarding: "Onboard & Integrate", approved: "Approved", live: "Live", rejected: "Not approved" };
const TYPE_LABEL: Record<string, string> = { marketplace: "Marketplace Partner", subscription: "Subscription Partner", enterprise: "Enterprise Partner", integration: "Integration Partner" };

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  company: z.string().trim().min(2, "Enter your business name").max(150),
  type: z.enum(["marketplace", "subscription", "enterprise", "integration"], { errorMap: () => ({ message: "Choose a partnership type" }) }),
  cities: z.string().trim().min(2, "Enter your operating cities").max(200),
  mobile: z.string().trim().regex(/^\+?[0-9]{10,13}$/, "Enter a valid mobile number"),
  email: z.string().trim().email("Enter a valid email address").max(255),
  message: z.string().trim().max(1000).optional(),
});

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function PartnerWithJaaga() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openModel, setOpenModel] = useState<ModelKey | null>(null);
  const [category, setCategory] = useState<string>("");
  const [form, setForm] = useState({ full_name: "", company: "", type: "", cities: "", mobile: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [doneRef, setDoneRef] = useState<string | null>(null);
  const [video, setVideo] = useState(false);
  const [track, setTrack] = useState({ ref: "", email: "" });
  const [trackResult, setTrackResult] = useState<any>(null);
  const cat = useMemo(() => categories.find((c) => c.key === category), [category]);

  const pickModel = (k: ModelKey | "integration") => { setForm((f) => ({ ...f, type: k })); go("enquiry"); };
  const pickCategory = (k: string) => {
    const c = categories.find((x) => x.key === k)!;
    setCategory(k); setOpenModel(c.model);
    setForm((f) => ({ ...f, type: f.type || c.model }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[String(i.path[0])] = i.message; });
      setErrors(errs); return;
    }
    setErrors({}); setBusy(true);
    const v = parsed.data;
    const { data, error } = await (supabase as any).rpc("submit_partnership_enquiry", {
      _full_name: v.full_name, _company: v.company, _type: v.type, _category: cat?.label ?? "",
      _cities: v.cities, _mobile: v.mobile, _email: v.email, _message: v.message ?? "",
    });
    setBusy(false);
    if (error) { toast.error(error.message || "Could not submit. Please try again."); return; }
    setDoneRef(data as string);
    setTrack({ ref: data as string, email: v.email });
    toast.success("Enquiry submitted");
  };

  const lookup = async () => {
    if (!track.ref.trim() || !track.email.trim()) { toast.error("Enter enquiry ID and email"); return; }
    const { data, error } = await (supabase as any).rpc("get_partnership_enquiry_status", { _reference: track.ref, _email: track.email });
    if (error) { toast.error("Could not check status"); return; }
    if (!data?.length) { setTrackResult(null); toast.error("No enquiry found for that ID and email"); return; }
    setTrackResult(data[0]);
  };

  const inp = "h-9 w-full rounded-lg border border-[hsl(268,40%,88%)] bg-white pl-9 pr-3 text-sm outline-none focus:border-[hsl(268,84%,52%)]";
  const field = (k: keyof typeof form, ph: string, Icon: any, type = "text") => (
    <div>
      <div className="relative"><Icon className="absolute left-3 top-2.5 h-4 w-4 text-[hsl(260,15%,45%)]" />
        <input aria-label={ph} type={type} value={form[k]} placeholder={ph} maxLength={k === "message" ? 1000 : 255}
          onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={inp} /></div>
      {errors[k] && <p className="mt-1 text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[hsl(260,40%,98%)] text-[hsl(255,40%,14%)]">
      <PartnerNav />
      {/* HERO */}
      <section id="overview" className="relative overflow-hidden">
        <img src={heroImg} alt="Luxury resort with pool at dusk" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg,hsl(265 75% 20% / .96) 0%,hsl(268 70% 32% / .75) 32%,transparent 58%)" }} />
        <div className="container relative mx-auto px-4 pb-20 pt-8 md:pb-24">
          <div className="max-w-xl text-white">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-[hsl(255,40%,14%)]"><Handshake className="h-4 w-4" style={{ color: P }} /> Partner with Jaaga</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">Partner with <span className="text-[hsl(270,90%,80%)]">Jaaga</span><br />for Greater Growth</h1>
            <p className="mt-3 text-white/90 md:text-lg">A strategic partnership for hotels, hotel groups, real estate operators and large inventory owners.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => go("enquiry")} className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold" style={{ color: P }}>Become a Partner <ArrowRight className="h-4 w-4" /></button>
              <button onClick={() => setVideo(true)} className="inline-flex items-center gap-2 rounded-lg border border-white/70 px-5 py-3 text-sm font-semibold text-white"><Play className="h-4 w-4" /> Watch 2-Min Overview</button>
            </div>
            <div className="relative mt-5">
              <button onClick={() => setMenuOpen((v) => !v)} aria-expanded={menuOpen} className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur">Explore partnership <ChevronDown className={`h-4 w-4 transition ${menuOpen ? "rotate-180" : ""}`} /></button>
              {menuOpen && (
                <div className="absolute z-30 mt-2 w-[min(92vw,420px)] rounded-xl bg-white p-2 text-[hsl(255,40%,14%)] shadow-2xl">
                  {sections.map((s) => (
                    <button key={s.id} onClick={() => { setMenuOpen(false); go(s.id); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[hsl(268,80%,96%)]">
                      <s.icon className="h-5 w-5 shrink-0" style={{ color: P }} />
                      <span><span className="block text-sm font-bold">{s.label}</span><span className="block text-xs text-[hsl(260,15%,45%)]">{s.sub}</span></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="commercials" className="container relative z-10 mx-auto -mt-14 px-4">
        <div className="grid grid-cols-2 gap-y-5 rounded-2xl border border-[hsl(268,40%,90%)] bg-white p-5 shadow-xl sm:grid-cols-4 lg:grid-cols-7 lg:divide-x lg:divide-[hsl(268,30%,92%)]">
          {benefits.map((b) => (
            <div key={b.t} className="px-2 text-center">
              <b.icon className="mx-auto h-7 w-7" style={{ color: P }} />
              <p className="mt-2 text-sm font-bold">{b.t}</p>
              <p className="text-xs text-[hsl(260,15%,40%)]">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* GRID */}
      <section className="container mx-auto grid gap-4 px-4 py-5 md:grid-cols-2 xl:grid-cols-[1.3fr_1.1fr_1.35fr_1fr]">
        <div id="models" className="rounded-2xl border border-[hsl(268,40%,90%)] bg-white p-4">
          <h2 className="text-lg font-extrabold leading-tight tracking-tight">Partnership Models</h2>
          <p className="text-xs text-[hsl(260,15%,40%)]">Choose the right model based on your business needs.</p>
          <div className="mt-3 space-y-2.5">
            {models.map((m) => {
              const open = openModel === m.key;
              const hi = open || (!openModel && m.key === "marketplace");
              return (
                <div key={m.key} className={`rounded-xl border px-3 py-3 ${hi ? "border-[hsl(268,84%,52%)] bg-[hsl(268,80%,98%)]" : "border-[hsl(268,30%,92%)]"}`}>
                  <button onClick={() => setOpenModel(open ? null : m.key)} className="flex w-full items-center gap-3 text-left" aria-expanded={open}>
                    <m.icon className="h-7 w-7 shrink-0" style={{ color: P }} />
                    <span className="min-w-0 flex-1"><span className="block whitespace-nowrap text-sm font-bold">{m.t}</span><span className="block text-[11px] leading-snug text-[hsl(260,15%,40%)]">{m.d}</span></span>
                    <span className="shrink-0 whitespace-nowrap rounded-md bg-[hsl(268,80%,94%)] px-2 py-1 text-[10px] font-bold" style={{ color: P }}>{m.tag}</span>
                  </button>
                  {open && (
                    <div className="mt-3 border-t border-[hsl(268,30%,92%)] pt-3 text-sm">
                      <ul className="space-y-1">{m.features.map((f) => <li key={f} className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(150,60%,40%)]" />{f}</li>)}</ul>
                      <p className="mt-2 text-xs text-[hsl(260,15%,40%)]"><b>Pricing:</b> {m.pricing}</p>
                      <button onClick={() => pickModel(m.key)} className="mt-3 inline-flex items-center gap-1 text-sm font-bold" style={{ color: P }}>Enquire about this model <ArrowRight className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div id="who" className="rounded-2xl border border-[hsl(268,40%,90%)] bg-white p-4">
          <h2 className="text-lg font-extrabold leading-tight tracking-tight">Who Can Partner</h2>
          <p className="text-xs text-[hsl(260,15%,40%)]">We work with a wide range of hospitality and real estate businesses.</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {categories.map((c) => (
              <button key={c.key} onClick={() => pickCategory(c.key)} aria-pressed={category === c.key}
                className={`flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-xl border p-1.5 text-center text-[11px] font-bold leading-tight ${category === c.key ? "border-[hsl(268,84%,52%)] bg-[hsl(268,80%,96%)]" : "border-[hsl(268,30%,92%)] hover:border-[hsl(268,60%,75%)]"}`}>
                <c.icon className="h-7 w-7" style={{ color: P }} />{c.label}
              </button>
            ))}
          </div>
          {cat && <div className="mt-3 rounded-lg bg-[hsl(268,80%,97%)] p-3 text-sm"><b>{cat.label}:</b> {cat.info} <span className="block text-xs text-[hsl(260,15%,40%)]">Suggested model: {TYPE_LABEL[cat.model]}</span></div>}
        </div>

        <aside id="enquiry" className="rounded-2xl border border-[hsl(268,60%,88%)] bg-[hsl(268,80%,97%)] p-4 xl:col-start-4 xl:row-span-2 xl:row-start-1">
          <h2 className="text-lg font-extrabold leading-tight tracking-tight">Become a Jaaga Partner</h2>
          <p className="text-xs text-[hsl(260,15%,40%)]">Tell us about your business. Our partnership team will get in touch with the next steps.</p>
          {doneRef ? (
            <div className="mt-4 rounded-xl bg-white p-4 text-sm">
              <CheckCircle2 className="h-8 w-8 text-[hsl(150,60%,40%)]" />
              <p className="mt-2 font-bold">Thank you! Your enquiry ID is <span style={{ color: P }}>{doneRef}</span></p>
              <p className="text-[hsl(260,15%,40%)]">Save this ID to track your enquiry below.</p>
              <button onClick={() => { setDoneRef(null); setForm({ full_name: "", company: "", type: "", cities: "", mobile: "", email: "", message: "" }); }} className="mt-3 text-sm font-bold" style={{ color: P }}>Send another enquiry</button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-3 space-y-2" noValidate>
              {field("full_name", "Full Name *", User)}
              {field("company", "Business / Company Name *", Building2)}
              <div>
                <div className="relative"><Layers className="absolute left-3 top-2.5 h-4 w-4 text-[hsl(260,15%,45%)]" />
                  <select aria-label="Partnership Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inp}>
                    <option value="">Partnership Type *</option>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
                {errors.type && <p className="mt-1 text-xs text-destructive">{errors.type}</p>}
              </div>
              {cat && <p className="text-xs">Category: <b>{cat.label}</b> <button type="button" onClick={() => setCategory("")} className="ml-1 underline">change</button></p>}
              {field("cities", "City / Operating Cities *", MapPin)}
              {field("mobile", "Mobile Number *", Phone, "tel")}
              {field("email", "Email Address *", Mail, "email")}
              <textarea aria-label="Message" placeholder="Anything else? (optional)" maxLength={1000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-lg border border-[hsl(268,40%,88%)] bg-white p-3 text-sm outline-none" rows={1} />
              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-60" style={{ background: P }}>{busy ? "Submitting…" : "Submit Partnership Enquiry"} <ArrowRight className="h-4 w-4" /></button>
            </form>
          )}
          <div className="mt-5 rounded-xl bg-white p-4">
            <p className="text-sm font-bold">Track your enquiry</p>
            <div className="mt-2 space-y-2">
              <input aria-label="Enquiry ID" placeholder="Enquiry ID (JGX-PE-…)" value={track.ref} onChange={(e) => setTrack({ ...track, ref: e.target.value })} className="h-9 w-full rounded-lg border border-[hsl(268,40%,88%)] px-3 text-sm" />
              <input aria-label="Email used" placeholder="Email used" value={track.email} onChange={(e) => setTrack({ ...track, email: e.target.value })} className="h-9 w-full rounded-lg border border-[hsl(268,40%,88%)] px-3 text-sm" />
              <button onClick={lookup} className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: P }}><Search className="h-4 w-4" /> Check status</button>
            </div>
            {trackResult && (
              <div className="mt-3 text-sm">
                <p><b>{trackResult.reference}</b> · {trackResult.company_name}</p>
                <p>{TYPE_LABEL[trackResult.partnership_type]} — <b style={{ color: P }}>{STAGE_LABEL[trackResult.stage] ?? trackResult.stage}</b></p>
                <div className="mt-2 h-2 rounded-full bg-[hsl(268,30%,92%)]"><div className="h-2 rounded-full" style={{ width: `${trackResult.onboarding_progress}%`, background: P }} /></div>
                <p className="mt-1 text-xs text-[hsl(260,15%,40%)]">Onboarding {trackResult.onboarding_progress}% · updated {new Date(trackResult.updated_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </aside>

        <div id="process" className="rounded-2xl border border-[hsl(268,40%,90%)] bg-white p-4 xl:col-start-3 xl:row-start-1">
          <h2 className="text-lg font-extrabold leading-tight tracking-tight">How the Partnership Works</h2>
          <p className="text-xs text-[hsl(260,15%,40%)]">A simple and guided process from enquiry to go-live.</p>
          <div className="mt-5 grid grid-cols-4 gap-3">
            {steps.map((s, i) => (
              <div key={s.t} className="relative text-center">
                {i < steps.length - 1 && <ArrowRight className="absolute -right-3 top-9 h-5 w-5" style={{ color: P }} />}
                <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: P }}>{i + 1}</span>
                <div className="mx-auto -mt-1 flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(268,80%,95%)]"><s.icon className="h-8 w-8" style={{ color: P }} /></div>
                <p className="mt-3 text-sm font-bold leading-tight">{s.t}</p><p className="mt-1 text-[11px] leading-snug text-[hsl(260,15%,40%)]">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="integrations" className="flex flex-col gap-3 rounded-2xl border border-[hsl(268,40%,90%)] bg-white p-4 md:col-span-2 xl:col-span-3 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3 xl:w-[30%] xl:shrink-0">
            <Link2 className="h-9 w-9" style={{ color: P }} />
            <div className="flex-1"><h2 className="text-base font-extrabold">Integrations & Distribution</h2>
              <p className="text-sm text-[hsl(260,15%,40%)]">Connect your existing systems and reach more customers through our growing distribution network.</p></div>
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-5">
            {integrations.map((g) => (
              <div key={g.name} title={g.d} className="flex flex-col items-center justify-center rounded-xl border border-[hsl(268,30%,92%)] p-2 text-center">
                <div className="flex flex-col items-center gap-1"><p className="text-base font-extrabold">{g.name}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${g.status === "Live" ? "bg-[hsl(150,60%,92%)] text-[hsl(150,60%,28%)]" : "bg-[hsl(268,30%,94%)] text-[hsl(260,15%,40%)]"}`}>{g.status}</span></div>
                              </div>
            ))}
            <div className="rounded-xl bg-[hsl(268,80%,96%)] p-2 text-center">
              <p className="font-extrabold">+ More</p><p className="text-xs">(PMS, Channel Managers, OTAs)</p>
                            <div className="mt-1 flex flex-wrap justify-center gap-2 text-[11px] font-bold">
                <button onClick={() => pickModel("integration")} style={{ color: P }}>Integration enquiry</button>
                <Link to="/partners/integrations" style={{ color: P }}>API docs (partners)</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-10">
        <div className="relative overflow-hidden rounded-2xl text-white" style={{ background: "linear-gradient(90deg,hsl(265,75%,22%),hsl(268,84%,45%))" }}>
          <img src={ctaImg} alt="" className="absolute inset-y-0 left-0 hidden h-full w-1/4 object-cover md:block" />
          <div className="relative flex flex-col gap-4 p-6 md:ml-[25%] md:flex-row md:items-center">
            <div className="flex-1">
              <h2 className="text-2xl font-extrabold">Ready to Grow Your Business with Jaaga?</h2>
              <p className="text-white/85">Join a trusted platform built for modern hospitality, stays and living spaces.</p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">{["More Bookings", "Higher Revenue", "Simpler Operations", "Dedicated Support"].map((t) => <span key={t} className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-[hsl(140,70%,60%)]" />{t}</span>)}</div>
            </div>
            <button onClick={() => go("enquiry")} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-8 py-3 font-bold" style={{ color: P }}>Become a Partner <ArrowRight className="h-4 w-4" /></button>
          </div>
        </div>
      </section>

      {video && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setVideo(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between"><h3 className="text-lg font-extrabold">Jaaga partnership in 2 minutes</h3><button onClick={() => setVideo(false)} aria-label="Close"><X className="h-5 w-5" /></button></div>
            <ol className="mt-3 space-y-2 text-sm">{steps.map((s, i) => <li key={s.t}><b>{i + 1}. {s.t}</b> — {s.d}</li>)}</ol>
            <button onClick={() => { setVideo(false); go("enquiry"); }} className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: P }}><Send className="h-4 w-4" /> Start your enquiry</button>
          </div>
        </div>
      )}
      <PartnerFooter />
    </div>
  );
}
