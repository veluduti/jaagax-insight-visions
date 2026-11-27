import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import PortalShell from "./PortalShell";
import { usePortal } from "./usePortal";

export default function PropertyStaffLogin() {
  const { slug } = useParams(); const nav = useNavigate(); const portal = usePortal(slug);
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [show, setShow] = useState(false); const [busy, setBusy] = useState(false); const [forgot, setForgot] = useState(false);
  if (portal.isLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!portal.data) return <div className="min-h-screen grid place-items-center text-center p-6"><div><h1 className="text-xl font-semibold">Property not found</h1><p className="text-muted-foreground text-sm mt-1">Check the login link your property shared with you.</p><Link to="/" className="text-primary underline text-sm">Go to JAAGA X</Link></div></div>;
  const p = portal.data;
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
  return <PortalShell p={p} title={forgot ? "Reset your password" : "Login to access your property"}>
    <form onSubmit={submit} className="space-y-3">
      <div className="relative"><Mail className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" /><Input className="pl-9" type="email" autoComplete="email" placeholder="Registered email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      {!forgot && <div className="relative"><Lock className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" /><Input className="pl-9 pr-9" type={show ? "text" : "password"} autoComplete="current-password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} /><button type="button" aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-3" onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>}
      <Button type="submit" disabled={busy} className="w-full bg-violet-700 hover:bg-violet-800">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{forgot ? "Send reset link" : "Login"}</Button>
      <button type="button" className="w-full text-sm text-violet-700" onClick={() => setForgot(!forgot)}>{forgot ? "Back to login" : "Forgot password?"}</button>
    </form>
  </PortalShell>;
}
