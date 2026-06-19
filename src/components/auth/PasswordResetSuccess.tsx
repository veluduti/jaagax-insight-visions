import { useEffect } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface PasswordResetSuccessProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToLogin: () => void;
  redirectSeconds?: number;
}

export default function PasswordResetSuccess({ isOpen, onClose, onGoToLogin, redirectSeconds = 3 }: PasswordResetSuccessProps) {
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => onGoToLogin(), redirectSeconds * 1000);
    return () => clearTimeout(t);
  }, [isOpen, onGoToLogin, redirectSeconds]);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md glass-panel border-primary/20">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <DialogHeader className="space-y-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
              className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center"
            >
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            </motion.div>
            <DialogTitle className="text-2xl text-center">Password Updated Successfully</DialogTitle>
            <DialogDescription className="text-center">
              Your password has been reset successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-2">
            <Button className="w-full h-12" onClick={onGoToLogin}>Go to Login</Button>
            <p className="text-xs text-center text-muted-foreground">
              Redirecting in {redirectSeconds} seconds…
            </p>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
