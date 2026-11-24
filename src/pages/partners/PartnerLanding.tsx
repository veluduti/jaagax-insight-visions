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
import "./partner-register.css";

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
  const submitContact = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Thanks! Our partnerships team will reach out within 24 hours.");
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="js-landing min-h-screen">
      <PartnerNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="js-glow absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full blur-[120px]" />
        </div>
        <div className="container mx-auto grid gap-12 px-4 py-2 md:py-2 lg:grid-cols-2 lg:items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="js-chip mb-4 hover:bg-transparent">
              JAAGA X Partner Hub · India's fastest-growing hotel network
            </Badge>
            <h1 className="js-ink-text text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Grow your hotel with the{" "}
              <span className="js-grad-text">world's smartest booking platform</span>
            </h1>
            <p className="js-muted-text mt-6 max-w-xl text-lg">
              List once. Sell everywhere. Powerful pricing tools, real-time inventory sync, and AI-driven insights —
              built for independent hotels, resorts, and multi-property chains.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/partners/register">
                <Button size="lg" className="js-btn border-0">
                  List your hotel <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#contact">
                <Button size="lg" variant="outline" className="js-outline-btn">
                  Talk to sales
                </Button>
              </a>
            </div>
            <div className="js-muted-text mt-8 flex flex-wrap items-center gap-6 text-sm">
              <Stat n="18,000+" l="Hotels onboarded" />
              <Stat n="₹1,200 Cr+" l="Bookings processed" />
              <Stat n="4.8/5" l="Partner rating" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <Card className="js-card">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="js-ink-text flex items-center gap-2 text-sm font-semibold">
                    <Building2 className="js-purple-text h-4 w-4" /> Partner Dashboard
                  </div>
                  <Badge variant="outline" className="js-chip">
                    Live
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: "Today's bookings", v: "38" },
                    { l: "Revenue", v: "₹2.4L" },
                    { l: "Occupancy", v: "92%" },
                  ].map((k) => (
                    <div key={k.l} className="js-panel rounded-lg border js-line-b p-3">
                      <p className="js-muted-text text-xs">{k.l}</p>
                      <p className="js-ink-text mt-1 text-2xl font-bold">{k.v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {["Channel sync healthy", "3 new reviews (4.9★)", "Weekend rates optimized by AI"].map((s) => (
                    <div
                      key={s}
                      className="js-ink-text flex items-center gap-2 rounded-md border js-line-b bg-white px-3 py-2 text-sm"
                    >
                      <CheckCircle2 className="js-purple-text h-4 w-4" /> {s}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
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
