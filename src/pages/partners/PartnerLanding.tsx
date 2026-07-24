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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-950/20 text-foreground">
      <PartnerNav />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[120px]" />
        </div>
        <div className="container mx-auto grid gap-12 px-4 py-2 md:py-2 lg:grid-cols-2 lg:items-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Badge className="mb-4 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/10">
              JAAGA X Partner Hub · India's fastest-growing hotel network
            </Badge>
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Grow your hotel with the{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                world's smartest booking platform
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              List once. Sell everywhere. Powerful pricing tools, real-time inventory sync, and AI-driven insights —
              built for independent hotels, resorts, and multi-property chains.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/partners/register">
                <Button
                  size="lg"
                  className="bg-emerald-500 text-white shadow-xl shadow-emerald-500/40 hover:bg-emerald-600"
                >
                  List your hotel <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#contact">
                <Button size="lg" variant="outline">
                  Talk to sales
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
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
            <Card className="border border-emerald-500/20 bg-gradient-to-br from-background/80 to-emerald-950/20 shadow-2xl shadow-emerald-500/10 backdrop-blur">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Building2 className="h-4 w-4 text-emerald-400" /> Partner Dashboard
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
                    Live
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: "Today's bookings", v: "38" },
                    { l: "Revenue", v: "₹2.4L" },
                    { l: "Occupancy", v: "92%" },
                  ].map((k) => (
                    <div key={k.l} className="rounded-lg border border-border/60 bg-background/40 p-3">
                      <p className="text-xs text-muted-foreground">{k.l}</p>
                      <p className="mt-1 text-2xl font-bold">{k.v}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {["Channel sync healthy", "3 new reviews (4.9★)", "Weekend rates optimized by AI"].map((s) => (
                    <div
                      key={s}
                      className="flex items-center gap-2 rounded-md border border-border/40 bg-background/30 px-3 py-2 text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" /> {s}
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
              <Card className="group h-full border border-border/60 bg-gradient-to-br from-background to-emerald-950/10 transition hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 transition group-hover:bg-emerald-500/20">
                    <b.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold">{b.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* BENEFITS DETAIL */}
      <section id="benefits" className="container mx-auto px-4 py-16">
        <SectionHeader eyebrow="Built for growth" title="Powerful tools, zero complexity" />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {detail.map((d) => (
            <Card key={d.title} className="border border-border/60 bg-background/40">
              <CardContent className="flex gap-4 p-6">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <d.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{d.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{d.body}</p>
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
              className={`relative flex h-full flex-col border ${p.featured ? "border-emerald-500/50 bg-gradient-to-b from-emerald-500/10 to-transparent shadow-2xl shadow-emerald-500/20" : "border-border/60"}`}
            >
              {p.featured && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white">
                  Most popular
                </Badge>
              )}
              <CardContent className="flex flex-1 flex-col p-6">
                <p className="text-sm font-semibold text-emerald-400">{p.name}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{p.price}</span>
                  {p.price !== "Custom" && <span className="text-sm text-muted-foreground">commission</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{p.tag}</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/partners/register" className="mt-6 block">
                  <Button
                    className={`w-full ${p.featured ? "bg-emerald-500 text-white hover:bg-emerald-600" : ""}`}
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
            <AccordionItem key={i} value={String(i)} className="border-border/60">
              <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
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
          <Card className="border border-emerald-500/20 bg-background/60 backdrop-blur">
            <CardContent className="p-6">
              <form onSubmit={submitContact} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input required placeholder="Full name" />
                  <Input required placeholder="Hotel / company" />
                </div>
                <Input required type="email" placeholder="Work email" />
                <Input required type="tel" placeholder="Phone number" />
                <Textarea required rows={4} placeholder="Tell us about your property (number of rooms, city, etc.)" />
                <Button type="submit" className="w-full bg-emerald-500 text-white hover:bg-emerald-600">
                  Request a callback
                </Button>
                <p className="text-xs text-muted-foreground">By submitting, you agree to our Terms & Privacy policy.</p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-600/20 via-teal-600/10 to-background p-10 text-center md:p-16">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to fill more rooms?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Join 18,000+ hotels growing with JAAGA X. Free to list. Live in 24 hours.
          </p>
          <Link to="/partners/register" className="mt-6 inline-block">
            <Button
              size="lg"
              className="bg-emerald-500 text-white shadow-xl shadow-emerald-500/40 hover:bg-emerald-600"
            >
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
      <p className="text-xl font-bold text-foreground">{n}</p>
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
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function ContactItem({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border/50 bg-background/30 p-4">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
