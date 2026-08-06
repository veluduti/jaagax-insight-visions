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
    <div id={`customer-${id}`} className="scroll-mt-24 border-b pb-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />

      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome back, {user?.email?.split("@")[0] || "Customer"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              One customer space — buy, sell, build and finance in a single view
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map((s) => (
            <Button
              key={s.id}
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => scrollToSection(s.id)}
            >
              <s.icon className="h-4 w-4" />
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pb-12 space-y-12">
        <CustomerOverview onNavigateTab={scrollToSection} />

        <section className="space-y-6">
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

        <section className="space-y-6">
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

        <section className="space-y-6">
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

        <section className="space-y-6">
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
