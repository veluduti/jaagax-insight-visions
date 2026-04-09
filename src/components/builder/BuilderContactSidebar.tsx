import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, Mail, Globe, MapPin, Shield, Award, ExternalLink } from "lucide-react";

interface Props {
  builder: any;
}

const socialIcons: Record<string, string> = {
  linkedin: "🔗",
  facebook: "📘",
  instagram: "📷",
  youtube: "🎬",
  twitter: "🐦",
};

const BuilderContactSidebar = ({ builder }: Props) => {
  const offices = Array.isArray(builder.office_addresses) ? builder.office_addresses : [];

  return (
    <div className="space-y-4">
      {/* Contact Card */}
      <Card className="shadow-lg border-primary/10">
        <CardContent className="p-5 space-y-3">
          <h3 className="font-semibold text-base">Get in Touch</h3>

          <Button className="w-full" onClick={() => window.open(`tel:${builder.phone}`)}>
            <Phone className="h-4 w-4 mr-2" /> Call Now
          </Button>
          {builder.whatsapp && (
            <Button variant="outline" className="w-full border-emerald-500/30 text-emerald-600 hover:bg-emerald-50" onClick={() => window.open(`https://wa.me/${builder.whatsapp.replace(/[^0-9]/g, "")}`)}>
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
          )}
          {builder.email && (
            <Button variant="outline" className="w-full" onClick={() => window.open(`mailto:${builder.email}`)}>
              <Mail className="h-4 w-4 mr-2" /> Email
            </Button>
          )}
          {builder.website && (
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground" onClick={() => window.open(builder.website, "_blank")}>
              <Globe className="h-3.5 w-3.5 mr-1" /> {builder.website.replace(/https?:\/\//, "")}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Trust Badges */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-500" /> Trust & Verification
          </h3>
          {builder.rera_number && (
            <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-emerald-500/10">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>RERA Registered</span>
            </div>
          )}
          {builder.certifications && (
            <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-blue-500/10">
              <Award className="h-3.5 w-3.5 text-blue-500" />
              <span>{builder.certifications}</span>
            </div>
          )}
          {builder.years_of_experience > 15 && (
            <div className="flex items-center gap-2 text-xs p-2 rounded-lg bg-amber-500/10">
              <Award className="h-3.5 w-3.5 text-amber-500" />
              <span>Established Developer ({builder.years_of_experience}+ years)</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Links */}
      {builder.social_links && Object.keys(builder.social_links).length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm mb-3">Follow Us</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(builder.social_links).map(([platform, url]) => (
                <Button key={platform} variant="outline" size="sm" className="text-xs capitalize gap-1.5"
                  onClick={() => window.open(url as string, "_blank")}>
                  {socialIcons[platform] || "🔗"} {platform}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Office Addresses */}
      {offices.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" /> Office Locations
            </h3>
            <div className="space-y-2">
              {offices.map((office: any, i: number) => (
                <div key={i} className="p-2.5 rounded-lg bg-muted/50 text-xs">
                  <p className="font-medium text-foreground">{office.city}</p>
                  <p className="text-muted-foreground mt-0.5">{office.address}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BuilderContactSidebar;
