import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, MailCheck, KeyRound } from "lucide-react";
import PartnerNav from "@/components/partners/PartnerNav";
import { supabase } from "@/integrations/supabase/client";

export default function PartnerForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent — check your inbox");
    } catch (err: any) {
      toast.error(err.message || "Could not send reset link");
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
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                {sent ? <MailCheck className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
              </div>
              <h1 className="text-2xl font-bold">{sent ? "Check your email" : "Reset your password"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {sent ? `We've sent instructions to ${email}` : "Enter the email associated with your partner account"}
              </p>
            </div>
            {!sent ? (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-emerald-500 text-white hover:bg-emerald-600">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
                </Button>
              </form>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setSent(false)}>Send again</Button>
            )}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/partners/login" className="text-emerald-400 hover:underline">Back to log in</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
