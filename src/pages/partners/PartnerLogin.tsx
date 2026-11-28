import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, BarChart3, Building2, CalendarDays, CheckCircle2, ConciergeBell, Crown, Eye, EyeOff, HeartHandshake, Hotel, LayoutDashboard, LineChart, Loader2, Lock, Network, PartyPopper, Receipt, ShoppingCart, Sparkles, User as UserIcon, UserCog, Users, UtensilsCrossed, Wallet, Wrench } from "lucide-react";
import heroAsset from "@/assets/partner_login_resort_dashboards.png.asset.json";
import roleOwner from "@/assets/role_owner.png.asset.json";
import roleFrontDesk from "@/assets/role_front_desk.png.asset.json";
import roleHousekeeping from "@/assets/role_housekeeping.png.asset.json";
import roleMaintenance from "@/assets/role_maintenance.png.asset.json";
import roleFinance from "@/assets/role_finance.png.asset.json";
import roleHr from "@/assets/role_hr.png.asset.json";
import roleEvents from "@/assets/role_events.png.asset.json";
import PartnerNav from "@/components/partners/PartnerNav";
import PartnerLoginHighlights from "@/components/partners/PartnerLoginHighlights";
import { signInWithPassword } from "@/services/authService";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export default function PartnerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const routeAfterLogin = async (uid: string) => {
    const { data: apps } = await (supabase as any)
      .from("hotel_partner_applications")
      .select("id,status,pms_setup_completed")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1);
    const app = apps?.[0];
    if (!app) navigate("/partners/kyc");
    else if (app.status === "approved") navigate(app.pms_setup_completed ? "/partners/dashboard" : "/partners/pms-setup");
    else navigate("/partners/status");
  };

  // Returning from the Google redirect on this page.
  useEffect(() => {
    if (sessionStorage.getItem("partner_login_google") !== "1") return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      sessionStorage.removeItem("partner_login_google");
      if (!user) return;
      toast.success("Welcome back!");
      await routeAfterLogin(user.id);
    })();
  }, []);

  const loginWithGoogle = async () => {
    setGoogleBusy(true);
    try {
      sessionStorage.setItem("partner_login_google", "1");
      const result: any = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/partners/login`,
      });
      if (result?.error) {
        sessionStorage.removeItem("partner_login_google");
        toast.error(result.error.message || "Google sign-in failed");
        return;
      }
      if (result?.redirected) return;
      const { data: { user } } = await supabase.auth.getUser();
      sessionStorage.removeItem("partner_login_google");
      if (user) {
        toast.success("Welcome back!");
        await routeAfterLogin(user.id);
      }
    } catch (e: any) {
      sessionStorage.removeItem("partner_login_google");
      toast.error(e?.message || "Google sign-in failed");
    } finally {
      setGoogleBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await signInWithPassword(email.trim(), password);
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid) throw new Error("Login failed");

      toast.success("Welcome back!");
      await routeAfterLogin(uid);
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const [tab, setTab] = useState<"admin" | "employee">("admin");
  const [showPw, setShowPw] = useState(false);
  const [propertyRef, setPropertyRef] = useState("");

  const openPropertyLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const ref = propertyRef.trim().toLowerCase();
    if (!/^[a-z0-9-]{4,}$/.test(ref)) {
      toast.error("Enter your Property ID, for example JGX-HOT-00001");
      return;
    }
    navigate(`/property/${ref}/login`);
  };

  const modules = [
    { icon: LayoutDashboard, t: "PMS", s: "Hotel Operations", c: "from-indigo-500 to-violet-600" },
    { icon: Users, t: "CRM", s: "Guests & Loyalty", c: "from-pink-500 to-fuchsia-600" },
    { icon: Network, t: "Channel Manager", s: "OTA & Distribution", c: "from-blue-500 to-indigo-600" },
    { icon: ShoppingCart, t: "POS (F&B)", s: "Restaurant & Bar", c: "from-orange-400 to-orange-600" },
    { icon: PartyPopper, t: "Events & Banquets", s: "Weddings, Meetings", c: "from-rose-400 to-pink-600" },
    { icon: UserCog, t: "HR & Payroll", s: "Staff, Attendance, Salaries", c: "from-red-400 to-rose-600", isNew: true },
    { icon: Wallet, t: "Finance", s: "Billing, GST, Reconciliation", c: "from-indigo-500 to-blue-700" },
    { icon: LineChart, t: "Revenue (RMS)", s: "Rates & Demand", c: "from-teal-400 to-cyan-600" },
    { icon: HeartHandshake, t: "Guest Experience", s: "StayPass, Services", c: "from-fuchsia-500 to-purple-600" },
    { icon: BarChart3, t: "Reports & Analytics", s: "Insights & Growth", c: "from-violet-500 to-purple-700" },
  ];
  const roles = [
    { icon: Crown, t: "Hotel Owner / Admin", s: "Full Access", img: roleOwner },
    { icon: ConciergeBell, t: "Front Desk", s: "Reservations, Check-in/out", img: roleFrontDesk },
    { icon: Sparkles, t: "Housekeeping", s: "Room Status, Cleaning", img: roleHousekeeping },
    { icon: Wrench, t: "Maintenance", s: "Work Orders, Repairs", img: roleMaintenance },
    { icon: UtensilsCrossed, t: "F&B / Restaurant", s: "Orders, KOT, Billing", img: roleEvents },
    { icon: Receipt, t: "Finance / Cashier", s: "Billing, Reconciliation", img: roleFinance },
    { icon: UserCog, t: "HR & Payroll", s: "Attendance, Salaries, Leaves", img: roleHr },
    { icon: CalendarDays, t: "Events & Banquets", s: "Venues, Bookings", img: roleEvents },
  ];
  const hr = ["Employee Records & Profiles", "Salaries & Payroll", "Attendance (Biometric / App)", "Allowances & Deductions", "Shifts & Rosters", "Loan & Advances", "Leave Management", "Payslips & Tax (TDS/EPF/ESI)"];
  const tabs = [
    { k: "admin" as const, l: "Property / Admin" },
    { k: "employee" as const, l: "Employee / Team" },
  ];

  return (
    <div className="min-h-screen bg-[hsl(250_60%_97%)]">
      <PartnerNav />
      <div className="relative overflow-hidden">
        <img src={heroAsset.url} alt="" aria-hidden="true" className="absolute inset-x-0 top-0 h-[600px] w-full object-cover object-right" />
        <div className="absolute inset-x-0 top-0 h-[600px] bg-gradient-to-r from-[hsl(255_70%_14%/0.92)] via-[hsl(260_65%_22%/0.55)] to-transparent" />
        <div className="absolute inset-x-0 top-[520px] h-20 bg-gradient-to-b from-transparent to-[hsl(250_60%_97%)]" />
        <div className="relative mx-auto grid max-w-[1400px] gap-5 px-4 py-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="relative min-h-[420px] pt-2 text-white">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1 text-sm"><Crown className="h-4 w-4 text-amber-300" /> All-in-One Hospitality Platform</span>
              <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight md:text-4xl xl:text-5xl">
                Run Your Hotel, Stays, Dining, Events and Team — <span className="text-[hsl(265_90%_78%)]">All in One</span>
              </h1>
              <p className="mt-3 max-w-xl text-white/90">PMS + CRM + Channel Manager + POS + HR & Payroll + Finance + Events + Guest Experience on a single, AI-powered platform.</p>
              <ul className="mt-4 space-y-2">
                {["Increase Occupancy & Revenue", "Automate Daily Operations", "Manage Staff, Attendance & Salaries", "Delight Your Guests"].map((x) => (
                  <li key={x} className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 fill-emerald-500 text-white" /> {x}</li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild className="h-11 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 px-6 text-white"><Link to="/partners/register">Get Started Free <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
                <Button asChild variant="outline" className="h-11 rounded-xl border-white/60 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"><Link to="/partners/partner-with-jaaga"><CalendarDays className="mr-1 h-4 w-4" /> Book a Demo</Link></Button>
              </div>
              <Link to="/partners/resources" className="absolute bottom-2 right-[30%] hidden max-w-[230px] items-center gap-3 rounded-2xl border border-white/30 bg-gradient-to-br from-violet-600/90 to-purple-800/90 p-3 shadow-xl backdrop-blur xl:flex">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-violet-700"><Sparkles className="h-5 w-5" /></span>
                <span><span className="block text-sm font-bold">Ask Jaaga AI</span><span className="block text-[11px] leading-tight text-white/85">"Show today's arrivals, rooms to clean and staff on duty."</span></span>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/60 bg-white/90 p-2 shadow-xl backdrop-blur sm:grid-cols-5 2xl:grid-cols-10">
              {modules.map((m) => (
                <div key={m.t} className={`relative rounded-xl border p-2 text-center transition hover:-translate-y-0.5 hover:shadow-md ${m.isNew ? "border-rose-200 bg-rose-50/60" : "border-violet-100 bg-white"}`}>
                  {m.isNew && <span className="absolute -top-2 right-1 rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">New</span>}
                  <div className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${m.c} text-white shadow-md`}><m.icon className="h-5 w-5" /></div>
                  <p className="mt-1 text-xs font-semibold text-slate-900">{m.t}</p>
                  <p className="text-[10px] leading-tight text-slate-500">{m.s}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow">
              <div className="grid gap-3 2xl:grid-cols-[180px_1fr] lg:items-center">
              <div className="flex items-start gap-2"><Users className="h-7 w-7 shrink-0 text-violet-600" /><div><h2 className="text-lg font-bold leading-tight text-violet-800">Role-Based Workspaces</h2><p className="text-xs text-slate-600">Right Access for Every Team</p></div></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 2xl:grid-cols-8">
                {roles.map((r) => (
                  <div key={r.t} className="overflow-hidden rounded-xl border border-violet-100 bg-gradient-to-b from-violet-50 to-white p-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="relative">
                      <img src={r.img.url} alt={`${r.t} workspace`} loading="lazy" className="h-24 w-full rounded-lg object-cover object-top" />
                      <span className="absolute -bottom-3 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-violet-600 text-white shadow-md"><r.icon className="h-4 w-4" /></span>
                    </div>
                    <p className="mt-4 text-xs font-semibold text-slate-900">{r.t}</p>
                    <p className={`text-[10px] leading-tight ${r.s === "Full Access" ? "font-semibold text-violet-600" : "text-slate-500"}`}>{r.s}</p>
                  </div>
                ))}
              </div>
              </div>
            </div>

            <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow">
              <div className="mb-3 flex items-center gap-2"><UserCog className="h-6 w-6 text-violet-600" /><h2 className="font-bold text-violet-800">HR & Payroll (Employees)</h2><span className="rounded-full bg-rose-500 px-2 text-xs font-semibold text-white">New</span></div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {hr.map((x) => <p key={x} className="flex items-center gap-2 text-sm text-slate-700"><CheckCircle2 className="h-4 w-4 text-violet-500" /> {x}</p>)}
              </div>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-white/70 bg-white/95 p-6 shadow-2xl backdrop-blur">
              <div className="text-center">
                <p className="text-4xl font-extrabold tracking-tight text-[hsl(255_60%_20%)]">JAAGA <span className="text-emerald-500">X</span></p>
                <h2 className="text-xl font-bold text-[hsl(255_60%_20%)]">Hotel Partner Login</h2>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-violet-50 p-1" role="tablist">
                {tabs.map((t) => (
                  <button key={t.k} type="button" role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)}
                    className={`rounded-lg px-1 py-2 text-sm font-medium transition ${tab === t.k ? "bg-violet-600 text-white shadow" : "text-slate-700 hover:bg-violet-100"}`}>{t.l}</button>
                ))}
              </div>

              {tab === "employee" ? (
                <form onSubmit={openPropertyLogin} className="mt-5 space-y-4">
                  <div>
                    <Label className="text-slate-800">Property ID <span className="text-rose-500">*</span></Label>
                    <div className="relative mt-1"><Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input required value={propertyRef} onChange={(e) => setPropertyRef(e.target.value)} placeholder="JGX-HOT-00001" className="h-11 border-violet-200 bg-white pl-9 text-slate-900" /></div>
                    <p className="mt-1 text-xs text-slate-500">Find it in your welcome email. You will sign in on your property's staff page.</p>
                  </div>
                  <Button type="submit" className="h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-base font-semibold text-white">Continue to Staff Login <ArrowRight className="ml-1 h-4 w-4" /></Button>
                </form>
              ) : (
                <form onSubmit={submit} className="mt-5 space-y-4">
                  <div>
                    <Label className="text-slate-800">Email <span className="text-rose-500">*</span></Label>
                    <div className="relative mt-1"><UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hotel.com" className="h-11 border-violet-200 bg-white pl-9 text-slate-900" /></div>
                  </div>
                  <div>
                    <Label className="text-slate-800">Password <span className="text-rose-500">*</span></Label>
                    <div className="relative mt-1"><Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 border-violet-200 bg-white px-9 text-slate-900" />
                      <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
                  </div>
                  <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign In <ArrowRight className="ml-1 h-4 w-4" /></>}
                  </Button>
                  <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" defaultChecked className="h-4 w-4 accent-violet-600" /> Remember me</label><Link to="/partners/forgot-password" className="text-sm font-medium text-violet-600 hover:underline">Forgot Password?</Link></div>
                </form>
              )}

              <div className="my-4 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" /></div>
              <Button type="button" variant="outline" className="h-11 w-full gap-2 border-violet-200 bg-white text-slate-800" disabled={googleBusy} onClick={loginWithGoogle}>
              {googleBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
                  <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.7l4-3z" />
                  <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0A12 12 0 0 0 1.4 6.7l4 3.1C6.3 7 8.9 4.8 12 4.8z" />
                </svg>
              )}
              Continue with Google
              </Button>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4 shadow">
              <Hotel className="h-12 w-12 shrink-0 text-violet-600" />
              <div>
                <p className="font-bold text-slate-900">Not a Jaaga partner yet?</p>
                <p className="text-xs text-slate-600">Onboard your hotel or property in minutes.</p>
                <Button asChild variant="outline" size="sm" className="mt-2 border-violet-500 bg-white text-violet-700"><Link to="/partners/register">Create Hotel Account <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
              </div>
            </div>
            <PartnerLoginHighlights />
          </aside>
        </div>
      </div>
    </div>
  );
}
