import { Card, CardContent } from "@/components/ui/card";
import { Users, User } from "lucide-react";

interface Props {
  keyPeople: any[];
}

const BuilderTeamSection = ({ keyPeople }: Props) => {
  const people = Array.isArray(keyPeople) ? keyPeople : [];
  if (people.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" /> Leadership Team
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {people.map((person: any, i: number) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border bg-muted/30">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {person.photo ? (
                  <img src={person.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{person.name}</p>
                <p className="text-xs text-muted-foreground truncate">{person.role}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BuilderTeamSection;
