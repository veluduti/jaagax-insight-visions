import { lazy, Suspense, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Search, Sparkles, Building2, Banknote } from "lucide-react";
import { CardGridSkeleton } from "@/components/shared";
import CustomerOverview from "@/features/customer/CustomerOverview";

const BuyerDashboard = lazy(() => import("./BuyerDashboard"));
const SellerDashboard = lazy(() => import("./SellerDashboard"));
const BuilderDashboard = lazy(() => import("./BuilderDashboard"));
const MyLoanApplications = lazy(() => import("@/features/customer/MyLoanApplications"));

/** Section anchors inside the single unified Customer view. */
const SECTIONS = [
  { id: "buying", label: "Buy & Explore", icon: Search },
  { id: "selling", label: "Sell & Track", icon: Sparkles },
  { id: "builder", label: "Projects", icon: Building2 },
  { id: "loans", label: "Loans", icon: Banknote },
] as const;

function scrollToSection(id: string) {
  const el = document.getElementById(`customer-${id}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function SectionHeader({
  id,
  title,
  description,
  icon: Icon,
}: {
  id: string;
  title: string;
  description: string;
  icon: typeof Search;
}) {
  return (
    <div id={`customer-${id}`} className="scroll-mt-24 border-b border-border/60 pb-5">
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/10">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Unified Customer Dashboard — one single customer view containing every
 * service (buying, selling, projects, loans) as stacked sections.
 */
export default function CustomerDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Legacy links used ?view=selling etc. — jump to the matching section.
  const viewParam = searchParams.get("view");
  useEffect(() => {
    if (viewParam && SECTIONS.some((s) => s.id === viewParam)) {
      const t = setTimeout(() => scrollToSection(viewParam), 350);
      return () => clearTimeout(t);
    }
  }, [viewParam]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/[0.06]">
      <Navigation />

      {/* Header */}
      <div className="border-b border-border/60 bg-background/60 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-lg font-semibold shadow-sm shadow-primary/20">
                {(user?.email?.[0] || "C").toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Welcome back,{" "}
                  <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    {user?.email?.split("@")[0] || "Customer"}
                  </span>
                  !
                </h1>
                <p className="text-muted-foreground mt-1">
                  One customer space — buy, sell, build and finance in a single view
                </p>
              </div>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="rounded-full hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Section nav pills */}
          <div className="mt-7 flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                size="sm"
                className="gap-2 rounded-full border-border/70 bg-background/80 shadow-sm hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all"
                onClick={() => scrollToSection(s.id)}
              >
                <s.icon className="h-4 w-4" />
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 py-10 space-y-14">
        <CustomerOverview onNavigateTab={scrollToSection} />

        <section className="space-y-6 rounded-3xl border border-border/60 bg-card/40 p-5 sm:p-7 shadow-sm">
          <SectionHeader
            id="buying"
            title="Buy & Explore"
            description="Search properties, saved homes, visits and hotel bookings"
            icon={Search}
          />
          <Suspense fallback={<CardGridSkeleton />}>
            <BuyerDashboard embedded />
          </Suspense>
        </section>

        <section className="space-y-6 rounded-3xl border border-border/60 bg-card/40 p-5 sm:p-7 shadow-sm">
          <SectionHeader
            id="selling"
            title="Sell & Track"
            description="Your listings, enquiries and selling activity"
            icon={Sparkles}
          />
          <Suspense fallback={<CardGridSkeleton />}>
            <SellerDashboard embedded />
          </Suspense>
        </section>

        <section className="space-y-6 rounded-3xl border border-border/60 bg-card/40 p-5 sm:p-7 shadow-sm">
          <SectionHeader
            id="builder"
            title="Projects"
            description="Projects, builder profile and leads"
            icon={Building2}
          />
          <Suspense fallback={<CardGridSkeleton />}>
            <BuilderDashboard embedded />
          </Suspense>
        </section>

        <section className="space-y-6 rounded-3xl border border-border/60 bg-card/40 p-5 sm:p-7 shadow-sm">
          <SectionHeader
            id="loans"
            title="Loans"
            description="Home loan applications and their live status"
            icon={Banknote}
          />
          <Suspense fallback={<CardGridSkeleton />}>
            <MyLoanApplications />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
