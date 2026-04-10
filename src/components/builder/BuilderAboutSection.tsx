import { Badge } from "@/components/ui/badge";
import { Shield, Award, Target, Eye, Briefcase } from "lucide-react";

interface Props {
  builder: any;
  tier?: string;
}

const BuilderAboutSection = ({ builder, tier = "standard" }: Props) => {
  return (
    <div className="space-y-4">
      {builder.description && (
        <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06]">
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3 text-zinc-200">
            <Briefcase className="h-4 w-4 text-violet-400" /> About {builder.builder_name}
          </h2>
          <p className="text-zinc-400 leading-relaxed text-sm">{builder.description}</p>
        </div>
      )}

      {(builder.about_mission || builder.about_vision) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {builder.about_mission && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-500/[0.04] to-transparent border border-violet-500/[0.08]">
              <h3 className="font-semibold flex items-center gap-2 mb-2 text-sm text-zinc-200">
                <Target className="h-4 w-4 text-violet-400" /> Our Mission
              </h3>
              <p className="text-sm text-zinc-400">{builder.about_mission}</p>
            </div>
          )}
          {builder.about_vision && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/[0.04] to-transparent border border-blue-500/[0.08]">
              <h3 className="font-semibold flex items-center gap-2 mb-2 text-sm text-zinc-200">
                <Eye className="h-4 w-4 text-blue-400" /> Our Vision
              </h3>
              <p className="text-sm text-zinc-400">{builder.about_vision}</p>
            </div>
          )}
        </div>
      )}

      {builder.specializations?.length > 0 && (
        <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06]">
          <h3 className="font-semibold flex items-center gap-2 mb-3 text-sm text-zinc-200">
            <Shield className="h-4 w-4 text-violet-400" /> Specializations
          </h3>
          <div className="flex flex-wrap gap-2">
            {builder.specializations.map((s: string) => (
              <Badge key={s} className="text-xs rounded-full bg-violet-500/[0.08] text-violet-300 border border-violet-500/[0.15] hover:bg-violet-500/[0.12]">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {builder.awards?.length > 0 && (
        <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06]">
          <h3 className="font-semibold flex items-center gap-2 mb-3 text-sm text-zinc-200">
            <Award className="h-4 w-4 text-amber-400" /> Awards & Recognition
          </h3>
          <div className="space-y-2">
            {builder.awards.map((a: string, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/[0.04] border border-amber-500/[0.08]">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 opacity-80 flex items-center justify-center flex-shrink-0">
                  <Award className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm text-zinc-300">{a}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(builder.certifications || builder.rera_number || builder.company_registration_number) && (
        <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06]">
          <h3 className="font-semibold flex items-center gap-2 mb-3 text-sm text-zinc-200">
            <Shield className="h-4 w-4 text-emerald-400" /> Legal & Compliance
          </h3>
          <div className="space-y-2 text-sm">
            {builder.rera_number && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/[0.08]">
                <span className="text-zinc-500">RERA Number</span>
                <span className="font-mono font-medium text-emerald-400">{builder.rera_number}</span>
              </div>
            )}
            {builder.company_registration_number && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-zinc-500">Company Registration</span>
                <span className="font-mono font-medium text-xs text-zinc-300">{builder.company_registration_number}</span>
              </div>
            )}
            {builder.certifications && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-zinc-500">Certifications</span>
                <span className="font-medium text-zinc-300">{builder.certifications}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BuilderAboutSection;
