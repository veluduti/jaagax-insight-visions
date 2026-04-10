import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Mail, Globe, MapPin, Shield, Award } from "lucide-react";

interface Props {
  builder: any;
  tier: string;
}

const BuilderMicrositeContact = ({ builder, tier }: Props) => {
  const offices = Array.isArray(builder.office_addresses) ? builder.office_addresses : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Contact Actions */}
      <div className="p-6 space-y-3 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06]">
        <h3 className="font-semibold text-sm mb-4 text-zinc-200">Reach Out</h3>
        <Button
          className="w-full h-11 gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
          onClick={() => window.open(`tel:${builder.phone}`)}
        >
          <Phone className="h-4 w-4" /> Call Now
        </Button>
        {builder.whatsapp && (
          <Button
            variant="outline"
            className="w-full h-11 gap-2 rounded-xl border-emerald-500/20 text-emerald-400 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.12]"
            onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
        )}
        {builder.email && (
          <Button
            variant="outline"
            className="w-full h-11 gap-2 rounded-xl border-white/[0.08] text-zinc-300 bg-white/[0.03] hover:bg-white/[0.06]"
            onClick={() => window.open(`mailto:${builder.email}`)}
          >
            <Mail className="h-4 w-4" /> Email
          </Button>
        )}
        {builder.website && (
          <a
            href={builder.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full h-11 text-sm text-zinc-500 hover:text-zinc-200 transition-colors rounded-xl border border-white/[0.06] hover:border-white/[0.12]"
          >
            <Globe className="h-4 w-4" /> {builder.website.replace(/https?:\/\//, "")}
          </a>
        )}
      </div>

      {/* Trust & Office */}
      <div className="space-y-4">
        <div className="p-6 space-y-3 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06]">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-zinc-200">
            <Shield className="h-4 w-4 text-emerald-400" /> Trust & Verification
          </h3>
          {builder.rera_number && (
            <div className="flex items-center gap-2 text-xs p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.1] text-emerald-400">
              <Shield className="h-3.5 w-3.5 flex-shrink-0" /> RERA: {builder.rera_number}
            </div>
          )}
          {builder.certifications && (
            <div className="flex items-center gap-2 text-xs p-3 rounded-xl bg-violet-500/[0.06] border border-violet-500/[0.1] text-violet-400">
              <Award className="h-3.5 w-3.5 flex-shrink-0" /> {builder.certifications}
            </div>
          )}
          {builder.years_of_experience > 15 && (
            <div className="flex items-center gap-2 text-xs p-3 rounded-xl bg-blue-500/[0.06] border border-blue-500/[0.1] text-blue-400">
              <Award className="h-3.5 w-3.5 flex-shrink-0" /> Established ({builder.years_of_experience}+ years)
            </div>
          )}
        </div>

        {offices.length > 0 && (
          <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06]">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3 text-zinc-200">
              <MapPin className="h-4 w-4 text-violet-400" /> Office Locations
            </h3>
            <div className="space-y-2">
              {offices.map((office: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs">
                  <p className="font-medium text-zinc-300">{office.city}</p>
                  <p className="text-zinc-500 mt-0.5">{office.address}</p>
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
