import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Mail, Globe, MapPin, Shield, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  builder: any;
  tier: string;
}

const BuilderMicrositeContact = ({ builder, tier }: Props) => {
  const offices = Array.isArray(builder.office_addresses) ? builder.office_addresses : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Contact Actions */}
      <Card className={cn(
        tier === "luxury" ? "bg-[#161616] border-amber-500/15" : tier === "budget" ? "bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-800/30" : ""
      )}>
        <CardContent className="p-6 space-y-3">
          <h3 className={cn("font-semibold text-base mb-4", tier === "luxury" ? "text-amber-100" : "")}>
            Reach Out
          </h3>
          <Button
            className={cn("w-full h-11 gap-2",
              tier === "luxury" ? "bg-amber-500 text-black hover:bg-amber-400" : tier === "budget" ? "bg-blue-600 hover:bg-blue-700" : ""
            )}
            onClick={() => window.open(`tel:${builder.phone}`)}
          >
            <Phone className="h-4 w-4" /> Call Now
          </Button>
          {builder.whatsapp && (
            <Button variant="outline" className="w-full h-11 gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </Button>
          )}
          {builder.email && (
            <Button variant="outline" className="w-full h-11 gap-2" onClick={() => window.open(`mailto:${builder.email}`)}>
              <Mail className="h-4 w-4" /> Email
            </Button>
          )}
          {builder.website && (
            <a href={builder.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-11 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg border border-border/50 hover:border-border">
              <Globe className="h-4 w-4" /> {builder.website.replace(/https?:\/\//, "")}
            </a>
          )}
        </CardContent>
      </Card>

      {/* Trust & Office */}
      <div className="space-y-4">
        <Card className={cn(
          tier === "luxury" ? "bg-[#161616] border-amber-500/15" : tier === "budget" ? "bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-800/30" : ""
        )}>
          <CardContent className="p-6 space-y-3">
            <h3 className={cn("font-semibold text-sm flex items-center gap-2", tier === "luxury" ? "text-amber-100" : "")}>
              <Shield className="h-4 w-4 text-emerald-500" /> Trust & Verification
            </h3>
            {builder.rera_number && (
              <div className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Shield className="h-3.5 w-3.5" /> RERA: {builder.rera_number}
              </div>
            )}
            {builder.certifications && (
              <div className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Award className="h-3.5 w-3.5" /> {builder.certifications}
              </div>
            )}
            {builder.years_of_experience > 15 && (
              <div className="flex items-center gap-2 text-xs p-2.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Award className="h-3.5 w-3.5" /> Established ({builder.years_of_experience}+ years)
              </div>
            )}
          </CardContent>
        </Card>

        {offices.length > 0 && (
          <Card className={cn(
            tier === "luxury" ? "bg-[#161616] border-amber-500/15" : tier === "budget" ? "bg-white dark:bg-slate-900 border-blue-100 dark:border-blue-800/30" : ""
          )}>
            <CardContent className="p-6">
              <h3 className={cn("font-semibold text-sm flex items-center gap-2 mb-3", tier === "luxury" ? "text-amber-100" : "")}>
                <MapPin className="h-4 w-4 text-primary" /> Office Locations
              </h3>
              <div className="space-y-2">
                {offices.map((office: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-muted/50 text-xs">
                    <p className="font-medium">{office.city}</p>
                    <p className="text-muted-foreground mt-0.5">{office.address}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BuilderMicrositeContact;
