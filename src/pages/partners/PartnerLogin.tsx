import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import PartnerNav from "@/components/partners/PartnerNav";
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
      .select("id,status")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(1);
    const app = apps?.[0];
    if (!app) navigate("/partners/kyc");
    else if (app.status === "pending" || app.status === "rejected") navigate("/partners/status");
    else navigate("/partners/dashboard");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-950/20">
      <PartnerNav />
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-10">
        <Card className="w-full border border-emerald-500/20 bg-background/70 backdrop-blur">
          <CardContent className="p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="mt-1 text-sm text-muted-foreground">Log in to your JAAGA X Partner account</p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Password</Label>
                  <Link to="/partners/forgot-password" className="text-xs text-emerald-400 hover:underline">Forgot?</Link>
                </div>
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-emerald-500 text-white hover:bg-emerald-600">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Log in"}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
            </div>
            <Button type="button" variant="outline" className="w-full gap-2" disabled={googleBusy} onClick={loginWithGoogle}>
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
              Log in with Google
            </Button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              New here? <Link to="/partners/register" className="text-emerald-400 hover:underline">List your hotel</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
