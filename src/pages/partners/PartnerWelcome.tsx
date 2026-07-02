import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, FileText, ShieldCheck, Rocket } from "lucide-react";
import PartnerNav from "@/components/partners/PartnerNav";

const steps = [
  { icon: FileText, title: "Upload KYC documents", body: "GST, PAN, trade license, cancelled cheque, and property photos." },
  { icon: ShieldCheck, title: "Get verified", body: "Our team reviews within 24 hours and lets you know via email + SMS." },
  { icon: Rocket, title: "Go live", body: "Complete room setup and start receiving bookings the same day." },
];

export default function PartnerWelcome() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-emerald-950/20">
      <PartnerNav />
      <div className="container mx-auto max-w-2xl px-4 py-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border border-emerald-500/30 bg-background/70 backdrop-blur">
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/40">
                <CheckCircle2 className="h-8 w-8 text-white" />
              </div>
              <h1 className="mt-5 text-3xl font-bold">Welcome to JAAGA X Partners! 🎉</h1>
              <p className="mt-2 text-muted-foreground">Your account is created. Let's get your hotel verified and live.</p>

              <div className="mt-8 space-y-3 text-left">
                {steps.map((s, i) => (
                  <div key={s.title} className="flex gap-3 rounded-lg border border-border/60 bg-background/40 p-4">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{i + 1}. {s.title}</p>
                      <p className="text-sm text-muted-foreground">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link to="/partners/kyc" className="mt-8 block">
                <Button size="lg" className="w-full bg-emerald-500 text-white hover:bg-emerald-600">
                  Start KYC verification <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
