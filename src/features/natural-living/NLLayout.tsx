import { PropsWithChildren, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Leaf } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useNLAuth } from "./useNLAuth";
import "./theme.css";

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
  const { user, profile } = useNLAuth();
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "";
  const initial = (displayName?.[0] || "A").toUpperCase();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="nl-scope min-h-screen flex flex-col bg-background">
      {/* Shared JAAGAX Header (center nav swaps to Natural Living items automatically) */}
      <Navigation />

      {/* Natural Living Identity Bar — persistent thin bar (40-48px) */}
      <div
        className="sticky top-16 xl:top-[68px] z-30 border-b border-border/50 bg-background/85 backdrop-blur-md"
      >
        <div className="container-padding">
          <div className="max-w-7xl 3xl:max-w-[1680px] mx-auto flex items-center justify-between h-11">
            <Link to="/natural-living" className="flex items-center gap-2 min-w-0">
              <Leaf className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">
                JAGAA <span className="italic text-emerald-600 dark:text-emerald-400">Natural Living</span>
              </span>
            </Link>
            {user && (
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                >
                  {initial}
                </span>
                <span className="text-xs font-medium text-muted-foreground truncate max-w-[140px]">
                  {displayName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer
        className="mt-24 pt-20 pb-10 border-t"
        style={{
          background: "hsl(var(--nl-cream-deep))",
          borderColor: "hsl(var(--nl-forest) / 0.2)",
        }}
      >
        <div className="nl-container">
          <div className="grid gap-12 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="h-5 w-5" style={{ color: "hsl(var(--nl-forest))" }} />
                <span className="nl-serif text-lg" style={{ color: "hsl(var(--nl-forest))" }}>
                  JAGAA
                </span>
              </div>
              <p className="nl-serif italic text-lg leading-snug" style={{ color: "hsl(var(--nl-forest))" }}>
                Return to the land. Slowly, deliberately, together.
              </p>
              <p className="text-sm mt-4 text-[hsl(var(--nl-ink)/0.7)] leading-relaxed">
                A community-owned ecosystem for organic farming, village tourism, farm stays, and mindful living — rooted in India.
              </p>
            </div>

            {FOOTER_COLS.map((col) => (
              <div key={col.heading}>
                <h4 className="nl-eyebrow mb-4">{col.heading}</h4>
                <ul className="space-y-2.5">
                  {col.items.map((it) => (
                    <li key={it.to}>
                      <Link to={it.to} className="text-sm text-[hsl(var(--nl-ink)/0.75)] hover:text-[hsl(var(--nl-forest))] transition-colors">
                        {it.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="nl-rule my-10" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-[hsl(var(--nl-ink)/0.6)]">
            <div>© {new Date().getFullYear()} JAGAA Natural Living · A JAAGA X initiative</div>
            <div className="flex gap-6">
              <Link to="/natural-living/faq" className="hover:text-[hsl(var(--nl-forest))]">FAQ</Link>
              <Link to="/natural-living/contact" className="hover:text-[hsl(var(--nl-forest))]">Contact</Link>
              <Link to="/" className="hover:text-[hsl(var(--nl-forest))]">Back to JAAGA X</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
