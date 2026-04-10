import { Users, User } from "lucide-react";

interface Props {
  keyPeople: any[];
}

const BuilderTeamSection = ({ keyPeople }: Props) => {
  const people = Array.isArray(keyPeople) ? keyPeople : [];
  if (people.length === 0) return null;

  return (
    <div className="p-6 rounded-2xl bg-white/[0.03] backdrop-blur-md border border-white/[0.06]">
      <h2 className="text-sm font-semibold flex items-center gap-2 mb-4 text-zinc-200">
        <Users className="h-4 w-4 text-violet-400" /> Leadership Team
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {people.map((person: any, i: number) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.1] transition-all group">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/[0.06]">
              {person.photo ? (
                <img src={person.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="h-5 w-5 text-violet-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-zinc-200 truncate">{person.name}</p>
              <p className="text-xs text-zinc-500 truncate">{person.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BuilderTeamSection;
