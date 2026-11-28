import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Search, BookOpen, Rocket, Layers, Settings, Network, BarChart3, ShieldCheck, LayoutGrid, Headphones, FileText, FileSpreadsheet, Download, PlayCircle, Calculator, LineChart, Tag, Coins, Mail, MessageCircle, X, Loader2 } from "lucide-react";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerFooter from "@/components/partners/PartnerFooter";
import { P, btnPrimary } from "@/components/partners/hub/HubHero";
import { supabase } from "@/integrations/supabase/client";
import { commissionAmount } from "@/lib/partnerPlans";
import { downloadBlob } from "@/lib/downloadBlob";
import guideImg1 from "@/assets/hero-hotel.jpg";
import bedroomImg from "@/assets/gal-bedroom.jpg";
import resourceHero from "@/assets/resources-purple-resort.png.asset.json";
import resourceHotel from "@/assets/resources-hotel-guide.png.asset.json";
import { Button } from "@/components/ui/button";
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
  const [showAll, setShowAll] = useState(false); const [searchOpen, setSearchOpen] = useState(false);
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
    <div className="partner-resources min-h-screen">
      <PartnerNav />
      <section className="resource-hero">
        <img src={resourceHero.url} alt="Jaaga resort and pool under purple twilight" />
        <div className="resource-hero-shade" />
        <div className="resource-shell resource-hero-content">
          <span className="resource-badge"><BookOpen /> Resources</span>
          <h1>Jaaga <span>Resources</span></h1>
          <p>Guides, tools, tutorials, best practices and everything you need<br className="hidden sm:block" /> to succeed on Jaaga.</p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Button className="resource-primary" onClick={() => { setShowAll(true); go("guides"); }}>Explore All Resources <ArrowRight /></Button>
            <Button variant="outline" className="resource-hero-search" onClick={() => { setSearchOpen(true); go("guides"); setTimeout(() => document.getElementById("res-search")?.focus(), 100); }}><Search /> Search Resources</Button>
          </div>
        </div>
      </section>
      <main className="resource-shell resource-main">
        <section className="resource-categories" aria-label="Resource categories">
          {cats.map((c) => <Button variant="ghost" key={c.k} aria-pressed={cat === c.k} onClick={() => { if (c.k === "tools") return go("tools"); if (c.k === "help") return go("help"); setCat(cat === c.k ? null : c.k); go("guides"); }} className={`resource-category ${cat === c.k ? "is-active" : ""}`}><c.i /><strong>{c.t}</strong><span>{c.d}</span></Button>)}
        </section>
        <div className="resource-columns">
          <section id="guides" className="resource-panel">
            <div className="resource-heading"><h2>{cat ? cats.find((c) => c.k === cat)?.t : "Featured Guides"}</h2><Button variant="ghost" className="resource-text-action" onClick={() => { setShowAll(!showAll); setCat(null); setQ(""); }}>{showAll ? "Show Less" : "View All"}<ArrowRight /></Button></div>
            {searchOpen && <label className="resource-search"><Search /><input id="res-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guides" /><Button variant="ghost" size="icon" aria-label="Close search" onClick={() => { setSearchOpen(false); setQ(""); }}><X /></Button></label>}
            <div className="resource-guide-list">
              {shown.length === 0 && <p>No guides match your search.</p>}
              {(showAll || cat || q ? shown : shown.slice(0, 3)).map((g, index) => <Button variant="ghost" key={g.id} onClick={() => setGuide(g)} className="resource-guide"><img src={index === 1 ? bedroomImg : index === 2 ? guideImg1 : resourceHotel.url} alt="" /><span><strong>{g.t}</strong><small>{g.d}</small></span><ArrowRight /></Button>)}
            </div>
          </section>
          <section id="videos" className="resource-panel">
            <div className="resource-heading"><h2>Video Tutorials</h2><Button variant="ghost" className="resource-text-action" onClick={() => setGuide(guides[0])}>View All <ArrowRight /></Button></div>
            <div className="resource-video-preview"><img src={resourceHotel.url} alt="Jaaga hotel" /><span>Videos coming soon</span></div>
            <h3 className="resource-video-title">Jaaga Platform Overview</h3><p className="resource-caption">Property setup & operations guides</p>
            <div className="resource-video-list">{videos.map((v) => <Button variant="ghost" key={v.t} onClick={() => { const match = guides.find((g) => g.id === v.g); if (match) setGuide(match); }} className="resource-video-link"><BookOpen /><span>{v.t}</span><ArrowRight /></Button>)}</div>
          </section>
          <section id="webinars" className="resource-panel">
            <div className="resource-heading"><h2>Upcoming Webinars & Events</h2><Button variant="ghost" className="resource-text-action" onClick={() => setWeb(webinars[0])}>View Events <ArrowRight /></Button></div>
            <div className="resource-webinars">{webinars.map((w) => <div key={w.k} className="resource-webinar"><div className="resource-date"><span>{w.m}</span><strong>{w.d}</strong></div><div><strong>{w.t}</strong><small>{w.s}</small></div><Button variant="outline" className="resource-register" onClick={() => setWeb(w)}>Register</Button></div>)}</div>
          </section>
          <section id="downloads" className="resource-panel">
            <div className="resource-heading"><h2>Popular Downloads</h2><Button variant="ghost" className="resource-text-action" onClick={() => go("downloads")}>View All <ArrowRight /></Button></div>
            <div className="resource-downloads">{downloads.map((d, index) => <Button variant="ghost" key={d.f} onClick={() => downloadBlob(d.b(), d.f)} className={`resource-download resource-file-${index}`}><d.icon /><span>{d.t}</span><Download /></Button>)}</div>
          </section>
        </div>
        <div className="resource-bottom">
          <section id="tools" className="resource-panel"><h2>Tools & Calculators</h2><div className="resource-tools">{([["commission", "Commission Calculator", Calculator], ["revenue", "Revenue Estimator", LineChart], ["pricing", "Pricing Optimizer", Tag], ["roi", "ROI Calculator", Coins]] as const).map(([k, t, I]) => <Button variant="ghost" key={k} onClick={() => setCalc(k)} className="resource-tool"><I /><span>{t}</span></Button>)}</div></section>
          <section id="help" className="resource-panel"><h2 className="flex items-center gap-2"><Headphones className="resource-icon" />Need Help?</h2><p className="resource-help-copy">Find answers quickly or get in touch with our support team.</p><div className="resource-help-actions"><Button asChild variant="outline" className="resource-outline"><Link to="/partners#faq">Browse FAQs</Link></Button><Button asChild className="resource-primary"><Link to="/partners/partner-with-jaaga#enquiry"><MessageCircle />Contact Support</Link></Button></div></section>
          <section className="resource-newsletter"><div><h2><Mail /> Stay Updated with Jaaga</h2><p>Get product updates, industry insights, new features and exclusive partner resources in your inbox.</p></div><form onSubmit={subscribe}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" aria-label="Email address" /><Button disabled={busy} className="resource-primary">{busy ? <Loader2 className="animate-spin" /> : <>Subscribe <ArrowRight /></>}</Button></form></section>
        </div>
      </main>
      <PartnerFooter />
      {guide && <Modal title={guide.t} onClose={() => setGuide(null)}><p className="text-sm">{guide.d}</p><ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">{guide.steps.map((s) => <li key={s}>{s}</li>)}</ol><Button asChild className="resource-primary mt-5"><Link to={guide.to}>Open in Jaaga <ArrowRight /></Link></Button></Modal>}
      {web && <WebinarModal w={web} onClose={() => setWeb(null)} />}
      {calc && <Modal title={{ commission: "Commission Calculator", revenue: "Revenue Estimator", pricing: "Pricing Optimizer", roi: "ROI Calculator" }[calc]} onClose={() => setCalc(null)}><Calcs k={calc} /></Modal>}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(255,40%,8%)]/60 p-4" onClick={onClose}><div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}><div className="mb-3 flex items-start justify-between"><h3 className="text-xl font-extrabold">{title}</h3><Button variant="ghost" aria-label="Close" onClick={onClose}><X className="h-5 w-5" /></Button></div>{children}</div></div>;
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
    <Button variant="ghost" disabled={busy} className={btnPrimary}>{busy ? "Registering…" : "Register"}</Button></form></Modal>;
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
