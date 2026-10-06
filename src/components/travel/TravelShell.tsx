import { Link, useLocation } from "react-router-dom";
import { Camera, Compass, Heart, Map, Sparkles, UserRound, Users, Wand2, MessagesSquare } from "lucide-react";
import Navigation from "@/components/Navigation";
import { cn } from "@/lib/utils";

const links = [
  { label: "Home", path: "/travel", icon: Compass },
  { label: "Explore", path: "/travel/explore", icon: Map },
  { label: "Inspire", path: "/travel/inspire", icon: Wand2 },
  { label: "Journeys", path: "/travel/journeys", icon: Users },
  { label: "Community", path: "/travel/communities", icon: MessagesSquare },
  { label: "Memories", path: "/travel/memories", icon: Camera },
  { label: "Plans", path: "/travel/plans", icon: Sparkles },
  { label: "Saved", path: "/travel/saved", icon: Heart },
  { label: "Profile", path: "/travel/profile", icon: UserRound },
];

export default function TravelShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <div className="min-h-screen bg-background pb-24 xl:pb-0">
    <Navigation />
    <div className="sticky top-16 xl:top-[68px] z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full flex-col items-end gap-2 px-3 py-2 md:flex-row md:items-center md:justify-between">
        <Link to="/travel" className="self-start shrink-0 font-semibold text-foreground"><span className="text-primary">JAAGA</span> TRAVEL</Link>
        <nav aria-label="Travel navigation" className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-1">
          {links.map(({ label, path, icon: Icon }) => <Link key={path} to={path} className={cn("flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium", location.pathname === path || (path === "/travel/plans" && location.pathname === "/travel/plan") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}><Icon className="h-4 w-4" />{label}</Link>)}
        </nav>
      </div>
    </div>
    {children}
  </div>;
}
