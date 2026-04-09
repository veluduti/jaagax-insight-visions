import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Award, Target, Eye, Briefcase } from "lucide-react";

interface Props {
  builder: any;
}

const BuilderAboutSection = ({ builder }: Props) => {
  return (
    <div className="space-y-4">
      {/* About */}
      {builder.description && (
        <Card>
          <CardContent className="p-5">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Briefcase className="h-5 w-5 text-primary" /> About {builder.builder_name}
            </h2>
            <p className="text-muted-foreground leading-relaxed text-sm">{builder.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Mission & Vision */}
      {(builder.about_mission || builder.about_vision) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {builder.about_mission && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-5">
                <h3 className="font-semibold flex items-center gap-2 mb-2 text-sm">
                  <Target className="h-4 w-4 text-primary" /> Our Mission
                </h3>
                <p className="text-sm text-muted-foreground">{builder.about_mission}</p>
              </CardContent>
            </Card>
          )}
          {builder.about_vision && (
            <Card className="bg-accent/50 border-accent">
              <CardContent className="p-5">
                <h3 className="font-semibold flex items-center gap-2 mb-2 text-sm">
                  <Eye className="h-4 w-4 text-primary" /> Our Vision
                </h3>
                <p className="text-sm text-muted-foreground">{builder.about_vision}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Specializations */}
      {builder.specializations?.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3 text-sm">
              <Shield className="h-4 w-4 text-primary" /> Specializations
            </h3>
            <div className="flex flex-wrap gap-2">
              {builder.specializations.map((s: string) => (
                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Awards */}
      {builder.awards?.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3 text-sm">
              <Award className="h-4 w-4 text-amber-500" /> Awards & Recognition
            </h3>
            <div className="space-y-2">
              {builder.awards.map((a: string, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Award className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="text-sm">{a}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certifications & RERA */}
      {(builder.certifications || builder.rera_number || builder.company_registration_number) && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3 text-sm">
              <Shield className="h-4 w-4 text-emerald-500" /> Legal & Compliance
            </h3>
            <div className="space-y-2 text-sm">
              {builder.rera_number && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">RERA Number</span>
                  <span className="font-mono font-medium">{builder.rera_number}</span>
                </div>
              )}
              {builder.company_registration_number && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Company Registration (CIN)</span>
                  <span className="font-mono font-medium text-xs">{builder.company_registration_number}</span>
                </div>
              )}
              {builder.certifications && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Certifications</span>
                  <span className="font-medium">{builder.certifications}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BuilderAboutSection;
