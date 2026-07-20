import { PropsWithChildren, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Leaf, FileEdit, Eye, Sprout, Store, Landmark, TreePine } from "lucide-react";
import Navigation from "@/components/Navigation";

import { cn } from "@/lib/utils";
import "./theme.css";

const NL_NAV_ITEMS: Array<{ label: string; path: string; icon: any; highlight?: boolean }> = [
  { label: "List Your Land", path: "/natural-living/list-land", icon: FileEdit, highlight: true },
  { label: "Lands", path: "/natural-living/lands", icon: Eye },
  { label: "Vision", path: "/natural-living/vision", icon: Leaf },
  { label: "Digital Farm", path: "/natural-living/digital-farm", icon: Sprout },
  { label: "Marketplace", path: "/natural-living/marketplace", icon: Store },
  { label: "Villages", path: "/natural-living/villages", icon: Landmark },
  { label: "Farms", path: "/natural-living/farms", icon: TreePine },
];

const FOOTER_COLS = [
  {
    heading: "Explore",
    items: [
      { label: "Vision", to: "/natural-living/vision" },
      { label: "Why JAGAA", to: "/natural-living/why" },
      { label: "About", to: "/natural-living/about" },
      { label: "Storytelling", to: "/natural-living/stories" },
      { label: "Impact", to: "/natural-living/impact" },
      { label: "Sustainability", to: "/natural-living/sustainability" },
    ],
  },
  {
    heading: "Discover",
    items: [
      { label: "Villages", to: "/natural-living/villages" },
      { label: "Farms", to: "/natural-living/farms" },
      { label: "Farmers", to: "/natural-living/farmers" },
      { label: "Farm Stay", to: "/natural-living/farm-stay" },
      { label: "Wellness", to: "/natural-living/wellness" },
      { label: "Success Stories", to: "/natural-living/success-stories" },
    ],
  },
  {
    heading: "Partner",
    items: [
      { label: "Corporate", to: "/natural-living/corporate" },
      { label: "Schools", to: "/natural-living/schools" },
      { label: "Partner With Us", to: "/natural-living/partner" },
      { label: "Pricing", to: "/natural-living/pricing" },
      { label: "FAQ", to: "/natural-living/faq" },
      { label: "Contact", to: "/natural-living/contact" },
    ],
  },
];

export default function NLLayout({ children }: PropsWithChildren) {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div className="nl-scope min-h-screen flex flex-col bg-background">
      {/* Shared JAAGAX Header */}
      <Navigation />

      {/* Thin light-green divider between platform header and module header */}
      <div className="sticky top-16 xl:top-[68px] z-30 h-px bg-primary/25" aria-hidden />

      {/* Natural Living Module Nav Bar */}
      <div className="sticky top-[calc(4rem+1px)] xl:top-[69px] z-30 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="container-padding">
          <div className="max-w-7xl 3xl:max-w-[1680px] mx-auto relative flex items-center h-12 min-w-0">
            {/* Left: NL identity */}
            <Link to="/natural-living" className="flex items-center gap-2 shrink-0">
              <Leaf className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                JAGAA <span className="italic text-primary">Natural Living</span>
              </span>
            </Link>

            {/* Center: NL nav items — perfectly centered */}
            <nav className="absolute left-1/2 -translate-x-1/2 max-w-full overflow-x-auto no-scrollbar">
              <ul className="flex items-center gap-5 md:gap-6 lg:gap-7">
                {NL_NAV_ITEMS.map((item) => {
                  const active = isActive(item.path);
                  const Icon = item.icon;
                  return (
                    <li key={item.path} className="shrink-0">
                      <Link
                        to={item.path}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap leading-none",
                          item.highlight
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : active
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>
      </div>

      <main className="flex-1">{children}</main>

      {/* Footer — JAAGAX tokens */}
      <footer className="mt-24 pt-16 pb-10 border-t border-border/50 bg-muted/30">
        <div className="container-padding">
          <div className="max-w-7xl 3xl:max-w-[1680px] mx-auto">
            <div className="grid gap-12 md:grid-cols-4">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Leaf className="h-5 w-5 text-primary" />
                  <span className="text-lg font-semibold text-foreground">JAGAA</span>
                </div>
                <p className="italic text-lg leading-snug text-foreground">
                  Return to the land. Slowly, deliberately, together.
                </p>
                <p className="text-sm mt-4 text-muted-foreground leading-relaxed">
                  A community-owned ecosystem for organic farming, village tourism, farm stays,
                  and mindful living — rooted in India.
                </p>
              </div>

              {FOOTER_COLS.map((col) => (
                <div key={col.heading}>
                  <h4 className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">
                    {col.heading}
                  </h4>
                  <ul className="space-y-2.5">
                    {col.items.map((it) => (
                      <li key={it.to}>
                        <Link
                          to={it.to}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {it.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="h-px bg-border my-10" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-muted-foreground">
              <div>© {new Date().getFullYear()} JAGAA Natural Living · A JAAGA X initiative</div>
              <div className="flex gap-6">
                <Link to="/natural-living/faq" className="hover:text-foreground">FAQ</Link>
                <Link to="/natural-living/contact" className="hover:text-foreground">Contact</Link>
                <Link to="/" className="hover:text-foreground">Back to JAAGA X</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
