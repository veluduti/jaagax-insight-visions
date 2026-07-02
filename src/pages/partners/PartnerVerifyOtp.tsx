import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import PartnerNav from "@/components/partners/PartnerNav";
import { verifySignupOtp, resendSignupOtp } from "@/services/authService";

export default function PartnerVerifyOtp() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { email?: string } };
  const email = loc.state?.email || "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!email) { toast.error("Session expired — please sign up again"); nav("/partners/register", { replace: true }); }
  }, [email, nav]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async () => {
    if (otp.length < 6) return toast.error("Enter the 6-digit code");
    setLoading(true);
    try {
      const { data, error } = await verifySignupOtp(email, otp);
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any)?.error || "Invalid code");
      toast.success("Email verified!");
      nav("/partners/welcome", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setCooldown(30);
    try {
      await resendSignupOtp(email);
      toast.success("New code sent");
    } catch (e: any) {
      toast.error(e.message || "Could not resend");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-950/20">
      <PartnerNav />
      <div className="container mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center px-4 py-10">
        <Card className="w-full border border-emerald-500/20 bg-background/70 backdrop-blur">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold">Verify your email</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter the 6-digit code we sent to <span className="text-foreground">{email}</span></p>

            <div className="my-6 flex justify-center">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, i) => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button onClick={submit} disabled={loading || otp.length < 6} className="w-full bg-emerald-500 text-white hover:bg-emerald-600">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Continue"}
            </Button>

            <button
              onClick={resend}
              disabled={cooldown > 0}
              className="mt-4 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Didn't receive the code? Resend"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
