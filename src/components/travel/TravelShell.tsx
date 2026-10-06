import { Link, useLocation } from "react-router-dom";
import { Compass, Heart, Hotel, Map, Sparkles, UserRound } from "lucide-react";
import Navigation from "@/components/Navigation";
import { cn } from "@/lib/utils";

const links = [
  { label: "Home", path: "/travel", icon: Compass },
  { label: "Explore", path: "/travel/explore", icon: Map },
  { label: "Plans", path: "/travel/plans", icon: Sparkles },
  { label: "Stays", path: "/hotels", icon: Hotel },
  { label: "Saved", path: "/travel/saved", icon: Heart },
  { label: "Profile", path: "/travel/profile", icon: UserRound },
];

export default function TravelShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <div className="min-h-screen bg-background pb-24 xl:pb-0">
    <Navigation />
    <div className="sticky top-16 xl:top-[68px] z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link to="/travel" className="mr-4 shrink-0 font-semibold text-foreground"><span className="text-primary">JAAGA</span> TRAVEL</Link>
        {links.map(({ label, path, icon: Icon }) => <Link key={path} to={path} className={cn("flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium", location.pathname === path ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}><Icon className="h-4 w-4" />{label}</Link>)}
      </div>
    </div>
    {children}
  </div>;
}
