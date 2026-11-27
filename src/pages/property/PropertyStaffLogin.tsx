import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, BarChart3, BedDouble, Copy, Crown, Eye, EyeOff, Loader2, Lock, MapPin, Settings, ShieldCheck, Sparkles, User, Users, UtensilsCrossed, Wallet, Zap } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import bgAsset from "@/assets/twilight-property.png.asset.json";
import { usePortal, typeLabel } from "./usePortal";

const LONG_STAY = ["pg", "hostel", "coliving", "co_living"];

export default function PropertyStaffLogin() {
  const { slug } = useParams(); const nav = useNavigate(); const portal = usePortal(slug);
  const [mode, setMode] = useState<"staff" | "owner">("staff");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [forgot, setForgot] = useState(false);
  if (portal.isLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (portal.isError || !portal.data) return <div className="min-h-screen grid place-items-center text-center p-6"><div><h1 className="text-xl font-semibold">Property not found</h1><p className="text-muted-foreground text-sm mt-1">Check the login link your property shared with you.</p><Link to="/" className="text-primary underline text-sm">Go to JAAGA X</Link></div></div>;
  const p = portal.data;
  const longStay = LONG_STAY.includes(p.business_types?.[0] ?? "");
  const place = [p.locality, p.city].filter(Boolean).join(", ");
  const services = [
    { icon: Users, name: "Front Desk", desc: longStay ? "Check-in • Check-out • Enquiries" : "Check-in • Check-out • Reservations" },
    { icon: Sparkles, name: "Housekeeping", desc: "Room Cleaning • Maintenance" },
    longStay ? { icon: UtensilsCrossed, name: "Mess / Kitchen", desc: "Menu • Meal Attendance • Inventory" } : { icon: BedDouble, name: "Rooms & Rates", desc: "Inventory • Availability" },
    { icon: ShieldCheck, name: "Security", desc: "Visitor Entry • Gate Logs" },
    { icon: Wallet, name: "Accounts", desc: "Payments • Dues • Reports" },
    { icon: Settings, name: "Property Manager", desc: "Operations • Team • Reports" },
  ];
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = z.string().trim().email().safeParse(email); if (!ok.success) { toast.error("Enter your registered email address"); return; }
    setBusy(true);
    try {
      if (forgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/property/${slug}/set-password` });
        if (error) throw error; toast.success("If this email belongs to a staff account, a reset link is on its way."); setForgot(false); return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
      if (error) throw new Error("Incorrect email or password");
      const { data: emp } = await (supabase as any).from("hotel_employees").select("id,status,must_change_password").eq("hotel_id", p.id).eq("user_id", data.user.id).maybeSingle();
      const { data: own } = await (supabase as any).from("partner_hotels").select("id").eq("id", p.id).eq("manager_id", data.user.id).maybeSingle();
      if (own) { localStorage.setItem("partner_active_property", p.id); nav("/partners/dashboard", { replace: true }); return; }
      if (!emp || !["active", "on_notice", "invited"].includes(emp.status)) { await supabase.auth.signOut(); throw new Error("This account does not have access to this property"); }
      nav(emp.must_change_password || emp.status === "invited" ? `/property/${slug}/set-password` : `/property/${slug}/staff`, { replace: true });
    } catch (err: any) { toast.error(err.message || "Could not sign in"); } finally { setBusy(false); }
  };
  const copyId = () => { if (p.property_reference) { navigator.clipboard?.writeText(p.property_reference); toast.success("Property ID copied"); } };
  const Logo = ({ dark }: { dark?: boolean }) => <div className="leading-none"><div className={`text-3xl font-black tracking-tight ${dark ? "text-slate-900" : "text-white"}`}>JAAGA <span className="text-emerald-500">X</span></div><div className={`text-sm font-semibold ml-24 ${dark ? "text-slate-900" : "text-white"}`}>Stays</div></div>;

  return <div className="relative min-h-screen lg:flex">
    {/* Static backdrop: the twilight property photo stays put while the page scrolls */}
    <div aria-hidden className="fixed inset-0 -z-10 bg-violet-950 bg-cover bg-center" style={{ backgroundImage: `url(${bgAsset.url})` }} />
    <div aria-hidden className="fixed inset-0 -z-10 bg-gradient-to-br from-violet-50/72 via-white/60 to-violet-100/72" />

    <aside className="relative hidden lg:flex lg:w-[37%] lg:h-screen lg:sticky lg:top-0 lg:self-start overflow-hidden text-white">
      {/* Desktop: the twilight property photo pinned inside the side panel */}
      <div aria-hidden className="absolute inset-0 bg-violet-950 bg-cover bg-center" style={{ backgroundImage: `url(${bgAsset.url})` }} />
      {p.image && <img src={p.image} alt="" className="absolute inset-0 h-full w-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-950/85 via-violet-800/35 to-violet-950/90" />
      <div className="relative h-full flex flex-col p-8">
        <Logo />
        <h1 className="mt-10 text-3xl lg:text-4xl font-bold drop-shadow-sm">{p.name}</h1>
        <p className="mt-2 text-xl lg:text-2xl text-white/90">Property Operations Portal</p>
        <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 text-sm backdrop-blur"><BedDouble className="h-4 w-4" />{typeLabel(p.business_types)}</span>
        {place && <p className="mt-4 flex items-center gap-2 text-lg"><MapPin className="h-5 w-5" />{place}</p>}
        <div className="mt-auto pt-10 grid grid-cols-3 gap-2 text-center text-xs">
          {[{ i: ShieldCheck, t: "Secure Access", s: "Role-based operations" }, { i: Zap, t: "Real-time Operations", s: longStay ? "Residents • Rooms • Mess" : "Guests • Rooms • Bookings" }, { i: BarChart3, t: "Property Team Portal", s: "Manage daily operations" }].map(f => <div key={f.t}><f.i className="mx-auto h-7 w-7 mb-1" /><div className="font-semibold">{f.t}</div><div className="text-white/80">{f.s}</div></div>)}
        </div>
      </div>
    </aside>

    <main className="flex-1 p-4 lg:p-8 lg:-ml-6 relative">
      <div className="rounded-3xl bg-white/95 backdrop-blur-sm shadow-2xl ring-1 ring-violet-100 p-6 lg:p-8 min-h-full">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><Logo dark /><h2 className="mt-4 text-3xl font-bold text-slate-900">Employee Login</h2><p className="mt-1 text-slate-600">Access your assigned services for {p.name}</p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600 lg:hidden"><span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-violet-700" />{typeLabel(p.business_types)}</span>{place && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-violet-700" />{place}</span>}</p></div>
          {p.property_reference && <button onClick={copyId} className="flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-2 text-slate-700">Property ID: <b className="text-slate-900">{p.property_reference}</b><Copy className="h-4 w-4" /></button>}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_1fr]">
          <div>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-violet-200 bg-violet-50/50 p-1">
              {(["staff", "owner"] as const).map(m => <button key={m} type="button" onClick={() => setMode(m)} className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition ${mode === m ? "bg-violet-700 text-white shadow" : "text-slate-800 hover:bg-violet-100"}`}>{m === "staff" ? <User className="h-4 w-4" /> : <Crown className="h-4 w-4" />}{m === "staff" ? "Employee / Staff Login" : "Owner / Admin Login"}</button>)}
            </div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block"><span className="text-sm font-semibold text-slate-800">{mode === "owner" ? "Owner Email" : "Registered Email"} <span className="text-red-500">*</span></span>
                <div className="relative mt-1.5"><User className="h-5 w-5 absolute left-3.5 top-3 text-slate-500" /><input className="w-full h-11 rounded-xl border border-slate-300 pl-11 pr-3 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200" type="email" autoComplete="email" placeholder="Enter your registered email" value={email} onChange={e => setEmail(e.target.value)} /></div></label>
              {!forgot && <label className="block"><span className="text-sm font-semibold text-slate-800">Password <span className="text-red-500">*</span></span>
                <div className="relative mt-1.5"><Lock className="h-5 w-5 absolute left-3.5 top-3 text-slate-500" /><input className="w-full h-11 rounded-xl border border-slate-300 pl-11 pr-11 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200" type={show ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={pw} onChange={e => setPw(e.target.value)} /><button type="button" aria-label={show ? "Hide password" : "Show password"} className="absolute right-3.5 top-3 text-slate-600" onClick={() => setShow(!show)}>{show ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button></div></label>}
              <div className="text-right"><button type="button" className="text-sm font-semibold text-violet-700" onClick={() => setForgot(!forgot)}>{forgot ? "Back to login" : "Forgot Password?"}</button></div>
              <button type="submit" disabled={busy} className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-700 to-violet-600 text-white font-semibold flex items-center justify-center gap-2 hover:from-violet-800 disabled:opacity-70">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{forgot ? "Send reset link" : "Login"}{!busy && <ArrowRight className="h-5 w-5" />}</button>
            </form>
            <div className="mt-5 flex items-start gap-3 rounded-xl bg-emerald-50 p-4"><ShieldCheck className="h-7 w-7 text-emerald-600 shrink-0" /><div><p className="text-sm text-slate-800">You are logging in to <b>{p.name}{p.property_reference ? ` (${p.property_reference})` : ""}</b></p><p className="text-xs text-slate-600">Access is available only for authorized team members.</p></div></div>
          </div>

          <div className="rounded-2xl border border-violet-100 p-4">
            <div className="flex items-start gap-3 mb-4"><Settings className="h-7 w-7 text-violet-700" /><div><p className="font-bold text-slate-900">Your Property Services</p><p className="text-sm text-slate-600">Access based on your assigned role</p></div></div>
            <div className="space-y-2">{services.map(s => <div key={s.name} className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2.5"><s.icon className="h-6 w-6 text-violet-700 shrink-0 mt-0.5" /><div className="min-w-0"><p className="font-semibold text-slate-900 text-sm">{s.name}</p><p className="text-[11px] leading-snug text-slate-600">{s.desc}</p></div></div>)}</div>
          </div>
        </div>
      </div>
    </main>
  </div>;
}
