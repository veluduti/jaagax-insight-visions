import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BedDouble, Building2, Copy, Crown, Eye, EyeOff, Headphones, Loader2, Lock, LogIn, Mail, MapPin, Monitor, Settings, ShieldCheck, Sparkles, User, Users, UtensilsCrossed, Wallet, Zap } from "lucide-react";
import bgAsset from "@/assets/twilight-resort-pool.png.asset.json";
import { toast } from "sonner";
import { z } from "zod";
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

  const tiles = services.slice(0, 6);
  const inputCls = "w-full h-12 rounded-xl border border-slate-300 bg-white pl-12 pr-3 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-200";

  return <div className="relative min-h-screen bg-white lg:flex">
    {/* Static background photo (does not scroll) */}
    <div aria-hidden className="fixed inset-0 lg:right-auto lg:w-[56%] bg-cover bg-center" style={{ backgroundImage: `url(${bgAsset.url})` }} />
    <div aria-hidden className="fixed inset-0 lg:right-auto lg:w-[56%] bg-gradient-to-t from-violet-950/90 via-violet-900/30 to-violet-900/40" />

    <aside className="relative z-10 hidden lg:flex lg:w-[56%] min-h-screen flex-col justify-between p-10 text-white">
      <div className="leading-none"><div className="flex items-center gap-1 text-3xl font-black tracking-tight">JAAGA X<span className="text-emerald-400">▲</span></div><div className="text-sm font-medium mt-1">Unified Hospitality OS</div></div>
      <div className="max-w-xl">
        <h1 className="border-l-4 border-violet-400 pl-4 text-5xl font-bold leading-tight drop-shadow">{longStay ? "Property Operations" : "Hotel Operations"}<br />Made Simple</h1>
        <p className="mt-4 text-lg text-white/90 drop-shadow">A unified platform for the {p.name} team to manage {longStay ? "residents, rooms, services" : "guests, rooms, services"} and daily operations — all in one place.</p>
        {place && <p className="mt-3 flex items-center gap-2 text-white/90"><MapPin className="h-4 w-4" />{typeLabel(p.business_types)} · {place}</p>}
        <div className="mt-6 grid grid-cols-6 gap-2">
          {tiles.map(s => <div key={s.name} className="flex flex-col items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-2 py-3 text-center text-xs font-semibold backdrop-blur-md"><s.icon className="h-7 w-7" />{s.name}</div>)}
        </div>
      </div>
    </aside>

    <main className="relative z-10 flex-1 flex flex-col p-4 lg:p-0">
      <svg aria-hidden className="hidden lg:block absolute -left-24 top-0 h-full w-28 text-white" viewBox="0 0 100 1000" preserveAspectRatio="none"><path d="M100 0 L60 0 C10 300 90 650 0 1000 L100 1000 Z" fill="currentColor" /><path d="M60 0 C10 300 90 650 0 1000" stroke="#8b5cf6" strokeWidth="8" fill="none" /></svg>
      <div className="flex-1 rounded-3xl lg:rounded-none bg-white/95 lg:bg-white shadow-xl lg:shadow-none px-6 py-8 lg:px-14">
        <div className="text-right"><Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 hover:underline"><ArrowLeft className="h-4 w-4" />Back to Jaaga X</Link></div>
        <div className="mx-auto max-w-md text-center mt-4">
          <div className="leading-none"><div className="text-3xl font-black tracking-tight text-slate-900">JAAGA X<span className="text-emerald-500">▲</span></div><div className="text-sm font-medium text-slate-800 mt-1">Unified Hospitality OS</div></div>
          <h2 className="mt-6 flex items-center justify-center gap-3 text-3xl font-bold text-slate-900"><Users className="h-9 w-9 text-violet-600" />{mode === "owner" ? "Owner Login" : "Employee Login"}</h2>
          <p className="mt-2 text-slate-600">Access your {longStay ? "property" : "hotel"} workspace to manage daily operations, guests, services and tasks.</p>
        </div>

        <form onSubmit={submit} className="mx-auto mt-6 max-w-md space-y-4">
          <div><span className="text-sm font-semibold text-slate-800">Property / Hotel <span className="text-red-500">*</span></span>
            <button type="button" onClick={copyId} className="relative mt-1.5 flex w-full h-12 items-center rounded-xl border border-slate-300 bg-white pl-12 pr-3 text-left font-medium text-slate-900" title="Copy Property ID"><Building2 className="h-5 w-5 absolute left-4 text-violet-600" /><span className="truncate">{p.name}</span>{p.property_reference && <span className="ml-auto flex items-center gap-1 text-xs text-slate-500">{p.property_reference}<Copy className="h-3.5 w-3.5" /></span>}</button></div>
          <label className="block"><span className="text-sm font-semibold text-slate-800">{mode === "owner" ? "Owner Email" : "Employee Email"} <span className="text-red-500">*</span></span>
            <div className="relative mt-1.5"><Mail className="h-5 w-5 absolute left-4 top-3.5 text-violet-600" /><input className={inputCls} type="email" autoComplete="email" placeholder="Enter your registered email" value={email} onChange={e => setEmail(e.target.value)} /></div></label>
          {!forgot && <label className="block"><span className="text-sm font-semibold text-slate-800">Password <span className="text-red-500">*</span></span>
            <div className="relative mt-1.5"><Lock className="h-5 w-5 absolute left-4 top-3.5 text-violet-600" /><input className={inputCls + " pr-11"} type={show ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={pw} onChange={e => setPw(e.target.value)} /><button type="button" aria-label={show ? "Hide password" : "Show password"} className="absolute right-3.5 top-3.5 text-slate-600" onClick={() => setShow(!show)}>{show ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button></div></label>}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-800"><input type="checkbox" defaultChecked className="h-4 w-4 accent-violet-600" />Remember me</label>
            <button type="button" className="text-sm font-semibold text-violet-700 underline" onClick={() => setForgot(!forgot)}>{forgot ? "Back to login" : "Forgot Password?"}</button>
          </div>
          <button type="submit" disabled={busy} className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-700 to-violet-500 text-white font-semibold flex items-center justify-center gap-2 hover:from-violet-800 disabled:opacity-70">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-5 w-5" />}{forgot ? "Send reset link" : "Login to Jaaga X"}</button>
          <div className="flex items-center gap-3 text-sm text-slate-500"><span className="h-px flex-1 bg-slate-200" />or<span className="h-px flex-1 bg-slate-200" /></div>
          <button type="button" onClick={() => setMode(mode === "staff" ? "owner" : "staff")} className="w-full h-12 rounded-xl border-2 border-violet-600 text-violet-700 font-semibold flex items-center justify-center gap-2 hover:bg-violet-50">{mode === "staff" ? <><Crown className="h-5 w-5" />Owner / Admin Login</> : <><User className="h-5 w-5" />Employee / Staff Login</>}</button>
        </form>

        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-slate-200 p-4 text-xs font-semibold text-slate-800">
          {[{ i: ShieldCheck, t: "Secure & Role-based Access" }, { i: Zap, t: "Access to Assigned Modules Only" }, { i: Monitor, t: "Works on Web, Tablet & Mobile" }, { i: Headphones, t: "Need Help? Contact Property Admin" }].map(f => <div key={f.t} className="flex items-center gap-2"><f.i className="h-6 w-6 shrink-0 text-violet-600" />{f.t}</div>)}
        </div>
      </div>
    </main>
  </div>;
}
