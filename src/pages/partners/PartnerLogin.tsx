import { useState } from "react";
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

export default function PartnerLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await signInWithPassword(email.trim(), password);
      if (error) throw error;
      const uid = data.user?.id;
      if (!uid) throw new Error("Login failed");

      // Route based on KYC status
      const { data: apps } = await (supabase as any)
        .from("hotel_partner_applications")
        .select("id,status")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(1);
      const app = apps?.[0];
      toast.success("Welcome back!");
      if (!app) navigate("/partners/kyc");
      else if (app.status === "pending" || app.status === "rejected") navigate("/partners/status");
      else navigate("/dashboard/hotel-manager");
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
            <p className="mt-6 text-center text-sm text-muted-foreground">
              New here? <Link to="/partners/register" className="text-emerald-400 hover:underline">List your hotel</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
