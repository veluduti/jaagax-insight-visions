import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Mail, Globe, MapPin, Shield, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  builder: any;
  tier: string;
}

const tierStyles = {
  luxury: {
    card: "bg-[#0f1510]/80 backdrop-blur-md border border-[#2a3a20]/40 rounded-2xl",
    heading: "text-[#c8b882]",
    primary: "bg-gradient-to-r from-[#1a3a14] to-[#245a1c] text-[#c8b882] border border-[#2a4a20]/40 hover:from-[#245a1c] hover:to-[#2e6a24]",
    trustBg: "bg-emerald-500/8 border-emerald-500/20 text-emerald-400",
    certBg: "bg-[#c8b882]/8 border-[#c8b882]/20 text-[#c8b882]",
    officeBg: "bg-[#0c0f0a]/60 border-[#2a3a20]/30",
  },
  standard: {
    card: "bg-white/80 dark:bg-[#141a12]/60 backdrop-blur-md border border-[#d4e0d0] dark:border-[#1e2e1a]/50 rounded-2xl",
    heading: "text-[#2a3a28] dark:text-[#d0daca]",
    primary: "bg-[#2a5a24] text-white hover:bg-[#1e4a1a]",
    trustBg: "bg-emerald-500/8 border-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    certBg: "bg-blue-500/8 border-blue-500/15 text-blue-600 dark:text-blue-400",
    officeBg: "bg-muted/50 border-border/30",
  },
  budget: {
    card: "bg-white dark:bg-slate-800/60 border border-blue-100 dark:border-blue-800/30 rounded-2xl",
    heading: "text-slate-800 dark:text-white",
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    trustBg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400",
    certBg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30 text-blue-700 dark:text-blue-400",
    officeBg: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/30",
  },
};

const BuilderMicrositeContact = ({ builder, tier }: Props) => {
  const s = tierStyles[tier as keyof typeof tierStyles] || tierStyles.standard;
  const offices = Array.isArray(builder.office_addresses) ? builder.office_addresses : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Contact Actions */}
      <div className={cn("p-6 space-y-3", s.card)}>
        <h3 className={cn("font-semibold text-base mb-4", s.heading)}>Reach Out</h3>
        <Button className={cn("w-full h-11 gap-2 rounded-xl", s.primary)} onClick={() => window.open(`tel:${builder.phone}`)}>
          <Phone className="h-4 w-4" /> Call Now
        </Button>
        {builder.whatsapp && (
          <Button
            variant="outline"
            className="w-full h-11 gap-2 rounded-xl border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
        )}
        {builder.email && (
          <Button variant="outline" className="w-full h-11 gap-2 rounded-xl" onClick={() => window.open(`mailto:${builder.email}`)}>
            <Mail className="h-4 w-4" /> Email
          </Button>
        )}
        {builder.website && (
          <a
            href={builder.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-11 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-xl border border-border/40 hover:border-border/80"
          >
            <Globe className="h-4 w-4" /> {builder.website.replace(/https?:\/\//, "")}
          </a>
        )}
      </div>

      {/* Trust & Office */}
      <div className="space-y-4">
        <div className={cn("p-6 space-y-3", s.card)}>
          <h3 className={cn("font-semibold text-sm flex items-center gap-2", s.heading)}>
            <Shield className="h-4 w-4 text-emerald-500" /> Trust & Verification
          </h3>
          {builder.rera_number && (
            <div className={cn("flex items-center gap-2 text-xs p-3 rounded-xl border", s.trustBg)}>
              <Shield className="h-3.5 w-3.5 flex-shrink-0" /> RERA: {builder.rera_number}
            </div>
          )}
          {builder.certifications && (
            <div className={cn("flex items-center gap-2 text-xs p-3 rounded-xl border", s.certBg)}>
              <Award className="h-3.5 w-3.5 flex-shrink-0" /> {builder.certifications}
            </div>
          )}
          {builder.years_of_experience > 15 && (
            <div className={cn("flex items-center gap-2 text-xs p-3 rounded-xl border", s.certBg)}>
              <Award className="h-3.5 w-3.5 flex-shrink-0" /> Established ({builder.years_of_experience}+ years)
            </div>
          )}
        </div>

        {offices.length > 0 && (
          <div className={cn("p-6", s.card)}>
            <h3 className={cn("font-semibold text-sm flex items-center gap-2 mb-3", s.heading)}>
              <MapPin className="h-4 w-4 text-emerald-500" /> Office Locations
            </h3>
            <div className="space-y-2">
              {offices.map((office: any, i: number) => (
                <div key={i} className={cn("p-3 rounded-xl border text-xs", s.officeBg)}>
                  <p className="font-medium">{office.city}</p>
                  <p className="text-muted-foreground mt-0.5">{office.address}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuilderMicrositeContact;
