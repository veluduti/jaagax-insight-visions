import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Search, BookOpen, Rocket, Layers, Settings, Network, BarChart3, ShieldCheck, LayoutGrid, Headphones, FileText, FileSpreadsheet, Download, PlayCircle, Calculator, LineChart, Tag, Coins, Mail, MessageCircle, X, Loader2 } from "lucide-react";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerFooter from "@/components/partners/PartnerFooter";
import HubHero, { P, card, btnPrimary, btnGhost, btnOutline } from "@/components/partners/hub/HubHero";
import { supabase } from "@/integrations/supabase/client";
import { commissionAmount } from "@/lib/partnerPlans";
import { downloadBlob } from "@/lib/downloadBlob";
import guideImg1 from "@/assets/hero-hotel.jpg";
import "./partner-register.css";

const cats = [
  { k: "start", t: "Getting Started", d: "Set up and go live on Jaaga", i: Rocket },
  { k: "product", t: "Product Guides", d: "Learn key features step by step", i: Layers },
  { k: "ops", t: "Operations", d: "Manage bookings, guests, residents and staff", i: Settings },
  { k: "integ", t: "Integrations", d: "PMS, channel manager, OTAs and APIs", i: Network },
  { k: "growth", t: "Business & Growth", d: "Pricing, revenue, distribution and marketing", i: BarChart3 },
  { k: "tax", t: "Compliance & Tax", d: "GST, invoicing and regulatory guidance", i: ShieldCheck },
  { k: "tools", t: "Templates & Tools", d: "Ready-to-use documents and calculators", i: LayoutGrid },
  { k: "help", t: "Support & Help", d: "FAQs, troubleshooting and contact support", i: Headphones },
];
type Guide = { id: string; cat: string; t: string; d: string; steps: string[]; to: string };
const guides: Guide[] = [
  { id: "list", cat: "start", t: "How to List Your Property on Jaaga", d: "A step-by-step guide to create your property and go live.", to: "/partners/register", steps: ["Create your partner account and verify email and mobile.", "Choose your property type and fill the business profile with the map pin.", "Complete property setup: photos, policies, bank details.", "Finish KYC; once approved your property goes live."] },
  { id: "rooms", cat: "product", t: "Set Up Rooms, Rates and Inventory", d: "Configure room types, pricing, availability and policies.", to: "/partners/rooms", steps: ["Add each room or bed type with occupancy.", "Create rate plans (percent or fixed ₹ adjustments).", "Block dates in the calendar when needed.", "Check the preview before publishing."] },
  { id: "pms", cat: "integ", t: "Connect Your PMS or Channel Manager", d: "Integrate Hotelogix, RateGain, HyperGuest and more.", to: "/partners/integrations", steps: ["Open Integrations in your dashboard.", "Pick your provider and enter the details it gives you.", "Run a sandbox test.", "Request live activation; Jaaga admins approve it."] },
  { id: "ops", cat: "ops", t: "Daily Front Desk & Housekeeping", d: "Check-in, check-out and cleaning tasks in one flow.", to: "/partners/operations", steps: ["Check guests in from Today's arrivals.", "Check-out creates a cleaning task automatically.", "Housekeeping marks rooms ready."] },
  { id: "gst", cat: "tax", t: "GST Invoices on Jaaga", d: "How tax is shown and invoiced.", to: "/partners/kyc", steps: ["Add your GSTIN in property setup.", "Invoices show base amount and 18% GST where applicable.", "Download invoices from Rent & Payments."] },
  { id: "rev", cat: "growth", t: "Grow Occupancy with Pricing", d: "Use rate plans and coupons to fill dates.", to: "/partners/growth", steps: ["Review occupancy in Analytics.", "Create weekday or long-stay rate plans.", "Use growth tips computed from your own data."] },
];
const videos = [{ t: "Property Listing Walkthrough", g: "list" }, { t: "Inventory & Rate Management", g: "rooms" }, { t: "Booking & Guest Operations", g: "ops" }];
const webinars = [
  { k: "grow-bookings-2026-11-28", m: "NOV", d: "28", t: "Grow Bookings with Jaaga", s: "Best practices for higher occupancy" },
  { k: "pms-channel-2026-12-05", m: "DEC", d: "05", t: "PMS & Channel Manager Integration", s: "Go live with seamless distribution" },
  { k: "corporate-longstay-2026-12-12", m: "DEC", d: "12", t: "Corporate Stays & Long-Term Business", s: "Unlock new revenue opportunities" },
];
const csv = (rows: string[][]) => new Blob([rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
const txt = (s: string) => new Blob([s], { type: "text/plain;charset=utf-8" });
const downloads = [
  { t: "Property Onboarding Checklist (CSV)", icon: FileText, f: "onboarding-checklist.csv", b: () => csv([["Step", "Done"], ["Account & OTP verified", ""], ["Business profile & map pin", ""], ["Photos (min 5)", ""], ["Rooms & rates", ""], ["Policies", ""], ["Bank details (11-char IFSC)", ""], ["KYC documents", ""]]) },
  { t: "Rate Plan & Pricing Template (Excel CSV)", icon: FileSpreadsheet, f: "rate-plan-template.csv", b: () => csv([["Room type", "Base price (₹)", "Plan name", "Adjustment type (percent/flat)", "Adjustment value", "Meal plan", "Refundable (Y/N)"]]) },
  { t: "SOP: Housekeeping Operations", icon: FileText, f: "sop-housekeeping.txt", b: () => txt("Housekeeping SOP\n1. Start from check-out rooms.\n2. Strip linen, clean bathroom, dust, vacuum.\n3. Restock amenities.\n4. Inspect and mark room ready in Jaaga.\n5. Report maintenance issues as tasks.\n") },
  { t: "Guest Policy & Terms Template", icon: FileText, f: "guest-policy-template.txt", b: () => txt("Guest Policy\nCheck-in time: ____\nCheck-out time: ____\nID proof: Aadhaar, Passport, Driving Licence, Voter ID or PAN for every guest.\nCancellation: ____\nVisitors: ____\nPets / Smoking: ____\n") },
  { t: "Tax & Invoicing Guide (India)", icon: FileText, f: "tax-invoicing-guide.txt", b: () => txt("Tax & Invoicing on Jaaga\n- Jaaga platform fees are charged with 18% GST.\n- Room GST depends on the room tariff slab; confirm with your tax advisor.\n- Add your GSTIN in property setup so invoices carry it.\n") },
];
type Calc = "commission" | "revenue" | "pricing" | "roi";

export default function PartnerResources() {
  const [q, setQ] = useState(""); const [cat, setCat] = useState<string | null>(null);
  const [guide, setGuide] = useState<Guide | null>(null); const [calc, setCalc] = useState<Calc | null>(null);
  const [web, setWeb] = useState<(typeof webinars)[number] | null>(null);
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false);
  const shown = useMemo(() => guides.filter((g) => (!cat || g.cat === cat) && (`${g.t} ${g.d}`.toLowerCase().includes(q.toLowerCase()))), [q, cat]);
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = z.string().trim().email().max(255).safeParse(email);
    if (!ok.success) return toast.error("Enter a valid email address.");
    setBusy(true);
    const { error } = await (supabase as any).from("partner_newsletter_subscribers").insert({ email: ok.data.toLowerCase() });
    setBusy(false);
    if (error && error.code !== "23505") return toast.error("Couldn't subscribe right now. Please try again.");
    toast.success(error ? "You're already subscribed." : "Subscribed! You'll get Jaaga partner updates."); setEmail("");
  };

  return (
    <div className="min-h-screen bg-[hsl(260,40%,98%)] text-[hsl(255,40%,14%)]">
      <PartnerNav />
      <HubHero badge={<><BookOpen className="h-4 w-4" style={{ color: P }} /> Resources</>} title="Jaaga" accent="Resources" text="Guides, tools, tutorials, best practices and everything you need to succeed on Jaaga.">
        <button onClick={() => go("guides")} className={btnPrimary}>Explore All Resources <ArrowRight className="h-4 w-4" /></button>
        <button onClick={() => { go("guides"); setTimeout(() => document.getElementById("res-search")?.focus(), 400); }} className={btnGhost}><Search className="h-4 w-4" /> Search Resources</button>
      </HubHero>
      <main className="relative z-10 container mx-auto -mt-10 space-y-6 px-4 pb-12">
        <section className={`${card} grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8`}>
          {cats.map((c) => (
            <button key={c.k} onClick={() => { if (c.k === "tools") return go("tools"); if (c.k === "help") return go("help"); setCat(cat === c.k ? null : c.k); go("guides"); }} className={`flex flex-col items-center gap-1 rounded-xl p-2 text-center ${cat === c.k ? "bg-[hsl(268,80%,94%)]" : "hover:bg-[hsl(268,80%,97%)]"}`}>
              <c.i className="h-7 w-7" style={{ color: P }} /><span className="text-sm font-bold">{c.t}</span><span className="text-xs text-[hsl(260,15%,45%)]">{c.d}</span>
            </button>
          ))}
        </section>
        <div className="grid gap-6 lg:grid-cols-4">
          <section id="guides" className={card}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">{cat ? cats.find((c) => c.k === cat)?.t : "Featured Guides"}</h2>{(cat || q) && <button onClick={() => { setCat(null); setQ(""); }} className="text-xs font-bold" style={{ color: P }}>View All</button>}</div>
            <label className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2"><Search className="h-4 w-4" /><input id="res-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guides" className="w-full bg-transparent text-sm outline-none" /></label>
            <div className="mt-3 space-y-3">
              {shown.length === 0 && <p className="text-sm text-[hsl(260,15%,45%)]">No guides match your search.</p>}
              {shown.map((g) => (
                <button key={g.id} onClick={() => setGuide(g)} className="flex w-full gap-3 text-left">
                  <img src={guideImg1} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                  <span className="flex-1"><span className="block text-sm font-bold">{g.t}</span><span className="block text-xs text-[hsl(260,15%,45%)]">{g.d}</span></span><ArrowRight className="h-4 w-4 shrink-0" style={{ color: P }} />
                </button>
              ))}
            </div>
          </section>
          <section id="videos" className={card}>
            <h2 className="text-lg font-extrabold">Video Tutorials</h2>
            <p className="mt-1 text-xs text-[hsl(260,15%,45%)]">Videos are being recorded. Each opens its step-by-step guide meanwhile.</p>
            <div className="mt-3 space-y-2">{videos.map((v) => <button key={v.t} onClick={() => setGuide(guides.find((g) => g.id === v.g)!)} className="flex w-full items-center gap-2 text-left text-sm font-semibold"><PlayCircle className="h-4 w-4" style={{ color: P }} />{v.t}</button>)}</div>
          </section>
          <section id="webinars" className={card}>
            <h2 className="text-lg font-extrabold">Upcoming Webinars & Events</h2>
            <div className="mt-3 space-y-3">{webinars.map((w) => (
              <div key={w.k} className="flex items-center gap-3">
                <div className="w-12 shrink-0 rounded-lg bg-[hsl(268,80%,96%)] py-1 text-center"><div className="text-[10px] font-bold">{w.m}</div><div className="text-lg font-extrabold" style={{ color: P }}>{w.d}</div></div>
                <div className="flex-1"><div className="text-sm font-bold">{w.t}</div><div className="text-xs text-[hsl(260,15%,45%)]">{w.s}</div></div>
                <button onClick={() => setWeb(w)} className="rounded-lg border px-2 py-1 text-xs font-bold" style={{ color: P, borderColor: P }}>Register</button>
              </div>))}</div>
          </section>
          <section id="downloads" className={card}>
            <h2 className="text-lg font-extrabold">Popular Downloads</h2>
            <div className="mt-3 space-y-2">{downloads.map((d) => (
              <button key={d.f} onClick={() => downloadBlob(d.b(), d.f)} className="flex w-full items-center gap-2 text-left text-sm font-semibold"><d.icon className="h-5 w-5 shrink-0" style={{ color: P }} /><span className="flex-1">{d.t}</span><Download className="h-4 w-4" style={{ color: P }} /></button>))}</div>
          </section>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr_1.4fr]">
          <section id="tools" className={card}>
            <h2 className="text-lg font-extrabold">Tools & Calculators</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([["commission", "Commission Calculator", Calculator], ["revenue", "Revenue Estimator", LineChart], ["pricing", "Pricing Optimizer", Tag], ["roi", "ROI Calculator", Coins]] as const).map(([k, t, I]) => (
                <button key={k} onClick={() => setCalc(k)} className="flex flex-col items-center gap-1 rounded-xl bg-[hsl(268,80%,96%)] p-3 text-center text-sm font-bold hover:bg-[hsl(268,80%,92%)]"><I className="h-6 w-6" style={{ color: P }} />{t}</button>))}
            </div>
          </section>
          <section id="help" className={card}>
            <h2 className="flex items-center gap-2 text-lg font-extrabold"><Headphones className="h-5 w-5" style={{ color: P }} />Need Help?</h2>
            <p className="mt-1 text-sm text-[hsl(260,15%,45%)]">Find answers quickly or get in touch with our support team.</p>
            <div className="mt-4 flex flex-wrap gap-2"><Link to="/partners#faq" className={btnOutline}>Browse FAQs</Link><Link to="/partners/partner-with-jaaga#enquiry" className={btnPrimary}><MessageCircle className="h-4 w-4" />Contact Support</Link></div>
          </section>
          <section className="rounded-2xl bg-gradient-to-r from-[hsl(265,75%,22%)] to-[hsl(268,84%,45%)] p-5 text-white">
            <h2 className="flex items-center gap-2 text-xl font-extrabold"><Mail className="h-6 w-6" />Stay Updated with Jaaga</h2>
            <p className="mt-1 text-sm text-white/85">Get product updates, industry insights, new features and exclusive partner resources in your inbox.</p>
            <form onSubmit={subscribe} className="mt-4 flex overflow-hidden rounded-lg bg-white">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" aria-label="Email address" className="min-w-0 flex-1 px-3 text-sm text-[hsl(255,40%,14%)] outline-none" />
              <button disabled={busy} className="inline-flex items-center gap-1 bg-[hsl(268,84%,52%)] px-4 py-2.5 text-sm font-bold">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Subscribe <ArrowRight className="h-4 w-4" /></>}</button>
            </form>
          </section>
        </div>
      </main>
      <PartnerFooter />
      {guide && <Modal title={guide.t} onClose={() => setGuide(null)}><p className="text-sm text-[hsl(260,15%,45%)]">{guide.d}</p><ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">{guide.steps.map((s) => <li key={s}>{s}</li>)}</ol><Link to={guide.to} className={`${btnPrimary} mt-5`}>Open in Jaaga <ArrowRight className="h-4 w-4" /></Link></Modal>}
      {web && <WebinarModal w={web} onClose={() => setWeb(null)} />}
      {calc && <Modal title={{ commission: "Commission Calculator", revenue: "Revenue Estimator", pricing: "Pricing Optimizer", roi: "ROI Calculator" }[calc]} onClose={() => setCalc(null)}><Calcs k={calc} /></Modal>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(255,40%,8%)]/60 p-4" onClick={onClose}><div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}><div className="mb-3 flex items-start justify-between"><h3 className="text-xl font-extrabold">{title}</h3><button aria-label="Close" onClick={onClose}><X className="h-5 w-5" /></button></div>{children}</div></div>;
}

function WebinarModal({ w, onClose }: { w: (typeof webinars)[number]; onClose: () => void }) {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(255) }).safeParse({ name, email });
    if (!r.success) return toast.error("Enter your name and a valid email.");
    setBusy(true);
    const { error } = await (supabase as any).from("partner_webinar_registrations").insert({ webinar_key: w.k, name: r.data.name, email: r.data.email.toLowerCase() });
    setBusy(false);
    if (error && error.code !== "23505") return toast.error("Couldn't register right now. Please try again.");
    toast.success(error ? "You're already registered." : `Registered for ${w.t}.`); onClose();
  };
  return <Modal title={`Register: ${w.t}`} onClose={onClose}><form onSubmit={submit} className="space-y-3"><p className="text-sm text-[hsl(260,15%,45%)]">{w.d} {w.m} 2026 · {w.s}</p>
    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-lg border px-3 py-2 text-sm" />
    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border px-3 py-2 text-sm" />
    <button disabled={busy} className={btnPrimary}>{busy ? "Registering…" : "Register"}</button></form></Modal>;
}

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
function Num({ l, v, s }: { l: string; v: number; s: (n: number) => void }) {
  return <label className="block text-sm font-semibold">{l}<input type="number" min={0} value={v} onChange={(e) => s(Math.max(0, Number(e.target.value)))} className="mt-1 w-full rounded-lg border px-3 py-2" /></label>;
}
function Calcs({ k }: { k: Calc }) {
  const [a, setA] = useState(10000); const [b, setB] = useState(15); const [c, setC] = useState(20); const [d, setD] = useState(65);
  const box = (t: string, v: string) => <div className="mt-4 rounded-xl bg-[hsl(268,80%,96%)] p-3"><div className="text-xs font-semibold">{t}</div><div className="text-2xl font-extrabold" style={{ color: P }}>{v}</div></div>;
  if (k === "commission") return <div className="space-y-3"><Num l="Booking value (₹)" v={a} s={setA} /><Num l="Commission (%) — plans range 12–18%" v={b} s={setB} />{box("Commission / You receive", `${inr(commissionAmount(a, b))} / ${inr(a - commissionAmount(a, b))}`)}</div>;
  if (k === "revenue") { const rev = c * a / 10 * 30 * d / 100; return <div className="space-y-3"><Num l="Rooms or beds" v={c} s={setC} /><Num l="Average nightly rate (₹)" v={a / 10} s={(n) => setA(n * 10)} /><Num l="Expected occupancy (%)" v={d} s={setD} />{box("Estimated monthly revenue", inr(rev))}</div>; }
  if (k === "pricing") { const base = a / 10; const sugg = d >= 85 ? base * 1.1 : d < 50 ? base * 0.9 : base; return <div className="space-y-3"><Num l="Current nightly rate (₹)" v={base} s={(n) => setA(n * 10)} /><Num l="Current occupancy (%)" v={d} s={setD} />{box("Suggested rate", inr(sugg))}<p className="text-xs text-[hsl(260,15%,45%)]">Rule of thumb: raise 10% above 85% occupancy, lower 10% below 50%.</p></div>; }
  const cost = 7999 * 1.18; return <div className="space-y-3"><Num l="Extra bookings expected per month" v={b} s={setB} /><Num l="Average booking value (₹)" v={a / 10} s={(n) => setA(n * 10)} />{box("Monthly ROI on Growth plan (incl. GST)", `${Math.round(((b * a / 10 - cost) / cost) * 100)}%`)}<p className="text-xs text-[hsl(260,15%,45%)]">Compares extra booking value with ₹7,999 + 18% GST.</p></div>;
}
