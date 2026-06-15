import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Wallet, ShieldCheck, Zap, BadgePercent, Calculator,
  Building2, Star, ArrowRight, CheckCircle2, Sparkles, Banknote,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LoanAssistanceDialog from "@/components/financial/LoanAssistanceDialog";

type Provider = {
  id: string;
  company_name: string | null;
  services_offered: string[] | null;
  logo_url: string | null;
  rating: number | null;
  entity_type?: string | null;
};

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n));

function emi(principal: number, annualRate: number, months: number) {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export default function SmartFinancing() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loanOpen, setLoanOpen] = useState(false);

  // EMI calc state
  const [amount, setAmount] = useState(5000000); // 50L
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);

  const months = years * 12;
  const monthly = useMemo(() => emi(amount, rate, months), [amount, rate, months]);
  const total = monthly * months;
  const interest = total - amount;

  useEffect(() => {
    document.title = "Smart Financing | Home Loans, EMI & Verified Lenders";
    (async () => {
      const { data } = await (supabase as any)
        .from("financial_providers")
        .select("id,company_name,services_offered,logo_url,rating,entity_type")
        .eq("kyc_status", "verified")
        .limit(12);
      setProviders(data ?? []);
    })();
  }, []);

  const features = [
    { icon: Zap, title: "Pre-Approved in 24h", desc: "Get an in-principle sanction fast from verified lenders." },
    { icon: BadgePercent, title: "Best Interest Rates", desc: "Compare offers from banks & NBFCs side-by-side." },
    { icon: ShieldCheck, title: "RBI-Verified Partners", desc: "Only KYC-verified providers, with transparent fees." },
    { icon: Sparkles, title: "Personalised Offers", desc: "Eligibility matched to your income, property & profile." },
  ];

  const steps = [
    { n: 1, t: "Tell us about your property", d: "Pick a listing or enter the property value." },
    { n: 2, t: "Share basic income info", d: "We match you with eligible lenders instantly." },
    { n: 3, t: "Compare & choose", d: "Get offers, EMI plans and processing fees in one view." },
    { n: 4, t: "Disburse to seller", d: "Documents handled by your relationship manager." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative container mx-auto px-4 py-14 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <Badge variant="secondary" className="mb-4 gap-1">
              <Wallet className="h-3.5 w-3.5" /> Smart Financing
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Home loans, made <span className="text-primary">simple & smart</span>.
            </h1>
            <p className="mt-4 text-muted-foreground text-lg">
              Compare rates from verified banks & NBFCs, get pre-approved up to ₹5 Cr, and close
              your dream home with confidence — all within JaagaX.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setLoanOpen(true)} className="gap-2">
                <Banknote className="h-4 w-4" /> Apply for Home Loan
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/financial/register")} className="gap-2">
                <Building2 className="h-4 w-4" /> List your Bank / NBFC
              </Button>
            </div>
            <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" /> Zero brokerage</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" /> Paperless</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-primary" /> 100% secure</span>
            </div>
          </div>

          {/* EMI Calculator */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" /> EMI Calculator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <Label>Loan Amount</Label>
                  <span className="font-semibold">₹ {formatINR(amount)}</span>
                </div>
                <Slider value={[amount]} min={500000} max={50000000} step={100000}
                  onValueChange={(v) => setAmount(v[0])} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <Label>Interest Rate (p.a.)</Label>
                  <span className="font-semibold">{rate.toFixed(2)}%</span>
                </div>
                <Slider value={[rate]} min={6} max={14} step={0.1}
                  onValueChange={(v) => setRate(v[0])} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <Label>Tenure</Label>
                  <span className="font-semibold">{years} years</span>
                </div>
                <Slider value={[years]} min={1} max={30} step={1}
                  onValueChange={(v) => setYears(v[0])} />
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Monthly EMI</div>
                  <div className="text-lg font-bold text-primary">₹{formatINR(monthly)}</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Total Interest</div>
                  <div className="text-lg font-bold">₹{formatINR(interest)}</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground">Total Payable</div>
                  <div className="text-lg font-bold">₹{formatINR(total)}</div>
                </div>
              </div>
              <Button className="w-full" onClick={() => setLoanOpen(true)}>
                Get Personalised Offers <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
          Why finance with JaagaX?
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          A smarter way to fund real estate — built into your home search.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((f) => (
            <Card key={f.title}>
              <CardContent className="p-5">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="font-semibold">{f.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{f.desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/40 border-y">
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">How Smart Financing works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((s) => (
              <Card key={s.n}>
                <CardContent className="p-5">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-3">
                    {s.n}
                  </div>
                  <div className="font-semibold">{s.t}</div>
                  <div className="text-sm text-muted-foreground mt-1">{s.d}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Providers */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Verified lending partners</h2>
            <p className="text-muted-foreground">RBI-registered banks & NBFCs on JaagaX</p>
          </div>
          <Button variant="outline" onClick={() => setLoanOpen(true)}>Apply now</Button>
        </div>
        {providers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              We're onboarding lending partners. Be the first to apply — we'll match you with the best.
              <div className="mt-4">
                <Button onClick={() => setLoanOpen(true)}>Start Application</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((p) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {p.logo_url ? (
                      <img src={p.logo_url} alt={p.company_name ?? "Lender"} className="h-full w-full object-cover" />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold truncate">{p.company_name ?? "Lender"}</div>
                      {p.entity_type && <Badge variant="secondary" className="text-[10px]">{p.entity_type}</Badge>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Star className="h-3 w-3 fill-primary text-primary" /> {(p.rating ?? 0).toFixed(1)}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(p.services_offered ?? []).slice(0, 3).map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Provider CTA */}
      <section className="container mx-auto px-4 pb-16">
        <Card className="overflow-hidden">
          <div className="p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-6 items-center bg-gradient-to-br from-primary/10 to-transparent">
            <div>
              <Badge className="mb-3">For Banks & NBFCs</Badge>
              <h3 className="text-2xl md:text-3xl font-bold">Are you a lender? Reach pre-qualified buyers.</h3>
              <p className="text-muted-foreground mt-2">
                Join JaagaX Smart Financing — get a lead marketplace, application pipeline,
                wallet, and promotions dashboard out of the box.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" onClick={() => navigate("/financial/register")} className="gap-2">
                Register as Provider <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/dashboard/financial">Go to Dashboard</Link>
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <LoanAssistanceDialog
        open={loanOpen}
        onOpenChange={setLoanOpen}
        propertyValue={amount}
      />
    </div>
  );
}
