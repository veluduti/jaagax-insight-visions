import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import PortalShell from "./PortalShell";
import { usePortal } from "./usePortal";

export default function PropertySetPassword() {
  const { slug } = useParams(); const nav = useNavigate(); const portal = usePortal(slug);
  const [ready, setReady] = useState<boolean | null>(null); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { if (s) setReady(true); });
    supabase.auth.getSession().then(({ data }) => setReady(r => r || !!data.session));
    const t = setTimeout(() => setReady(r => r ?? false), 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, []);
  if (portal.isLoading || !portal.data) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) { toast.error("Use at least 8 characters with letters and numbers"); return; }
    if (pw !== pw2) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw new Error(/pwned|leak|breach/i.test(error.message) ? "This password has appeared in a known data leak. Choose a different one." : error.message);
      await (supabase as any).rpc("staff_complete_first_login", { _hotel: portal.data!.id });
      toast.success("Password set"); nav(`/property/${slug}/staff`, { replace: true });
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  };
  return <PortalShell p={portal.data} title="Set your password">
    {ready === null ? <div className="grid place-items-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div> : !ready ? <p className="text-sm text-center">This link has expired or was already used. Go back to the property login and choose “Forgot password?” to get a new one.</p> :
      <form onSubmit={save} className="space-y-3"><Input type="password" autoComplete="new-password" placeholder="New password" value={pw} onChange={e => setPw(e.target.value)} /><Input type="password" autoComplete="new-password" placeholder="Confirm password" value={pw2} onChange={e => setPw2(e.target.value)} />
        <p className="text-xs text-muted-foreground">At least 8 characters with letters and numbers. Passwords found in known data leaks are rejected.</p>
        <Button type="submit" disabled={busy} className="w-full bg-violet-700 hover:bg-violet-800">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Save password</Button></form>}
  </PortalShell>;
}
