import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Layers, BedDouble, Palmtree, Hotel, Users, Building, Castle, Home, CalendarDays, Briefcase, BarChart3, Settings, Share2, CreditCard, Bell, ShieldCheck, Cpu, TrendingUp, IndianRupee, Network, Smile, Rocket, User, Headphones, Building2, LineChart, Shield, X, CheckCircle2 } from "lucide-react";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerFooter from "@/components/partners/PartnerFooter";
import HubHero, { P, card, btnPrimary, btnGhost } from "@/components/partners/hub/HubHero";
import "./partner-register.css";
import heroAsset from "@/assets/solutions-twilight-resort.png.asset.json";
import ctaAsset from "@/assets/partner-owner-hotel.png.asset.json";

type Item = { t: string; icon: any; d: string; link: string; points: string[] };
const types: Item[] = [
  { t: "Hotel Solutions", icon: BedDouble, d: "Nightly rooms, rate plans, add-ons and corporate rates.", link: "/partners/register?type=hotel", points: ["Room & rate plans", "Front desk and housekeeping", "OTA distribution"] },
  { t: "Resort Solutions", icon: Palmtree, d: "Packages, experiences and leisure demand.", link: "/partners/register?type=resort", points: ["Packages & experiences", "Dining and events", "Seasonal pricing"] },
  { t: "PG & Hostel Solutions", icon: Hotel, d: "Beds, residents, rent, mess and visitors.", link: "/partners/register?type=pg", points: ["Bed inventory", "Rent & payments", "Mess and visitor management"] },
  { t: "Co-living Solutions", icon: Users, d: "Residents, leads and monthly rent.", link: "/partners/register?type=coliving", points: ["Applications & leads", "Resident management", "Maintenance"] },
  { t: "Service Apartment", icon: Building, d: "Extended and corporate stays with GST invoices.", link: "/partners/register?type=serviced_apartment", points: ["Long stays", "Corporate rates", "GST invoicing"] },
  { t: "Villa & Holiday Home", icon: Castle, d: "Whole-home stays with house rules.", link: "/partners/register?type=villa", points: ["Whole-unit booking", "Deposits & rules", "Calendar sync"] },
  { t: "Homestay Solutions", icon: Home, d: "Simple listing and payouts.", link: "/partners/register?type=homestay", points: ["Easy listing", "Guest messaging", "Payouts"] },
  { t: "Event / Banquet Solutions", icon: CalendarDays, d: "Venue enquiries handled with our team.", link: "/partners/partner-with-jaaga", points: ["Venue enquiries", "Team-assisted onboarding"] },
  { t: "Corporate Stays", icon: Briefcase, d: "Business travellers and teams.", link: "/hotels?types=corporate", points: ["Corporate rates", "GST & business amenities"] },
  { t: "Real Estate Solutions", icon: BarChart3, d: "List and sell property on Jaaga.", link: "/sell-property", points: ["Verified listings", "Agent visits", "Buyer enquiries"] },
];
const cover: Item[] = [
  { t: "Bookings & Reservations", icon: CalendarDays, d: "Take bookings with live availability.", link: "/partners/reservations", points: ["Shared calendar", "Modifications & cancellations"] },
  { t: "Inventory & Rate Management", icon: Layers, d: "Rooms, units and rate plans.", link: "/partners/rate-plans", points: ["Rate plans", "Availability blocks"] },
  { t: "Property Operations (PMS)", icon: Settings, d: "Check-in/out, housekeeping, maintenance.", link: "/partners/operations", points: ["Front desk", "Housekeeping tasks"] },
  { t: "Distribution", icon: Share2, d: "OTAs and channel managers.", link: "/partners/integrations", points: ["HyperGuest live", "Other providers on request"] },
  { t: "Payments & Settlements", icon: CreditCard, d: "Collect online and track payouts.", link: "/partners/payouts", points: ["Online payments", "Payout records"] },
  { t: "Guest & Resident Management", icon: Users, d: "Guests, residents and leads.", link: "/partners/residents", points: ["Resident records", "Lead pipeline"] },
  { t: "Notifications & Communication", icon: Bell, d: "Messages and alerts.", link: "/partners/inbox", points: ["Guest inbox", "Booking alerts"] },
  { t: "Analytics & Revenue Insights", icon: LineChart, d: "Occupancy and revenue reports.", link: "/partners/analytics", points: ["Revenue reports", "Growth tips"] },
  { t: "Compliance, Tax & Invoicing", icon: ShieldCheck, d: "KYC, GST and invoices.", link: "/partners/kyc", points: ["KYC verification", "GST invoices"] },
  { t: "AI Automation & Smart Assist", icon: Cpu, d: "Role-based AI help.", link: "/partners/growth", points: ["AI assistant", "Data-based tips"] },
];
const needs = [
  { t: "Increase Bookings & Visibility", icon: TrendingUp, to: "/partners/plans" },
  { t: "Manage Operations Efficiently", icon: Settings, to: "/partners/operations" },
  { t: "Automate Payments & Settlements", icon: IndianRupee, to: "/partners/payouts" },
  { t: "Distribute to More Channels (OTAs, HyperGuest, etc.)", icon: Network, to: "/partners/integrations" },
  { t: "Handle Corporate & Long-Stays", icon: Users, to: "/partners/long-stays" },
  { t: "Improve Guest & Resident Experience", icon: Smile, to: "/partners/residents" },
  { t: "Grow and Scale Your Business", icon: Rocket, to: "/partners/portfolio" },
];
const roles = [
  { t: "Property Owners", icon: User, to: "/partners/register" },
  { t: "Operators / Managers", icon: Headphones, to: "/partners/login" },
  { t: "Agents / Consultants", icon: Briefcase, to: "/agents" },
  { t: "Builders / Developers", icon: Building2, to: "/projects" },
  { t: "Investors", icon: LineChart, to: "/search?intent=invest" },
  { t: "Corporate Travel Teams", icon: Users, to: "/hotels?types=corporate" },
  { t: "Guests / Residents", icon: Users, to: "/hotels" },
  { t: "Jaaga Admins", icon: Shield, to: "/admin" },
];
const integ = [{ n: "HyperGuest", s: "Live" }, { n: "RateGain", s: "On request" }, { n: "Hotelogix", s: "On request" }, { n: "Cloudbeds", s: "On request" }];

export default function PartnerSolutions() {
  const [sel, setSel] = useState<Item | null>(null);
  const [video, setVideo] = useState(false);
  const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  return (
    <div className="min-h-screen bg-[hsl(260,40%,98%)] text-[hsl(255,40%,14%)]">
      <PartnerNav />
      <HubHero image={heroAsset.url} badge={<><Home className="h-4 w-4" style={{ color: P }} /> Solutions</>} title="Jaaga" accent="Solutions" text="A unified suite of solutions to list, manage, automate, distribute and grow your hospitality, stays and real estate business.">
        <button onClick={() => go("cover")} className={btnPrimary}>Explore Solutions <ArrowRight className="h-4 w-4" /></button>
        <button onClick={() => setVideo(true)} className={btnGhost}><Play className="h-4 w-4" /> Watch 2-Min Overview</button>
      </HubHero>
      <main className="relative z-10 container mx-auto -mt-10 space-y-6 px-4 pb-12">
        <section id="types" className={`${card} relative flex flex-col gap-4 !p-4 xl:flex-row xl:items-center`}>
          <h2 className="shrink-0 text-2xl font-extrabold leading-tight tracking-tight xl:w-64">Solutions for Every<br /><span style={{ color: P }}>Property & Business</span></h2>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-5 xl:grid-cols-10">
            {types.map((t) => (
              <button key={t.t} onClick={() => setSel(t)} className="flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[hsl(265,40%,90%)] bg-white p-2 text-center text-[13px] font-bold leading-tight shadow-sm hover:border-[hsl(268,84%,52%)] hover:bg-[hsl(268,80%,97%)]">
                <t.icon className="h-7 w-7" style={{ color: P }} />{t.t}
              </button>
            ))}
          </div>
        </section>
        <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr_0.95fr]">
          <section id="cover" className={card}>
            <h2 className="text-xl font-extrabold">What Our Solutions Cover</h2>
            <p className="text-sm text-[hsl(260,15%,45%)]">End-to-end capability to run, grow and scale your property business.</p>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {cover.map((c) => (
                <button key={c.t} onClick={() => setSel(c)} className="flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[hsl(265,40%,90%)] bg-white p-2 text-center text-[12px] font-semibold leading-tight shadow-sm hover:border-[hsl(268,84%,52%)] hover:bg-[hsl(268,80%,97%)]">
                  <c.icon className="h-7 w-7" style={{ color: P }} />{c.t}
                </button>
              ))}
            </div>
          </section>
          <section id="needs" className={card}>
            <h2 className="text-xl font-extrabold">Solutions by Business Need</h2>
            <p className="text-sm text-[hsl(260,15%,45%)]">Choose a solution based on what you want to achieve.</p>
            <div className="mt-3 divide-y divide-[hsl(265,40%,93%)] rounded-lg border border-[hsl(265,40%,92%)]">
              {needs.map((n) => (
                <Link key={n.t} to={n.to} className="flex items-center gap-3 px-3 py-2 text-[13px] font-semibold hover:bg-[hsl(268,80%,97%)]">
                  <n.icon className="h-5 w-5 shrink-0" style={{ color: P }} /><span className="flex-1 leading-snug">{n.t}</span><ArrowRight className="h-4 w-4" style={{ color: P }} />
                </Link>
              ))}
            </div>
          </section>
          <section id="roles" className={card}>
            <h2 className="text-xl font-extrabold">Solutions for Every Role</h2>
            <p className="text-sm text-[hsl(260,15%,45%)]">Purpose-built experiences for all stakeholders.</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {roles.map((r) => (
                <Link key={r.t} to={r.to} className="flex min-h-[78px] flex-col items-center justify-center gap-1 rounded-xl border border-[hsl(265,40%,90%)] bg-white p-1.5 text-center text-[11px] font-semibold leading-tight shadow-sm hover:border-[hsl(268,84%,52%)] hover:bg-[hsl(268,80%,97%)]">
                  <r.icon className="h-6 w-6" style={{ color: P }} />{r.t}
                </Link>
              ))}
            </div>
          </section>
        </div>
        <section id="integrations" className={`${card} flex flex-col gap-4 !py-3 md:flex-row md:items-center`}>
          <div className="flex items-center gap-3 md:w-80 md:border-r md:border-[hsl(265,40%,90%)] md:pr-4"><Network className="h-9 w-9 shrink-0" style={{ color: P }} /><div><h2 className="text-lg font-extrabold">Platform & Integrations</h2><p className="text-sm text-[hsl(260,15%,45%)]">Connect, automate and expand with leading industry systems.</p></div></div>
          <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-5">
            {integ.map((i) => (
              <Link key={i.n} to="/partners/integrations" className="flex flex-col items-center justify-center rounded-xl border border-[hsl(265,40%,90%)] p-2 text-center shadow-sm">
                <div className="text-lg font-extrabold">{i.n}</div>
                <div className={`text-xs font-semibold ${i.s === "Live" ? "text-[hsl(145,63%,35%)]" : "text-[hsl(260,15%,45%)]"}`}>{i.s}</div>
              </Link>
            ))}
            <Link to="/partners/partner-with-jaaga" className="flex items-center justify-center rounded-xl border border-[hsl(265,40%,90%)] bg-[hsl(268,80%,97%)] p-2 text-center text-xs font-semibold">+ More Integrations<br />(PMS, Channel Managers, OTAs, Payments)</Link>
          </div>
        </section>
        <section className="relative flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(265,75%,22%)] to-[hsl(268,84%,45%)] p-6 text-white md:flex-row md:items-center md:pl-[24%]">
          <img src={ctaAsset.url} alt="" className="absolute inset-y-0 left-0 hidden h-full w-[22%] object-cover md:block" style={{ maskImage: "linear-gradient(to right, black 70%, transparent)", WebkitMaskImage: "linear-gradient(to right, black 70%, transparent)" }} />
          <div className="relative"><h2 className="text-2xl font-extrabold">One Platform. Complete Solutions.</h2><p className="text-white/85">For hospitality, stays, real estate and more.</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">{["List & Manage", "Distribute & Grow", "Automate & Scale"].map((x) => <span key={x} className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-[hsl(145,70%,60%)]" />{x}</span>)}</div></div>
          <button onClick={() => go("cover")} className="relative inline-flex items-center gap-2 rounded-lg bg-white px-8 py-3 font-bold" style={{ color: P }}>Explore All Solutions <ArrowRight className="h-4 w-4" /></button>
        </section>
      </main>
      <PartnerFooter />
      {(sel || video) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[hsl(255,40%,8%)]/60 p-4" onClick={() => { setSel(null); setVideo(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between"><h3 className="text-xl font-extrabold">{sel ? sel.t : "Jaaga in 2 minutes"}</h3><button aria-label="Close" onClick={() => { setSel(null); setVideo(false); }}><X className="h-5 w-5" /></button></div>
            {sel ? (<><p className="mt-2 text-sm text-[hsl(260,15%,45%)]">{sel.d}</p><ul className="mt-3 space-y-1 text-sm">{sel.points.map((p) => <li key={p} className="flex gap-2"><CheckCircle2 className="h-4 w-4" style={{ color: P }} />{p}</li>)}</ul>
              <Link to={sel.link} className={`${btnPrimary} mt-5`}>Get started <ArrowRight className="h-4 w-4" /></Link></>)
              : <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm"><li>Register and choose your property type.</li><li>Add rooms, rates and policies.</li><li>Complete KYC and go live.</li><li>Take bookings and track everything in one dashboard.</li></ol>}
          </div>
        </div>
      )}
    </div>
  );
}
