import { Badge } from "@/components/ui/badge";
import { Shield, Award, Target, Eye, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  builder: any;
  tier?: string;
}

const tierCard = {
  luxury: "bg-[#0f1510]/80 backdrop-blur-md border border-[#2a3a20]/40 rounded-2xl",
  standard: "bg-white/80 dark:bg-[#141a12]/60 backdrop-blur-md border border-[#d4e0d0] dark:border-[#1e2e1a]/50 rounded-2xl",
  budget: "bg-white dark:bg-slate-800/60 border border-blue-100 dark:border-blue-800/30 rounded-2xl",
};

const tierText = {
  luxury: "text-[#c8b882]",
  standard: "text-[#2a3a28] dark:text-[#d0daca]",
  budget: "text-slate-800 dark:text-white",
};

const tierIcon = {
  luxury: "text-[#c8b882]",
  standard: "text-[#2a5a24] dark:text-emerald-400",
  budget: "text-blue-600 dark:text-blue-400",
};

const tierMissionCard = {
  luxury: "bg-[#1a2a14]/60 border border-[#2a3a20]/40 rounded-2xl",
  standard: "bg-[#eaf2e8]/60 dark:bg-[#1a2a14]/40 border border-[#d4e0d0]/60 dark:border-[#2a3a20]/30 rounded-2xl",
  budget: "bg-blue-50/60 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-2xl",
};

const tierAwardRow = {
  luxury: "bg-[#c8b882]/5 border border-[#c8b882]/10 rounded-xl",
  standard: "bg-amber-500/5 border border-amber-500/10 rounded-xl",
  budget: "bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/20 rounded-xl",
};

const BuilderAboutSection = ({ builder, tier = "standard" }: Props) => {
  const card = tierCard[tier as keyof typeof tierCard] || tierCard.standard;
  const heading = tierText[tier as keyof typeof tierText] || tierText.standard;
  const icon = tierIcon[tier as keyof typeof tierIcon] || tierIcon.standard;
  const missionCard = tierMissionCard[tier as keyof typeof tierMissionCard] || tierMissionCard.standard;
  const awardRow = tierAwardRow[tier as keyof typeof tierAwardRow] || tierAwardRow.standard;

  return (
    <div className="space-y-4">
      {/* About */}
      {builder.description && (
        <div className={cn("p-6", card)}>
          <h2 className={cn("text-base font-semibold flex items-center gap-2 mb-3", heading)}>
            <Briefcase className={cn("h-4 w-4", icon)} /> About {builder.builder_name}
          </h2>
          <p className="text-muted-foreground leading-relaxed text-sm">{builder.description}</p>
        </div>
      )}

      {/* Mission & Vision */}
      {(builder.about_mission || builder.about_vision) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {builder.about_mission && (
            <div className={cn("p-5", missionCard)}>
              <h3 className={cn("font-semibold flex items-center gap-2 mb-2 text-sm", heading)}>
                <Target className={cn("h-4 w-4", icon)} /> Our Mission
              </h3>
              <p className="text-sm text-muted-foreground">{builder.about_mission}</p>
            </div>
          )}
          {builder.about_vision && (
            <div className={cn("p-5", missionCard)}>
              <h3 className={cn("font-semibold flex items-center gap-2 mb-2 text-sm", heading)}>
                <Eye className={cn("h-4 w-4", icon)} /> Our Vision
              </h3>
              <p className="text-sm text-muted-foreground">{builder.about_vision}</p>
            </div>
          )}
        </div>
      )}

      {/* Specializations */}
      {builder.specializations?.length > 0 && (
        <div className={cn("p-6", card)}>
          <h3 className={cn("font-semibold flex items-center gap-2 mb-3 text-sm", heading)}>
            <Shield className={cn("h-4 w-4", icon)} /> Specializations
          </h3>
          <div className="flex flex-wrap gap-2">
            {builder.specializations.map((s: string) => (
              <Badge
                key={s}
                variant="secondary"
                className={cn(
                  "text-xs rounded-lg",
                  tier === "luxury" ? "bg-[#1a2a14] text-[#8a9a78] border border-[#2a3a20]/40" : ""
                )}
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Awards */}
      {builder.awards?.length > 0 && (
        <div className={cn("p-6", card)}>
          <h3 className={cn("font-semibold flex items-center gap-2 mb-3 text-sm", heading)}>
            <Award className="h-4 w-4 text-amber-500" /> Awards & Recognition
          </h3>
          <div className="space-y-2">
            {builder.awards.map((a: string, i: number) => (
              <div key={i} className={cn("flex items-center gap-3 p-3", awardRow)}>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Award className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-sm">{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legal */}
      {(builder.certifications || builder.rera_number || builder.company_registration_number) && (
        <div className={cn("p-6", card)}>
          <h3 className={cn("font-semibold flex items-center gap-2 mb-3 text-sm", heading)}>
            <Shield className="h-4 w-4 text-emerald-500" /> Legal & Compliance
          </h3>
          <div className="space-y-2 text-sm">
            {builder.rera_number && (
              <div className={cn("flex items-center justify-between p-3 rounded-xl",
                tier === "luxury" ? "bg-[#0c0f0a]/60 border border-[#2a3a20]/30" : "bg-muted/50"
              )}>
                <span className="text-muted-foreground">RERA Number</span>
                <span className="font-mono font-medium">{builder.rera_number}</span>
              </div>
            )}
            {builder.company_registration_number && (
              <div className={cn("flex items-center justify-between p-3 rounded-xl",
                tier === "luxury" ? "bg-[#0c0f0a]/60 border border-[#2a3a20]/30" : "bg-muted/50"
              )}>
                <span className="text-muted-foreground">Company Registration</span>
                <span className="font-mono font-medium text-xs">{builder.company_registration_number}</span>
              </div>
            )}
            {builder.certifications && (
              <div className={cn("flex items-center justify-between p-3 rounded-xl",
                tier === "luxury" ? "bg-[#0c0f0a]/60 border border-[#2a3a20]/30" : "bg-muted/50"
              )}>
                <span className="text-muted-foreground">Certifications</span>
                <span className="font-medium">{builder.certifications}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BuilderAboutSection;
