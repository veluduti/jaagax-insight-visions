/**
 * NLResetPassword — public page for the /reset-password redirect
 * -------------------------------------------------------------
 * Users arrive here from the "Forgot password" email link.
 * They set a new password, then are routed to /natural-living/start
 * which decides their next stage.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import NLLayout from "@/features/natural-living/NLLayout";
import { Eyebrow, H1, Lede } from "@/features/natural-living/ui";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NLResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryReady(true);
    });
    // If session already exists (link freshly clicked) allow update.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setRecoveryReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated");
      navigate("/natural-living/start", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <NLLayout>
      <section className="py-20 md:py-28" style={{ background: "hsl(var(--nl-cream))" }}>
        <div className="nl-container max-w-md">
          <Eyebrow>Reset password</Eyebrow>
          <H1 className="mt-3">A fresh <span style={{ fontStyle: "italic" }}>beginning.</span></H1>
          <Lede className="mt-6">Choose a new password to continue your journey.</Lede>

          {!recoveryReady ? (
            <div className="mt-10 flex items-center gap-3 text-sm text-[hsl(var(--nl-ink)/0.7)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying your reset link…
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-10 space-y-5">
              <div>
                <label className="nl-eyebrow block mb-2">New password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-[hsl(var(--nl-forest)/0.4)] py-2 outline-none focus:border-[hsl(var(--nl-forest))]"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="nl-eyebrow block mb-2">Confirm password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-transparent border-b border-[hsl(var(--nl-forest)/0.4)] py-2 outline-none focus:border-[hsl(var(--nl-forest))]"
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" disabled={busy} className="nl-btn nl-btn-primary w-full justify-center">
                {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Update password
              </button>
            </form>
          )}
        </div>
      </section>
    </NLLayout>
  );
}
