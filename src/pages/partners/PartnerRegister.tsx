import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Building2, ShieldCheck, User2, Landmark } from "lucide-react";
import PartnerNav from "@/components/partners/PartnerNav";
import { initSignupOtp } from "@/services/authService";

const steps = [
  { key: "account", label: "Account", icon: User2 },
  { key: "business", label: "Business", icon: Building2 },
  { key: "compliance", label: "Compliance", icon: Landmark },
  { key: "verify", label: "Verify", icon: ShieldCheck },
];

const businessTypes = ["Independent Hotel", "Boutique Hotel", "Resort", "Homestay / B&B", "Serviced Apartments", "Hostel", "Chain / Group"];
const countries = ["India", "United Arab Emirates", "Sri Lanka", "Nepal", "Bhutan", "Singapore", "Thailand"];

const step1Schema = z.object({
  owner_name: z.string().trim().min(2, "Owner name is required").max(100),
  phone: z.string().trim().regex(/^\+?[0-9]{10,14}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters"),
});
const step2Schema = z.object({
  hotel_name: z.string().trim().min(2).max(120),
  company_name: z.string().trim().max(150).optional().or(z.literal("")),
  business_type: z.string().min(1, "Select a business type"),
  country: z.string().min(1),
  state: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
});
const step3Schema = z.object({
  gst_number: z.string().trim().max(20).optional().or(z.literal("")),
  pan_number: z.string().trim().max(10).optional().or(z.literal("")),
  num_hotels: z.coerce.number().int().min(1).max(500),
  num_rooms_total: z.coerce.number().int().min(1).max(10000),
});

type FormData = {
  owner_name: string; phone: string; email: string; password: string;
  hotel_name: string; company_name: string; business_type: string;
  country: string; state: string; city: string;
  gst_number: string; pan_number: string; num_hotels: number; num_rooms_total: number;
};

const initialForm: FormData = {
  owner_name: "", phone: "+91", email: "", password: "",
  hotel_name: "", company_name: "", business_type: "",
  country: "India", state: "", city: "",
  gst_number: "", pan_number: "", num_hotels: 1, num_rooms_total: 10,
};

export default function PartnerRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof FormData) => (v: any) => setForm((f) => ({ ...f, [k]: v }));

  const next = () => {
    try {
      if (step === 0) step1Schema.parse(form);
      if (step === 1) step2Schema.parse(form);
      if (step === 2) step3Schema.parse(form);
      setStep((s) => Math.min(s + 1, steps.length - 1));
      if (step === 2) submit();
    } catch (e: any) {
      const msg = e?.errors?.[0]?.message ?? "Please review the form";
      toast.error(msg);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      // Persist the form snapshot so KYC step can prefill after login
      sessionStorage.setItem("partner_signup_snapshot", JSON.stringify(form));
      const { data, error } = await initSignupOtp({
        email: form.email,
        password: form.password,
        selectedRole: "hotel_manager",
        selectedRoles: ["hotel_manager"],
        city: form.city,
        name: form.owner_name,
        phone: form.phone,
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error || "Signup failed");
      toast.success("Verification code sent to your email");
      navigate("/partners/verify-otp", { state: { email: form.email } });
    } catch (e: any) {
      toast.error(e.message || "Could not start signup");
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-950/20">
      <PartnerNav />
      <div className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/partners" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <p className="text-sm text-muted-foreground">
            Already have an account? <Link to="/partners/login" className="text-emerald-400 hover:underline">Log in</Link>
          </p>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">List your property on JAAGA X</h1>
          <p className="mt-1 text-muted-foreground">Takes 2 minutes. Live within 24 hours.</p>
        </div>

        {/* stepper */}
        <div className="mb-6">
          <Progress value={progress} className="h-1.5" />
          <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
            {steps.map((s, i) => (
              <div key={s.key} className={i <= step ? "text-emerald-400" : "text-muted-foreground"}>
                <s.icon className="mx-auto mb-1 h-4 w-4" />
                {s.label}
              </div>
            ))}
          </div>
        </div>

        <Card className="border border-emerald-500/20 bg-background/70 backdrop-blur">
          <CardContent className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
                {step === 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Owner name" value={form.owner_name} onChange={set("owner_name")} />
                    <Field label="Mobile" type="tel" value={form.phone} onChange={set("phone")} />
                    <Field label="Email" type="email" value={form.email} onChange={set("email")} />
                    <Field label="Password" type="password" value={form.password} onChange={set("password")} hint="Minimum 8 characters" />
                  </div>
                )}

                {step === 1 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Hotel name" value={form.hotel_name} onChange={set("hotel_name")} />
                    <Field label="Company name (optional)" value={form.company_name} onChange={set("company_name")} />
                    <div className="space-y-1.5">
                      <Label>Business type</Label>
                      <Select value={form.business_type} onValueChange={set("business_type")}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {businessTypes.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Country</Label>
                      <Select value={form.country} onValueChange={set("country")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Field label="State" value={form.state} onChange={set("state")} />
                    <Field label="City" value={form.city} onChange={set("city")} />
                  </div>
                )}

                {step === 2 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="GST number (optional)" value={form.gst_number} onChange={set("gst_number")} />
                    <Field label="PAN number (optional)" value={form.pan_number} onChange={set("pan_number")} />
                    <Field label="Number of hotels" type="number" value={form.num_hotels as any} onChange={(v) => set("num_hotels")(Number(v))} />
                    <Field label="Total number of rooms" type="number" value={form.num_rooms_total as any} onChange={(v) => set("num_rooms_total")(Number(v))} />
                    <p className="sm:col-span-2 rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                      Documents (GST, PAN, trade license, cancelled cheque, etc.) will be requested after email verification.
                    </p>
                  </div>
                )}

                {step === 3 && (
                  <div className="py-10 text-center">
                    {submitting ? (
                      <>
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-400" />
                        <p className="mt-3 text-sm text-muted-foreground">Sending verification code…</p>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                        <p className="mt-3 font-semibold">Almost there!</p>
                        <p className="mt-1 text-sm text-muted-foreground">Check your email for the verification code.</p>
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || submitting}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              {step < 3 && (
                <Button onClick={next} disabled={submitting} className="bg-emerald-500 text-white hover:bg-emerald-600">
                  {step === 2 ? "Send code" : "Continue"} <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement> & { onChange: (v: any) => void }) {
  const { onChange, value, ...rest } = props as any;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
