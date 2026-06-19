import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Loader2, Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";

interface ResetPasswordModalProps {
  isOpen: boolean;
  isValid: boolean | null; // null = checking, true = valid token, false = invalid/expired
  onClose: () => void;
  onSuccess: () => void;
  onRequestNew: () => void;
}

const rules = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /\d/.test(p), label: "One number" },
  { test: (p: string) => /[!@#$%^&*(),.?":{}|<>_\-+=/\\[\];'`~]/.test(p), label: "One special character" },
];

export default function ResetPasswordModal({ isOpen, isValid, onClose, onSuccess, onRequestNew }: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const checks = useMemo(() => rules.map((r) => ({ ...r, ok: r.test(password) })), [password]);
  const allValid = checks.every((c) => c.ok);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allValid) { toast.error("Password does not meet all requirements"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      try { await supabase.auth.signOut({ scope: "others" } as any); } catch {}
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md glass-panel border-primary/20">
        {isValid === null ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Validating reset link…</p>
          </motion.div>
        ) : isValid === false ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <DialogHeader className="space-y-3">
              <div className="mx-auto h-16 w-16 rounded-full bg-destructive/15 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <DialogTitle className="text-2xl text-center">Link Invalid or Expired</DialogTitle>
              <DialogDescription className="text-center">
                This password reset link is invalid or has expired.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-6">
              <Button className="w-full h-12" onClick={onRequestNew}>Request New Reset Link</Button>
              <Button variant="ghost" className="w-full" onClick={onClose}>Back to Sign In</Button>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <DialogHeader className="space-y-3">
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-2xl text-center">Reset Password</DialogTitle>
              <DialogDescription className="text-center">
                Set a new secure password for your account.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-5 mt-6">
              <div className="space-y-2">
                <Label htmlFor="new-pw">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-pw"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="h-12 pr-10"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-pw">Confirm Password</Label>
                <Input
                  id="confirm-pw"
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Re-enter new password"
                  className="h-12"
                />
              </div>

              <ul className="space-y-1 text-xs">
                {checks.map((c) => (
                  <li key={c.label} className={c.ok ? "text-emerald-500" : "text-muted-foreground"}>
                    {c.ok ? "✓" : "○"} {c.label}
                  </li>
                ))}
              </ul>

              <Button type="submit" className="w-full h-12" disabled={loading || !allValid || password !== confirm}>
                {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</>) : (<><ShieldCheck className="w-4 h-4 mr-2" />Update Password</>)}
              </Button>
            </form>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
