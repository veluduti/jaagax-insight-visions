import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerFooter from "@/components/partners/PartnerFooter";
import { toast } from "sonner";
import {
  ArrowRight,
  TrendingUp,
  Globe2,
  BarChart3,
  Headphones,
  ShieldCheck,
  Sparkles,
  Building2,
  CheckCircle2,
  Zap,
  Users,
  IndianRupee,
} from "lucide-react";
import { useState } from "react";
import { UserRound, Handshake, Check, Play, BedDouble, Palmtree, Hotel, Building, Home, Castle, CalendarDays } from "lucide-react";
import { TYPE_PHOTO, DEFAULT_PHOTO } from "@/config/propertyTypeOnboarding";
import ownerAsset from "@/assets/partner-owner-hotel.png.asset.json";
const ownerImg = ownerAsset.url;
import partnerAsset from "@/assets/partner-twilight-resort.png.asset.json";
const partnerImg = partnerAsset.url;
import "./partner-register.css";

const propertyTypes = [
  { key: "hotel", photo: "hotel", label: "Hotel", icon: BedDouble },
  { key: "resort", photo: "resort", label: "Resort", icon: Palmtree },
  { key: "pg", photo: "pg", label: "PG / Hostel", icon: Hotel },
  { key: "coliving", photo: "coliving", label: "Co-living", icon: Users },
  { key: "serviced_apartment", photo: "serviced_apartment", label: "Service Apartment", icon: Building },
  { key: "homestay", photo: "homestay", label: "Homestay", icon: Home },
  { key: "villa", photo: "villa", label: "Villa / Holiday Home", icon: Castle },
  { key: "other", photo: "", label: "Event / Banquet", icon: CalendarDays },
];

const benefits = [
  {
    icon: Globe2,
    title: "Global reach",
    desc: "Get in front of millions of high-intent travelers across JAAGA X, Google, Tripadvisor and 40+ channels.",
  },
  {
    icon: TrendingUp,
    title: "Grow revenue",
    desc: "Dynamic pricing, promotions, and rate parity tools that lift RevPAR by up to 34%.",
  },
  {
    icon: BarChart3,
    title: "Actionable insights",
    desc: "Compare against competitors, forecast demand, and see what pricing wins bookings.",
  },
  {
    icon: Headphones,
    title: "24/7 partner support",
    desc: "Dedicated onboarding specialist and always-on multilingual support in your language.",
  },
];

const detail = [
  {
    icon: Zap,
    title: "Instant channel sync",
    body: "Two-way sync with SiteMinder, STAAH, RateGain, Cloudbeds, and 30+ PMS/CM systems.",
  },
  {
    icon: ShieldCheck,
    title: "Verified & trusted",
    body: "Instant payouts, fraud protection, and PCI-compliant payment processing.",
  },
  {
    icon: Users,
    title: "Direct guest relationship",
    body: "Own the guest data. Message, upsell, and re-target from a single inbox.",
  },
  {
    icon: Sparkles,
    title: "AI Revenue Manager",
    body: "Smart recommendations for pricing, inventory, and content — trained on 12M+ nights.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "0%",
    tag: "First 3 months free",
    features: ["Up to 20 rooms", "Standard listing", "Email support", "Basic analytics"],
    cta: "Start free",
  },
  {
    name: "Growth",
    price: "12%",
    tag: "Most popular",
    features: ["Unlimited rooms", "Priority placement", "Channel manager", "Revenue AI", "24/7 chat support"],
    cta: "Choose Growth",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    tag: "Multi-property",
    features: [
      "Chain management",
      "Dedicated account manager",
      "Custom integrations",
      "White-label portal",
      "SLA guarantees",
    ],
    cta: "Talk to sales",
  },
];

const faq = [
  {
    q: "How long does onboarding take?",
    a: "Most hotels are live within 24–48 hours of submitting KYC. Larger chains typically complete integration in under a week.",
  },
  {
    q: "What documents do I need to sign up?",
    a: "GST certificate, PAN, trade license, cancelled cheque, address proof, and identity proof of the owner or authorized signatory.",
  },
  {
    q: "Is there a listing fee?",
    a: "No. JAAGA X is commission-only — you pay only when we deliver a booking, and your first three months are free.",
  },
  {
    q: "Can I connect my existing PMS or channel manager?",
    a: "Yes — we support 30+ integrations including Hotelogix, Cloudbeds, Opera, SiteMinder, STAAH, and RateGain. Custom API is available for Enterprise.",
  },
  {
    q: "How do payouts work?",
    a: "Weekly bank transfers with a transparent statement. Instant payouts available on the Growth and Enterprise plans.",
  },
  {
    q: "Can I run multiple properties from one account?",
    a: "Absolutely. Add unlimited hotels under one login with role-based access for your team.",
  },
];

export default function PartnerLanding() {
  const [hover, setHover] = useState("pg");
  const submitContact = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Thanks! Our partnerships team will reach out within 24 hours.");
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="js-landing min-h-screen">
      <PartnerNav />

      {/* HUB HERO */}
      <section className="container mx-auto grid gap-5 px-4 pt-5 lg:grid-cols-2">
        <div id="owners" className="js-card relative overflow-hidden rounded-3xl">
          <img src={ownerImg} alt="Hotel with pool" className="absolute inset-y-0 right-0 hidden h-full w-[55%] object-cover sm:block" style={{ maskImage: "linear-gradient(to right, transparent, black 35%)", WebkitMaskImage: "linear-gradient(to right, transparent, black 35%)" }} />
          <div className="relative p-6 sm:max-w-[60%] sm:p-7">
            <span className="js-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"><UserRound className="h-3.5 w-3.5" /> For Property Owners</span>
            <h1 className="js-ink-text mt-4 text-2xl font-extrabold leading-tight lg:text-[34px]">List &amp; Manage Your Property on <span className="js-grad-text">Jaaga</span></h1>
            <p className="js-muted-text mt-3 text-sm">Register your property, set up inventory, get bookings and manage operations — all in one place.</p>
            <ul className="js-ink-text mt-4 space-y-2 text-sm">
              {["List your property (Hotel, PG, Resort, Co-living, etc.)", "Manage rooms, pricing and availability", "Receive bookings and payments", "Use built-in operations tools (PMS, housekeeping, etc.)"].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="js-purple-text mt-0.5 h-4 w-4 shrink-0" />{t}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3 [&_button]:whitespace-nowrap">
              <Link to="/partners/register"><Button className="js-btn border-0">List Your Property <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
              <a href="#benefits"><Button variant="outline" className="js-outline-btn">Explore Owner Tools</Button></a>
            </div>
          </div>
        </div>

        <div id="partner" className="relative overflow-hidden rounded-3xl text-primary-foreground" style={{ background: "linear-gradient(120deg, hsl(var(--js-purple)), hsl(265 60% 22%))" }}>
          <img src={partnerImg} alt="Resort at dusk" className="absolute inset-y-0 right-0 hidden h-full w-[55%] object-cover opacity-90 sm:block" style={{ maskImage: "linear-gradient(to right, transparent, black 40%)", WebkitMaskImage: "linear-gradient(to right, transparent, black 40%)" }} />
          <div className="relative p-6 sm:max-w-[60%] sm:p-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-xs font-semibold text-foreground"><Handshake className="js-purple-text h-3.5 w-3.5" /> Partner with Jaaga</span>
            <h2 className="mt-4 text-2xl font-extrabold leading-tight lg:text-[34px]">Partner with Jaaga for Greater Growth</h2>
            <p className="mt-3 text-sm opacity-90">A strategic partnership for hotels, hotel groups, chains, real estate operators and large inventory owners.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {["Access wider distribution (OTAs, corporate & long-stays)", "Commercial models (Commission, Subscription, Enterprise)", "Integrations (PMS, Channel Manager, API)", "Dedicated onboarding & account support"].map((t) => (
                <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{t}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3 [&_button]:whitespace-nowrap">
              <a href="#contact"><Button variant="outline" className="border-0 bg-background text-foreground hover:bg-background/90">Become a Partner <ArrowRight className="ml-2 h-4 w-4" /></Button></a>
              <a href="#pricing"><Button variant="outline" className="border-current bg-transparent hover:bg-background/10">View Partnership Benefits</Button></a>
            </div>
          </div>
        </div>
      </section>

      {/* WHICH IS RIGHT */}
      <section className="container mx-auto px-4 pt-5">
        <div className="js-card grid gap-4 rounded-2xl p-5 md:grid-cols-[auto_1fr_1fr] md:items-center md:divide-x">
          <div className="js-ink-text flex items-center gap-3 pr-4 text-xl font-bold"><Users className="js-purple-text h-7 w-7" /> Which is right for you?</div>
          <a href="#owners" className="flex gap-3 md:px-5"><Users className="js-purple-text h-8 w-8 shrink-0" /><div><p className="js-purple-text font-bold">For Property Owners</p><p className="js-muted-text text-xs">Ideal for individual property owners, PG/hostel operators, boutique hotels and service apartments who want to list and manage their property on Jaaga.</p></div></a>
          <a href="#partner" className="flex gap-3 md:px-5"><Handshake className="js-purple-text h-8 w-8 shrink-0" /><div><p className="js-purple-text font-bold">Partner with Jaaga</p><p className="js-muted-text text-xs">Ideal for hotel chains, groups, large operators, real estate portfolios and businesses looking for a long-term commercial partnership and wider distribution.</p></div></a>
        </div>
      </section>

      {/* STEPS + WHY CHOOSE */}
      <section className="container mx-auto grid gap-5 px-4 py-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="js-card rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="js-ink-text text-xl font-bold">List Your Property in 4 Simple Steps</h2>
            <ol className="flex items-start gap-2 sm:gap-6">
              {["Select Property Type", "Basic Details", "Location", "Verify & Create"].map((t, i) => (
                <li key={t} className="flex w-16 flex-col items-center text-center sm:w-20">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${i === 0 ? "js-btn border-transparent" : "js-ink-text js-line-b"}`}>{i + 1}</span>
                  <span className={`mt-1 text-[11px] ${i === 0 ? "js-purple-text font-semibold" : "js-muted-text"}`}>{t}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {propertyTypes.map((t) => (
              <Link key={t.label} to={`/partners/register?type=${t.key}`} onMouseEnter={() => setHover(t.key)} className={`group relative overflow-hidden rounded-xl border p-2 transition ${hover === t.key ? "js-panel !border-[hsl(var(--js-purple))]" : "js-line-b bg-background"}`}>
                <img src={TYPE_PHOTO[t.photo] ?? DEFAULT_PHOTO} alt={t.label} loading="lazy" className="h-16 w-full rounded-lg object-cover" />
                {hover === t.key && <span className="js-btn absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full"><Check className="h-4 w-4" /></span>}
                <span className="js-ink-text mt-2 flex items-center gap-2 px-1 text-sm font-bold"><t.icon className="js-purple-text h-4 w-4" />{t.label}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="js-card rounded-2xl p-6">
          <h2 className="js-ink-text text-xl font-bold">Why Choose Jaaga?</h2>
          <ul className="js-ink-text mt-4 space-y-3 text-sm">
            {["Reach more guests and residents", "Increase occupancy and revenue", "Manage operations in one platform", "Secure payments and timely settlements", "Integrate with PMS and channel managers", "Dedicated support and onboarding"].map((t) => (
              <li key={t} className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />{t}</li>
            ))}
          </ul>
          <a href="#benefits" className="mt-5 flex items-center gap-3">
            <span className="js-btn flex h-9 w-9 items-center justify-center rounded-full"><Play className="h-4 w-4" /></span>
            <span><span className="js-ink-text block font-bold">See How It Works</span><span className="js-muted-text text-xs">Owner tools overview</span></span>
          </a>
        </div>
      </section>

      {/* WHY */}
      <section id="why" className="container mx-auto px-4 py-2">
        <SectionHeader
          eyebrow="Why partner with us"
          title="Everything you need to sell more nights"
          subtitle="A single platform that replaces 5 point solutions and pays for itself in the first month."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="js-card js-card-hover group h-full transition">
                <CardContent className="p-6">
                  <div className="js-icon-box mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg transition">
                    <b.icon className="h-5 w-5" />
                  </div>
                  <h3 className="js-ink-text text-base font-semibold">{b.title}</h3>
                  <p className="js-muted-text mt-2 text-sm">{b.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* BENEFITS DETAIL */}
      <section id="benefits" className="container mx-auto px-4 py-6">
        <SectionHeader eyebrow="Built for growth" title="Powerful tools, zero complexity" />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {detail.map((d) => (
            <Card key={d.title} className="js-card">
              <CardContent className="flex gap-4 p-6">
                <div className="js-btn flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                  <d.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="js-ink-text font-semibold">{d.title}</h3>
                  <p className="js-muted-text mt-1 text-sm">{d.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="container mx-auto px-4 py-2">
        <SectionHeader
          eyebrow="Transparent pricing"
          title="Only pay when you get bookings"
          subtitle="No listing fees. No hidden charges. Cancel anytime."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <Card
              key={p.name}
              className={`js-card relative flex h-full flex-col ${p.featured ? "js-panel !border-[hsl(var(--js-purple))]" : ""}`}
            >
              {p.featured && (
                <Badge className="js-btn absolute -top-3 left-1/2 -translate-x-1/2 border-0">
                  Most popular
                </Badge>
              )}
              <CardContent className="flex flex-1 flex-col p-6">
                <p className="js-purple-text text-sm font-semibold">{p.name}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="js-ink-text text-4xl font-bold">{p.price}</span>
                  {p.price !== "Custom" && <span className="js-muted-text text-sm">commission</span>}
                </div>
                <p className="js-muted-text mt-1 text-xs">{p.tag}</p>
                <ul className="js-ink-text mt-6 flex-1 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="js-purple-text mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/partners/register" className="mt-6 block">
                  <Button
                    className={`w-full ${p.featured ? "js-btn border-0" : "js-outline-btn"}`}
                    variant={p.featured ? "default" : "outline"}
                  >
                    {p.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto max-w-3xl px-4 py-16">
        <SectionHeader eyebrow="Frequently asked" title="Everything you wanted to know" />
        <Accordion type="single" collapsible className="mt-8">
          {faq.map((f, i) => (
            <AccordionItem key={i} value={String(i)} className="js-line-b">
              <AccordionTrigger className="js-ink-text text-left text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="js-muted-text">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CONTACT */}
      <section id="contact" className="container mx-auto px-4 py-2">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow="Contact sales"
              title="Let's grow together"
              subtitle="Talk to a partnerships specialist about pricing, integration, or multi-property setups."
              align="left"
            />
            <div className="mt-8 space-y-4 text-sm">
              <ContactItem
                icon={IndianRupee}
                title="Enterprise & chains"
                body="Custom pricing for 5+ properties. Dedicated account manager."
              />
              <ContactItem
                icon={Headphones}
                title="Onboarding help"
                body="Book a 30-min call. We'll set up your first property live."
              />
              <ContactItem
                icon={ShieldCheck}
                title="Compliance & legal"
                body="Data protection, invoicing, and cross-border compliance."
              />
            </div>
          </div>
          <Card className="js-card">
            <CardContent className="p-6">
              <form onSubmit={submitContact} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input required placeholder="Full name" className="js-input" />
                  <Input required placeholder="Hotel / company" className="js-input" />
                </div>
                <Input required type="email" placeholder="Work email" className="js-input" />
                <Input required type="tel" placeholder="Phone number" className="js-input" />
                <Textarea required rows={4} placeholder="Tell us about your property (number of rooms, city, etc.)" className="js-input" />
                <Button type="submit" className="js-btn w-full border-0">
                  Request a callback
                </Button>
                <p className="js-muted-text text-xs">By submitting, you agree to our Terms & Privacy policy.</p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div className="js-panel relative overflow-hidden rounded-3xl border p-10 text-center md:p-16" style={{ borderColor: "hsl(var(--js-purple) / 0.35)" }}>
          <h2 className="js-ink-text text-3xl font-bold sm:text-4xl">Ready to fill more rooms?</h2>
          <p className="js-muted-text mx-auto mt-3 max-w-2xl">
            Join 18,000+ hotels growing with JAAGA X. Free to list. Live in 24 hours.
          </p>
          <Link to="/partners/register" className="mt-6 inline-block">
            <Button size="lg" className="js-btn border-0">
              List your hotel <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <PartnerFooter />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <p className="js-ink-text text-xl font-bold">{n}</p>
      <p className="text-xs">{l}</p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  const cn = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`${cn} max-w-2xl`}>
      <p className="js-purple-text text-xs font-semibold uppercase tracking-widest">{eyebrow}</p>
      <h2 className="js-ink-text mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="js-muted-text mt-3">{subtitle}</p>}
    </div>
  );
}

function ContactItem({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="js-card flex gap-3 rounded-lg p-4">
      <div className="js-icon-box flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="js-ink-text text-sm font-semibold">{title}</p>
        <p className="js-muted-text text-xs">{body}</p>
      </div>
    </div>
  );
}
