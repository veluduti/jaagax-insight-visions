import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Loader2, ArrowLeft, ArrowRight, CheckCircle2, Check, Building2, ShieldCheck, User, UserPlus, Mail, Phone,
  Lock, Eye, EyeOff, Home, HelpCircle, MessageCircle, Briefcase, MapPin, Users, BarChart3, CalendarCheck,
  Settings, Rocket, MoreHorizontal, ChevronRight, Pencil, PartyPopper,
} from "lucide-react";
import { initSignupOtp, verifySignupOtp, resendSignupOtp } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { HOSPITALITY_CATEGORIES, CATEGORY_BY_KEY } from "@/config/hospitalityCategories";
import { getExistingAccount, GOOGLE_ALREADY_REGISTERED_MESSAGE } from "@/lib/accountExistence";
import "./partner-register.css";

const STEPS = ["Create Account", "Verify Contact", "Choose Property Type", "Business Profile", "Go to Dashboard"];
const countries = ["India", "United Arab Emirates", "Sri Lanka", "Nepal", "Bhutan", "Singapore", "Thailand"];
const LEGAL_STRUCTURES = ["Individual / Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited", "Trust / Society", "Other"];
const DRAFT_KEY = "partner_register_draft_v2";
const GOOGLE_FLOW_KEY = "partner_register_google";

/** Presentation photos for property types; any new type in the shared config falls back to the default. */
const TYPE_PHOTO: Record<string, string> = {
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=70",
  resort: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=70",
  pg: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=70",
  hostel: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=70",
  coliving: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&q=70",
  serviced_apartment: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=70",
  apartment: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=70",
  villa: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=70",
  homestay: "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=600&q=70",
  farm_stay: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=70",
  luxury: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=70",
  corporate: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=70",
  guest_house: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=70",
  boutique: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=70",
};
const DEFAULT_PHOTO = "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=70";
const TYPE_BLURB: Record<string, string> = {
  hotel: "Rooms, bookings and hotel operations", resort: "Stays, experiences and packages",
  pg: "Beds, residents and rent", hostel: "Beds, residents and rent", coliving: "Managed living and memberships",
  serviced_apartment: "Furnished and extended stays", apartment: "Units and long stays",
  villa: "Private stays and vacation homes", homestay: "Host-managed accommodation",
};

const accountSchema = z.object({
  owner_name: z.string().trim().min(2, "Full name is required").max(100),
  phone: z.string().trim().regex(/^[0-9]{10}$/, "Enter a valid 10-digit mobile number"),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").regex(/[A-Z]/, "Add an uppercase letter")
    .regex(/[a-z]/, "Add a lowercase letter").regex(/[0-9]/, "Add a number").regex(/[^A-Za-z0-9]/, "Add a special character"),
});
const businessSchema = z.object({
  hotel_name: z.string().trim().min(2, "Business / brand name is required").max(120),
  legal_structure: z.string().min(1, "Select the business type"),
  contact_person: z.string().trim().min(2, "Contact person name is required").max(100),
  designation: z.string().trim().max(60),
  country: z.string().min(1, "Select a country"),
  state: z.string().trim().min(2, "State is required").max(80),
  city: z.string().trim().min(2, "City is required").max(80),
  business_phone: z.string().trim().regex(/^[0-9+\-\s]{0,15}$/, "Enter a valid business phone"),
  business_email: z.string().trim().email("Enter a valid business email").max(255).or(z.literal("")),
});

type Form = {
  owner_name: string; phone: string; email: string; password: string; confirm: string;
  property_type: string; hotel_name: string; legal_structure: string; contact_person: string; designation: string;
  country: string; state: string; city: string; business_phone: string; business_email: string;
};
const initialForm: Form = {
  owner_name: "", phone: "", email: "", password: "", confirm: "", property_type: "", hotel_name: "",
  legal_structure: "", contact_person: "", designation: "", country: "India", state: "", city: "",
  business_phone: "", business_email: "",
};

function errMessage(error: any, data: any) {
  return error?.message || data?.error || null;
}

export default function PartnerRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(() => {
    const returnEmail = (location.state as { email?: string } | null)?.email;
    return returnEmail ? { ...initialForm, email: returnEmail } : initialForm;
  });
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [duplicateEmail, setDuplicateEmail] = useState<string | null>(null);
  const [account, setAccount] = useState<{ id: string; email: string } | null>(null);
  const [otp, setOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [showOther, setShowOther] = useState(false);

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const usingAccount = !!account && form.email.trim().toLowerCase() === account.email.toLowerCase();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Save-and-resume: keep everything except the password in this browser tab.
  useEffect(() => {
    const { password, confirm, ...rest } = form;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, form: rest, emailVerified }));
  }, [form, step, emailVerified]);

  const adoptUser = async (user: any): Promise<boolean> => {
    const existing = await getExistingAccount(user.id);
    const meta = (user.user_metadata as any) || {};
    const alreadyPartner = existing.roles.includes("hotel_manager") || existing.profileTypes.includes("hotel_manager");
    if (alreadyPartner && meta.partner_business_profile) {
      setDuplicateEmail(user.email ?? "");
      return false;
    }
    const { data: profiles } = await (supabase as any).from("profiles").select("full_name, phone, city").eq("user_id", user.id).limit(5);
    const pick = (k: string) => (profiles || []).map((p: any) => p?.[k]).find((v: any) => v) || "";
    setAccount({ id: user.id, email: user.email ?? "" });
    setForm((f) => ({
      ...f,
      owner_name: f.owner_name || pick("full_name") || meta.full_name || meta.name || "",
      email: user.email || f.email,
      phone: f.phone || String(pick("phone") || meta.phone || user.phone || "").replace(/^\+?91/, "").replace(/\D/g, "").slice(-10),
      city: f.city || pick("city") || meta.city || "",
    }));
    return true;
  };

  useEffect(() => {
    (async () => {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      const draft = raw ? JSON.parse(raw) : null;
      if (draft?.form) setForm((f) => ({ ...f, ...draft.form }));
      sessionStorage.removeItem(GOOGLE_FLOW_KEY);
      const { data: { user } } = await supabase.auth.getUser();
      if (user && (await adoptUser(user))) {
        setEmailVerified(true);
        if (draft?.step >= 2 && draft.step <= 3) setStep(draft.step);
      } else if (draft?.step === 1 && draft.form?.email) {
        setStep(1);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registerWithGoogle = async () => {
    setGoogleBusy(true);
    try {
      sessionStorage.setItem(GOOGLE_FLOW_KEY, "1");
      const result: any = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/partners/register` });
      if (result?.error) { toast.error(result.error.message || "Google sign-in failed"); return; }
      if (result?.redirected) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (await adoptUser(user)) { setEmailVerified(true); toast.success("Signed in with Google — now verify your mobile details"); }
        else toast.error(GOOGLE_ALREADY_REGISTERED_MESSAGE);
      }
    } catch (e: any) {
      toast.error(e?.message || "Google sign-in failed");
    } finally {
      sessionStorage.removeItem(GOOGLE_FLOW_KEY);
      setGoogleBusy(false);
    }
  };

  const fail = (e: any) => toast.error(e?.errors?.[0]?.message ?? e?.message ?? "Please review the form");

  // Step 1 → create the account (sends the email OTP) or reuse the signed-in account.
  const createAccount = async () => {
    if (busy) return;
    try {
      if (usingAccount) {
        accountSchema.omit({ password: true }).parse(form);
        setEmailVerified(true);
        setStep(2);
        return;
      }
      accountSchema.parse(form);
      if (form.password !== form.confirm) throw new Error("Passwords do not match");
      const local = form.email.split("@")[0]?.toLowerCase() || "";
      if (local && form.password.toLowerCase().includes(local)) throw new Error("Password must not contain your email");
      if (!agree) throw new Error("Please accept the Terms of Service and Privacy Policy");
      setBusy(true);
      // Existing JAAGA account with this password → reuse it instead of creating a duplicate.
      const { data: signIn } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
      if (signIn?.user) {
        if (await adoptUser(signIn.user)) {
          toast.success("Existing JAAGA account found — continuing with it");
          setEmailVerified(true);
          setStep(2);
        }
        return;
      }
      const { data, error } = await initSignupOtp({
        email: form.email.trim(), password: form.password, selectedRole: "hotel_manager", selectedRoles: ["hotel_manager"],
        city: form.city || null, name: form.owner_name.trim(), phone: `+91${form.phone}`,
      });
      let msg = errMessage(error, data);
      try { const b = await (error as any)?.context?.json?.(); if (b?.error) msg = b.error; } catch { /* ignore */ }
      if (msg) {
        if (/already (registered|exists)|already been registered/i.test(msg)) throw new Error("This email already has a JAAGA account. Enter that account's password to continue with it.");
        throw new Error(msg);
      }
      toast.success("Account created — enter the code sent to your email");
      setOtp(""); setAttempts(0); setCooldown(45);
      setStep(1);
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const verifyEmail = async () => {
    if (otp.length < 6 || busy) return;
    if (attempts >= 5) { toast.error("Too many attempts. Request a new code."); return; }
    setBusy(true);
    try {
      const { data, error } = await verifySignupOtp(form.email.trim(), otp);
      const msg = errMessage(error, data);
      if (msg) { setAttempts((a) => a + 1); throw new Error(/expired/i.test(msg) ? "This code has expired. Request a new one." : msg); }
      if (form.password) {
        const { data: s } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (s?.user) setAccount({ id: s.user.id, email: s.user.email ?? "" });
      }
      setEmailVerified(true);
      toast.success("Email verified");
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setCooldown(45); setAttempts(0); setOtp("");
    const { data, error } = await resendSignupOtp(form.email.trim());
    const msg = errMessage(error, data);
    msg ? toast.error(msg) : toast.success("New code sent");
  };

  const continueFromVerify = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please log in with your new account to continue"); navigate("/partners/login"); return; }
    setStep(2);
  };

  const saveBusiness = async () => {
    if (busy) return;
    try {
      const parsed = businessSchema.parse(form);
      setBusy(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session ended. Please log in to finish.");
      const typeLabel = CATEGORY_BY_KEY[form.property_type]?.label ?? form.property_type;
      const profile = { ...parsed, property_type: form.property_type, property_type_label: typeLabel, saved_at: new Date().toISOString() };

      // Partner profile + role on this same account (no duplicate identity).
      const { data: existingProfile } = await (supabase as any).from("profiles").select("id").eq("user_id", user.id).eq("type", "hotel_manager").maybeSingle();
      if (!existingProfile) await (supabase as any).from("profiles").insert({ user_id: user.id, type: "hotel_manager" });
      await (supabase as any).from("user_roles").upsert({ user_id: user.id, role: "hotel_manager" }, { onConflict: "user_id,role" });

      const { data: acct } = await (supabase as any).from("partner_accounts").select("id").eq("owner_user_id", user.id).maybeSingle();
      const acctRow = { display_name: parsed.hotel_name, phone: parsed.business_phone || `+91${form.phone}`, email: parsed.business_email || form.email };
      const { error: acctErr } = acct
        ? await (supabase as any).from("partner_accounts").update(acctRow).eq("id", acct.id)
        : await (supabase as any).from("partner_accounts").insert({ ...acctRow, owner_user_id: user.id });
      if (acctErr) throw new Error(acctErr.message);

      await supabase.auth.updateUser({ data: { partner_business_profile: profile } });
      sessionStorage.setItem("partner_signup_snapshot", JSON.stringify({
        owner_name: form.owner_name, phone: `+91${form.phone}`, email: form.email, hotel_name: parsed.hotel_name,
        company_name: parsed.hotel_name, business_type: typeLabel, business_types: [form.property_type],
        country: parsed.country, state: parsed.state, city: parsed.city,
      }));
      toast.success("Business profile saved");
      setStep(4);
    } catch (e) { fail(e); } finally { setBusy(false); }
  };

  const goDashboard = () => {
    sessionStorage.removeItem(DRAFT_KEY);
    navigate("/partners/dashboard", { replace: true });
  };

  const primaryTypes = useMemo(() => {
    const order = ["hotel", "resort", "pg", "coliving", "serviced_apartment", "villa", "homestay", "hostel"];
    return order.map((k) => HOSPITALITY_CATEGORIES.find((c) => c.key === k)).filter(Boolean) as typeof HOSPITALITY_CATEGORIES;
  }, []);
  const otherTypes = HOSPITALITY_CATEGORIES.filter((c) => !primaryTypes.some((p) => p.key === c.key));
  const selectedType = CATEGORY_BY_KEY[form.property_type];
  const typeLabel = selectedType?.label ?? "your property";
  const typePhoto = TYPE_PHOTO[form.property_type] ?? DEFAULT_PHOTO;

  const left = [
    { title: <>List Your Property on <span className="text-[hsl(var(--js-purple))]">Jaaga Stays</span></>, sub: "Hotels, Resorts, PGs, Hostels, Co-living, Service Apartments, Villas and More.", head: "Why List on Jaaga?", items: ["Reach more guests & residents", "Get bookings and income", "Manage your property digitally", "Secure payments & support"], icons: [BarChart3, CalendarCheck, Settings, ShieldCheck], photo: TYPE_PHOTO.resort },
    { title: <>Verify Your <span className="text-[hsl(var(--js-purple))]">Contact Details</span></>, sub: "We've sent a one-time password (OTP) to your email address. Verify it to continue.", head: "Why Verify?", items: ["Keep your account secure", "Receive important updates", "Enable property listings and payments"], photo: null },
    { title: <>Choose Your <span className="text-[hsl(var(--js-purple))]">Property Type</span></>, sub: "Select the type of property you want to list on Jaaga Stays. You can add more property types later from your dashboard.", head: "Why List on Jaaga?", items: ["Create your property profile", "Get more bookings and residents", "Manage bookings, stays and payments", "Grow your business with Jaaga"], photo: typePhoto },
    { title: <>Set Up Your <span className="text-[hsl(var(--js-purple))]">Business Profile</span></>, sub: `Add your basic business details for your ${typeLabel} operation.`, head: "What We'll Create", items: ["Your Jaaga Partner Profile", `${typeLabel} business setup`, "A dedicated owner dashboard", "You can add property details later"], photo: typePhoto },
    { title: <>You're <span className="text-[hsl(var(--js-purple))]">All Set!</span></>, sub: "Your partner account and business profile are ready.", head: "Next on your dashboard", items: ["Add property details", "Configure rooms, beds or units", "Upload documents & bank details", "Submit for verification and go live"], photo: typePhoto },
  ][step];

  return (
    <div className="js-register min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[hsl(var(--js-line))] bg-[hsl(var(--js-white))]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
          <Link to="/partners" className="flex items-center gap-3">
            <Home className="h-7 w-7 text-[hsl(var(--js-purple))]" />
            <span className="text-lg font-extrabold tracking-tight">JAAGA <span className="text-[hsl(var(--js-purple))]">STAYS</span></span>
            <span className="hidden h-6 w-px bg-[hsl(var(--js-line))] sm:block" />
            <span className="hidden font-semibold sm:block">List Your Property</span>
          </Link>
          <div className="flex gap-2">
            <a href="mailto:support@jaagax.com" className="hidden items-center gap-1.5 rounded-lg border border-[hsl(var(--js-purple))] px-3 py-1.5 text-sm font-semibold sm:inline-flex"><HelpCircle className="h-4 w-4" /> Need Help?</a>
            <a href="https://wa.me/?text=Jaaga%20Stays%20partner%20support" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-[hsl(var(--js-purple))] px-3 py-1.5 text-sm font-semibold text-[hsl(var(--js-purple))]"><MessageCircle className="h-4 w-4" /> Chat with Support</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <nav aria-label="Registration progress" className="mx-auto mb-6 overflow-x-auto">
          <ol className="mx-auto flex w-max items-center gap-2 rounded-full bg-[hsl(var(--js-white))] p-1.5 shadow-sm">
            {STEPS.map((label, i) => {
              const done = i < step, active = i === step;
              return (
                <li key={label} className="flex items-center gap-2">
                  <span aria-current={active ? "step" : undefined} className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold ${active ? "js-grad" : done ? "bg-[hsl(var(--js-ok-soft))]" : ""}`}>
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${done ? "border-[hsl(var(--js-ok))] bg-[hsl(var(--js-ok))] text-[hsl(var(--js-white))]" : active ? "border-[hsl(var(--js-white))]" : "border-[hsl(var(--js-line))]"}`}>
                      {done ? <Check className="h-4 w-4" /> : i + 1}
                    </span>
                    <span className="hidden md:inline">{label}</span>
                  </span>
                  {i < STEPS.length - 1 && <span className={`h-0.5 w-6 md:w-12 ${done ? "bg-[hsl(var(--js-purple))]" : "bg-[hsl(var(--js-line))]"}`} />}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
          <aside className="js-panel hidden overflow-hidden rounded-3xl p-7 lg:block">
            <h1 className="text-4xl font-extrabold leading-tight">{left.title}</h1>
            <p className="mt-3 text-[hsl(var(--js-muted))]">{left.sub}</p>
            {left.photo ? (
              <div className="relative mt-5 overflow-hidden rounded-2xl">
                <img src={left.photo} alt="" className="h-48 w-full object-cover" onError={(e) => ((e.currentTarget as HTMLImageElement).src = DEFAULT_PHOTO)} />
                {step >= 2 && selectedType && (
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--js-white))] px-3 py-1.5 text-sm font-bold"><span aria-hidden>{selectedType.emoji}</span>{selectedType.label}</span>
                )}
              </div>
            ) : (
              <div className="mt-6 flex h-44 items-center justify-center rounded-2xl bg-[hsl(var(--js-white))]/60">
                <ShieldCheck className="h-24 w-24 text-[hsl(var(--js-purple))]" />
              </div>
            )}
            <div className="mt-5 rounded-2xl bg-[hsl(var(--js-white))]/80 p-5">
              <p className="mb-3 font-bold">{left.head}</p>
              <ul className="space-y-2.5 text-sm">
                {left.items.map((t, i) => {
                  const Icon = (left as any).icons?.[i] ?? CheckCircle2;
                  return <li key={t} className="flex items-center gap-2.5"><Icon className={`h-5 w-5 ${(left as any).icons ? "text-[hsl(var(--js-purple))]" : "text-[hsl(var(--js-ok))]"}`} />{t}</li>;
                })}
              </ul>
            </div>
          </aside>

          <section className="rounded-3xl border border-[hsl(var(--js-line))] bg-[hsl(var(--js-white))] p-5 shadow-sm sm:p-8">
            {step === 0 && (
              <form onSubmit={(e) => { e.preventDefault(); createAccount(); }} noValidate>
                <Heading icon={UserPlus} title="Create Your Jaaga Account" sub="Get started in less than a minute and list your property." />
                {duplicateEmail && (
                  <div role="alert" className="mb-4 rounded-xl border border-[hsl(var(--js-purple))]/40 bg-[hsl(var(--js-lavender))] p-4 text-sm">
                    <p className="font-semibold">{duplicateEmail} already has a Jaaga partner account.</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" className="js-grad rounded-lg px-3 py-1.5 font-semibold" onClick={() => navigate("/partners/login")}>Log In</button>
                      <button type="button" className="rounded-lg border px-3 py-1.5" onClick={async () => { await supabase.auth.signOut(); setDuplicateEmail(null); setAccount(null); }}>Use a different account</button>
                    </div>
                  </div>
                )}
                {account && usingAccount && (
                  <p className="mb-4 rounded-xl bg-[hsl(var(--js-ok-soft))] p-3 text-sm">Continuing with your JAAGA account <b>{account.email}</b> — no new password needed.</p>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <IconField className="sm:col-span-2" id="owner_name" label="Full Name" icon={User} value={form.owner_name} onChange={set("owner_name")} placeholder="Enter your full name" autoComplete="name" required />
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-sm font-semibold">Mobile Number <span className="text-destructive">*</span></label>
                    <div className="js-input flex h-11 items-center overflow-hidden rounded-xl border">
                      <span className="flex h-full items-center gap-1 border-r border-[hsl(var(--js-line))] px-3 text-sm font-semibold">🇮🇳 +91</span>
                      <input id="phone" inputMode="numeric" autoComplete="tel-national" maxLength={10} className="h-full flex-1 bg-transparent px-3 text-sm outline-none" placeholder="Enter mobile number" value={form.phone} onChange={(e) => set("phone")(e.target.value.replace(/\D/g, "").slice(0, 10))} />
                    </div>
                  </div>
                  <IconField id="email" label="Email Address" icon={Mail} type="email" value={form.email} onChange={set("email")} placeholder="Enter email address" autoComplete="email" required />
                  {!usingAccount && (
                    <>
                      <IconField id="password" label="Create Password" icon={Lock} type={showPw ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="Create a password" autoComplete="new-password" required
                        trailing={<button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((s) => !s)}>{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} />
                      <IconField id="confirm" label="Confirm Password" icon={Lock} type={showPw ? "text" : "password"} value={form.confirm} onChange={set("confirm")} placeholder="Confirm your password" autoComplete="new-password" required />
                      {form.password && <PasswordHints password={form.password} confirm={form.confirm} />}
                    </>
                  )}
                </div>
                <p className="mt-4 flex items-center gap-2 rounded-xl bg-[hsl(var(--js-ok-soft))] px-4 py-3 text-sm"><ShieldCheck className="h-5 w-5 text-[hsl(var(--js-ok))]" /> Your account will be used to manage your property, bookings and payments securely.</p>
                {!usingAccount && (
                  <label className="mt-4 flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-5 w-5 accent-[hsl(var(--js-purple))]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                    I agree to the <Link to="/terms" className="font-semibold text-[hsl(var(--js-purple))] underline">Terms of Service</Link> and <Link to="/privacy" className="font-semibold text-[hsl(var(--js-purple))] underline">Privacy Policy</Link>.
                  </label>
                )}
                <PrimaryButton busy={busy} type="submit">Create Account & Continue</PrimaryButton>
                {!account && (
                  <button type="button" disabled={googleBusy} onClick={registerWithGoogle} className="mt-3 flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[#747775] bg-[#FFFFFF] px-3 text-sm font-medium text-[#1F1F1F]">
                    {googleBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleLogo />} Continue with Google
                  </button>
                )}
                <p className="mt-4 text-center text-sm">Already have an account? <Link to="/partners/login" className="font-semibold text-[hsl(var(--js-purple))] underline">Log In</Link></p>
              </form>
            )}

            {step === 1 && (
              <div>
                <Heading icon={ShieldCheck} title="Verify Your Contact" sub="Enter the OTP sent to your email address." />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-[hsl(var(--js-line))] p-5">
                    <CardHead icon={Mail} title="Email Verification" status={emailVerified ? "Verified" : undefined}>OTP sent to <b className="text-[hsl(var(--js-purple))]">{form.email}</b></CardHead>
                    {!emailVerified && (
                      <>
                        <div className="my-5 flex justify-center">
                          <InputOTP maxLength={6} value={otp} onChange={(v) => setOtp(v.replace(/\D/g, ""))} onComplete={() => undefined} aria-label="Email verification code">
                            <InputOTPGroup>{Array.from({ length: 6 }).map((_, i) => <InputOTPSlot key={i} index={i} className="h-11 w-10 text-lg" />)}</InputOTPGroup>
                          </InputOTP>
                        </div>
                        <button type="button" onClick={verifyEmail} disabled={busy || otp.length < 6} className="js-grad flex h-10 w-full items-center justify-center rounded-xl text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify Email"}</button>
                        <p className="mt-3 text-center text-sm">
                          {cooldown > 0 ? <>Resend OTP in <b className="text-[hsl(var(--js-purple))]">00:{String(cooldown).padStart(2, "0")}</b></> : <button type="button" className="font-semibold text-[hsl(var(--js-purple))] underline" onClick={resend}>Resend OTP</button>}
                        </p>
                        {attempts > 0 && <p className="mt-1 text-center text-xs text-destructive">{Math.max(0, 5 - attempts)} attempts left</p>}
                      </>
                    )}
                  </div>
                  <div className="rounded-2xl border border-[hsl(var(--js-line))] p-5">
                    <CardHead icon={Phone} title="Mobile Number" status={undefined}>Saved as <b className="text-[hsl(var(--js-purple))]">+91 {form.phone}</b></CardHead>
                    <p className="mt-4 text-sm text-[hsl(var(--js-muted))]">Your mobile number is checked by SMS during document verification, before your property goes live.</p>
                  </div>
                </div>
                {emailVerified && <p className="mt-5 flex items-center gap-2 rounded-xl bg-[hsl(var(--js-ok-soft))] px-4 py-3 font-semibold"><CheckCircle2 className="h-6 w-6 text-[hsl(var(--js-ok))]" /> Email verified successfully!</p>}
                <PrimaryButton busy={false} disabled={!emailVerified} onClick={continueFromVerify}>Continue to Choose Property Type</PrimaryButton>
                <button type="button" onClick={() => { setStep(0); setEmailVerified(false); }} className="mx-auto mt-4 flex items-center gap-2 text-sm font-semibold text-[hsl(var(--js-purple))] underline"><ArrowLeft className="h-4 w-4" /> Change Contact Details</button>
              </div>
            )}

            {step === 2 && (
              <div>
                <Heading icon={Users} title="Choose Property Type" sub="What kind of property are you listing first?" />
                <div role="radiogroup" aria-label="Property type" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {(showOther ? [...primaryTypes, ...otherTypes] : primaryTypes).map((c) => {
                    const on = form.property_type === c.key;
                    return (
                      <button key={c.key} type="button" role="radio" aria-checked={on} onClick={() => set("property_type")(c.key)}
                        className={`relative overflow-hidden rounded-2xl border-2 text-left transition ${on ? "border-[hsl(var(--js-purple))] shadow-md" : "border-[hsl(var(--js-line))] hover:border-[hsl(var(--js-purple))]/50"}`}>
                        <img src={TYPE_PHOTO[c.key] ?? DEFAULT_PHOTO} alt="" loading="lazy" className="h-24 w-full object-cover" onError={(e) => ((e.currentTarget as HTMLImageElement).src = DEFAULT_PHOTO)} />
                        {on && <span className="js-grad absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full"><Check className="h-4 w-4" /></span>}
                        <span className="flex items-start gap-2 p-3">
                          <span className="text-xl" aria-hidden>{c.emoji}</span>
                          <span><span className="block font-bold">{c.label}</span><span className="block text-xs text-[hsl(var(--js-muted))]">{TYPE_BLURB[c.key] ?? `${c.defaultUnit === "bed" ? "Beds" : c.defaultUnit === "unit" ? "Units" : "Rooms"} and stays`}</span></span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!showOther && (
                  <button type="button" onClick={() => setShowOther(true)} className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-[hsl(var(--js-lavender))] px-4 py-3 text-left">
                    <MoreHorizontal className="h-6 w-6" />
                    <span className="flex-1"><b className="block">Other</b><span className="text-sm text-[hsl(var(--js-muted))]">{otherTypes.map((o) => o.label).join(", ")}</span></span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
                <p className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl bg-[hsl(var(--js-lavender))] px-4 py-3 text-sm">
                  Selected Property Type: <b className="text-lg text-[hsl(var(--js-purple))]">{selectedType?.label ?? "None yet"}</b>
                  <span className="ml-auto flex items-center gap-1"><Check className="h-4 w-4 text-[hsl(var(--js-purple))]" /> You can add more property types later from your dashboard.</span>
                </p>
                <NavRow onBack={() => setStep(1)} onNext={() => (form.property_type ? setStep(3) : toast.error("Select a property type"))} label="Continue to Business Profile" />
              </div>
            )}

            {step === 3 && (
              <form onSubmit={(e) => { e.preventDefault(); saveBusiness(); }} noValidate>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Heading icon={Briefcase} title="Business Profile" sub="Basic details of your business / organization." />
                  <button type="button" onClick={() => setStep(2)} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--js-lavender))] px-4 py-2 text-sm">
                    Selected Property Type: <b className="text-[hsl(var(--js-purple))]">{typeLabel}</b> <Pencil className="h-4 w-4" aria-label="Change property type" />
                  </button>
                </div>
                <Section n={1} title="Business Information">
                  <IconField id="hotel_name" label="Business / Brand Name" icon={Building2} value={form.hotel_name} onChange={set("hotel_name")} placeholder={`Enter your business or brand name`} required />
                  <div className="space-y-1.5">
                    <label htmlFor="legal" className="text-sm font-semibold">Business Type (Legal Structure) <span className="text-destructive">*</span></label>
                    <select id="legal" value={form.legal_structure} onChange={(e) => set("legal_structure")(e.target.value)} className="js-input h-11 w-full rounded-xl border px-3 text-sm">
                      <option value="">Select business type</option>
                      {LEGAL_STRUCTURES.map((l) => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <IconField id="contact_person" label="Contact Person Name" icon={User} value={form.contact_person} onChange={set("contact_person")} placeholder="Enter authorized contact person name" required />
                  <IconField id="designation" label="Designation / Role" icon={Users} value={form.designation} onChange={set("designation")} placeholder="e.g., Owner, Manager, Partner" />
                </Section>
                <Section n={2} title="Business Location" cols="sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label htmlFor="country" className="text-sm font-semibold">Country <span className="text-destructive">*</span></label>
                    <select id="country" value={form.country} onChange={(e) => set("country")(e.target.value)} className="js-input h-11 w-full rounded-xl border px-3 text-sm">
                      {countries.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <IconField id="state" label="State" icon={MapPin} value={form.state} onChange={set("state")} placeholder="Enter state" required />
                  <IconField id="city" label="City" icon={Building2} value={form.city} onChange={set("city")} placeholder="Enter city" required />
                </Section>
                <Section n={3} title="Business Contact" optional>
                  <IconField id="business_phone" label="Business Phone (Optional)" icon={Phone} value={form.business_phone} onChange={set("business_phone")} placeholder="Enter landline or business number" />
                  <IconField id="business_email" label="Business Email (Optional)" icon={Mail} type="email" value={form.business_email} onChange={set("business_email")} placeholder="Enter business email (if different)" />
                </Section>
                <NavRow onBack={() => setStep(2)} submit busy={busy} label="Save & Continue to Dashboard" />
              </form>
            )}

            {step === 4 && (
              <div className="py-6 text-center">
                <div className="js-grad mx-auto flex h-20 w-20 items-center justify-center rounded-full"><PartyPopper className="h-10 w-10" /></div>
                <h2 className="mt-5 text-3xl font-extrabold">Business Profile Saved Successfully!</h2>
                <p className="mt-2 text-[hsl(var(--js-muted))]"><b>{form.hotel_name}</b> is set up as a <b>{typeLabel}</b> partner. Your dashboard is ready.</p>
                <ul className="mx-auto mt-6 grid max-w-xl gap-2 text-left sm:grid-cols-2">
                  {["Account created", "Email verified", `${typeLabel} selected`, "Business profile saved"].map((t) => (
                    <li key={t} className="flex items-center gap-2 rounded-xl bg-[hsl(var(--js-ok-soft))] px-3 py-2 text-sm font-medium"><CheckCircle2 className="h-5 w-5 text-[hsl(var(--js-ok))]" />{t}</li>
                  ))}
                </ul>
                <PrimaryButton busy={false} onClick={goDashboard}>Go to Dashboard</PrimaryButton>
                <p className="mt-3 text-sm text-[hsl(var(--js-muted))]">Next: add property details, rooms, documents and bank details to go live.</p>
                <Rocket className="mx-auto mt-4 h-6 w-6 text-[hsl(var(--js-purple))]" aria-hidden />
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Heading({ icon: Icon, title, sub }: { icon: any; title: string; sub: string }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--js-lavender))]"><Icon className="h-8 w-8 text-[hsl(var(--js-purple))]" /></span>
      <div><h2 className="text-2xl font-extrabold sm:text-3xl">{title}</h2><p className="text-[hsl(var(--js-muted))]">{sub}</p></div>
    </div>
  );
}

function CardHead({ icon: Icon, title, status, children }: { icon: any; title: string; status?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--js-lavender))]"><Icon className="h-6 w-6 text-[hsl(var(--js-purple))]" /></span>
      <div className="min-w-0 flex-1"><p className="font-bold">{title}</p><p className="truncate text-sm">{children}</p></div>
      {status && <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--js-ok-soft))] px-2 py-1 text-xs font-semibold"><CheckCircle2 className="h-4 w-4 text-[hsl(var(--js-ok))]" />{status}</span>}
    </div>
  );
}

function Section({ n, title, optional, cols = "sm:grid-cols-2", children }: { n: number; title: string; optional?: boolean; cols?: string; children: React.ReactNode }) {
  return (
    <fieldset className="mb-4 rounded-2xl border border-[hsl(var(--js-line))] p-4">
      <legend className="flex items-center gap-2 px-1 font-bold"><span className="js-grad flex h-7 w-7 items-center justify-center rounded-full text-sm">{n}</span>{title}{optional && <span className="font-normal">(Optional)</span>}</legend>
      <div className={`grid gap-4 ${cols}`}>{children}</div>
    </fieldset>
  );
}

function IconField({ id, label, icon: Icon, onChange, required, trailing, className = "", ...rest }: { id: string; label: string; icon: any; onChange: (v: string) => void; required?: boolean; trailing?: React.ReactNode; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold">{label} {required && <span className="text-destructive">*</span>}</label>
      <div className="js-input flex h-11 items-center gap-2 rounded-xl border px-3">
        <Icon className="h-5 w-5 shrink-0 text-[hsl(var(--js-muted))]" aria-hidden />
        <input id={id} {...rest} onChange={(e) => onChange(e.target.value)} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none" />
        {trailing}
      </div>
    </div>
  );
}

function PrimaryButton({ busy, children, ...rest }: { busy: boolean; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest} disabled={busy || rest.disabled} className="js-grad mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold shadow-md disabled:opacity-50">
      {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{children} <ArrowRight className="h-5 w-5" /></>}
    </button>
  );
}

function NavRow({ onBack, onNext, label, submit, busy = false }: { onBack: () => void; onNext?: () => void; label: string; submit?: boolean; busy?: boolean }) {
  return (
    <div className="mt-6 flex gap-4">
      <button type="button" onClick={onBack} className="flex h-12 items-center gap-2 rounded-xl border-2 border-[hsl(var(--js-purple))] px-6 font-semibold text-[hsl(var(--js-purple))]"><ArrowLeft className="h-5 w-5" /> Back</button>
      <button type={submit ? "submit" : "button"} onClick={onNext} disabled={busy} className="js-grad flex h-12 flex-1 items-center justify-center gap-2 rounded-xl font-semibold disabled:opacity-50">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{label} <ArrowRight className="h-5 w-5" /></>}
      </button>
    </div>
  );
}

function PasswordHints({ password, confirm }: { password: string; confirm: string }) {
  const checks = [
    ["8+ characters", password.length >= 8], ["Uppercase", /[A-Z]/.test(password)], ["Lowercase", /[a-z]/.test(password)],
    ["Number", /[0-9]/.test(password)], ["Special character", /[^A-Za-z0-9]/.test(password)], ["Passwords match", !!confirm && confirm === password],
  ] as const;
  return (
    <ul className="grid grid-cols-2 gap-1 text-xs sm:col-span-2 sm:grid-cols-3">
      {checks.map(([l, ok]) => <li key={l} className={`flex items-center gap-1 ${ok ? "text-[hsl(var(--js-ok))]" : "text-[hsl(var(--js-muted))]"}`}><CheckCircle2 className={`h-3.5 w-3.5 ${ok ? "" : "opacity-30"}`} />{l}</li>)}
    </ul>
  );
}

function GoogleLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
  );
}
