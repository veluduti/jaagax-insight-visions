import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email
    ?? (typeof window !== "undefined" ? sessionStorage.getItem("jaagax.pendingEmail") ?? "" : "");
  const [email] = useState(stateEmail);
  const [code, setCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!email) navigate("/auth", { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const setDigit = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    setCode((prev) => {
      const next = [...prev];
      next[i] = v;
      return next;
    });
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) inputs.current[i + 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const arr = text.split("").concat(["", "", "", "", "", ""]).slice(0, 6);
    setCode(arr);
    inputs.current[Math.min(text.length, 5)]?.focus();
  };

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const token = code.join("");
    if (token.length !== 6) { toast.error("Enter the 6-digit code"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: "signup" });
      if (error) {
        // Some setups use 'email' type for re-issued OTPs
        const { error: e2 } = await supabase.auth.verifyOtp({ email, token, type: "email" });
        if (e2) throw e2;
      }
      // Verified — sign out so the admin-approval gate kicks in on next login.
      await supabase.auth.signOut();
      sessionStorage.removeItem("jaagax.pendingEmail");
      toast.success("Email verified! Your roles are now awaiting admin approval.", { duration: 6000 });
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      toast.success("New code sent — check your inbox");
      setCooldown(45);
    } catch (err: any) {
      toast.error(err?.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="glass-panel border-primary/20 p-8">
          <div className="text-center mb-6">
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Verify your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to <span className="text-foreground font-medium">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-center gap-2">
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  onPaste={onPaste}
                  className="h-14 w-12 rounded-lg border-2 border-border bg-background text-center text-2xl font-bold text-foreground focus:border-primary focus:outline-none transition-colors"
                />
              ))}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>) : (<><ShieldCheck className="w-4 h-4 mr-2" />Verify & Continue</>)}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Didn't get it? </span>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : (resending ? "Sending..." : "Resend code")}
              </button>
            </div>

            <p className="text-[11px] text-center text-muted-foreground border-t border-border/50 pt-4">
              After verification, your role request goes to an admin for approval.
              You'll be able to log in once approved.
            </p>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
