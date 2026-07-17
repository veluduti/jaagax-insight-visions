import { PropsWithChildren, useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Leaf, Menu, X, LayoutDashboard, LogOut, UserCircle2 } from "lucide-react";
import { useNLAuth } from "./useNLAuth";
import "./theme.css";

const NAV = [
  { label: "List Your Land", to: "/natural-living/list-land", highlight: true },
  { label: "Vision", to: "/natural-living/vision" },
  { label: "Digital Farm", to: "/natural-living/digital-farm" },
  { label: "Marketplace", to: "/natural-living/marketplace" },
  { label: "Villages", to: "/natural-living/villages" },
  { label: "Farms", to: "/natural-living/farms" },
  { label: "Farmers", to: "/natural-living/farmers" },
  { label: "Farm Stay", to: "/natural-living/farm-stay" },
  { label: "Wellness", to: "/natural-living/wellness" },
  { label: "Corporate", to: "/natural-living/corporate" },
  { label: "Schools", to: "/natural-living/schools" },
  { label: "Community", to: "/natural-living/community" },
  { label: "Blog", to: "/natural-living/blog" },
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
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useNLAuth();
  const isAuthed = !!user;
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "Account";
  const initial = (displayName?.[0] || "A").toUpperCase();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    setOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    setMenuOpen(false);
    navigate("/natural-living");
  };

  return (
    <div className="nl-scope min-h-screen flex flex-col">
      {/* Announcement bar */}
      <div
        className="w-full text-center py-2 text-[11px] tracking-[0.24em] uppercase"
        style={{
          background: "hsl(var(--nl-forest))",
          color: "hsl(var(--nl-cream))",
        }}
      >
        JAGAA Natural Living · A quieter way to live, eat, and belong
      </div>

      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: "hsl(var(--nl-cream) / 0.92)",
          backdropFilter: "blur(8px)",
          borderColor: "hsl(var(--border))",
        }}
      >
        <div className="nl-container flex items-center justify-between h-16 md:h-20 gap-3">
          <Link to="/natural-living" className="flex items-center gap-2 min-w-0">
            <Leaf className="h-5 w-5" style={{ color: "hsl(var(--nl-forest))" }} />
            <span className="nl-serif text-base md:text-xl truncate" style={{ color: "hsl(var(--nl-forest))" }}>
              JAGAA <span style={{ fontStyle: "italic" }}>Natural Living</span>
            </span>
          </Link>

          <nav className="hidden xl:flex items-center gap-3 2xl:gap-6 min-w-0">
            {NAV.slice(0, 7).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                    `text-[12px] 2xl:text-[13px] tracking-wide transition-colors whitespace-nowrap ${
                    item.highlight
                      ? "px-3 py-1.5 rounded-full font-medium"
                      : isActive
                      ? "text-[hsl(var(--nl-forest))] font-medium"
                      : "text-[hsl(var(--nl-ink)/0.7)] hover:text-[hsl(var(--nl-forest))]"
                  }`
                }
                style={
                  item.highlight
                    ? { background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }
                    : undefined
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden xl:flex items-center gap-2 2xl:gap-3 shrink-0">
            {!isAuthed ? (
              <>
                <Link to="/natural-living/auth" className="text-[12px] xl:text-[13px] tracking-wide text-[hsl(var(--nl-ink)/0.7)] hover:text-[hsl(var(--nl-forest))] whitespace-nowrap">
                  Sign in
                </Link>
                <Link to="/natural-living/auth?next=/natural-living/onboarding" className="nl-btn nl-btn-primary text-[12px] xl:text-[13px]">
                  Join
                </Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-[hsl(var(--nl-forest)/0.08)]"
                >
                  <span
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ background: "hsl(var(--nl-forest))", color: "hsl(var(--nl-cream))" }}
                  >
                    {initial}
                  </span>
                  <span className="text-[12px] xl:text-[13px] font-medium text-[hsl(var(--nl-forest))] max-w-[120px] truncate">
                    {displayName}
                  </span>
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-lg border shadow-lg py-1 z-50"
                    style={{ background: "hsl(var(--nl-cream))", borderColor: "hsl(var(--border))" }}
                  >
                    <Link
                      to="/natural-living/land-owner"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--nl-ink))] hover:bg-[hsl(var(--nl-forest)/0.08)]"
                    >
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link
                      to="/natural-living/onboarding"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--nl-ink))] hover:bg-[hsl(var(--nl-forest)/0.08)]"
                    >
                      <UserCircle2 className="h-4 w-4" /> Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[hsl(var(--nl-ink))] hover:bg-[hsl(var(--nl-forest)/0.08)]"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
            <Link to="/" className="text-[10px] xl:text-[11px] tracking-[0.2em] uppercase text-[hsl(var(--nl-muted))] hover:text-[hsl(var(--nl-forest))] whitespace-nowrap">
              JAAGA X →
            </Link>
          </div>

          <button
            aria-label="Menu"
            className="xl:hidden p-2 -mr-2"
            onClick={() => setOpen((v) => !v)}
            style={{ color: "hsl(var(--nl-forest))" }}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div
            className="xl:hidden border-t"
            style={{ background: "hsl(var(--nl-cream))", borderColor: "hsl(var(--border))" }}
          >
            <div className="nl-container py-4 flex flex-col gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `py-2.5 text-sm ${
                      isActive
                        ? "text-[hsl(var(--nl-forest))] font-medium"
                        : "text-[hsl(var(--nl-ink)/0.75)]"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <Link to="/natural-living/auth" className="nl-btn nl-btn-outline mt-3 justify-center">
                Sign in
              </Link>
              <Link to="/natural-living/auth?next=/natural-living/onboarding" className="nl-btn nl-btn-primary mt-2 justify-center">
                Join Natural Living
              </Link>
            </div>
          </div>
        )}
      </header>

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
