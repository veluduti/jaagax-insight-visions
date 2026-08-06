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
import { cn } from "@/lib/utils";

const BuyerDashboard = lazy(() => import("./BuyerDashboard"));
const SellerDashboard = lazy(() => import("./SellerDashboard"));
const BuilderDashboard = lazy(() => import("./BuilderDashboard"));
const MyLoanApplications = lazy(() => import("@/features/customer/MyLoanApplications"));

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
    <div id={`customer-${id}`} className="scroll-mt-28 rounded-2xl border border-blue-100 bg-white/90 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
          <Icon className="h-5 w-5" />
        </span>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-blue-100 bg-white/95 p-5 md:p-6 shadow-[0_10px_30px_rgba(37,99,235,0.08)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function CustomerDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fbff_28%,#ffffff_100%)]">
      <Navigation />

      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pt-8 md:pt-10 pb-6">
        <div className="rounded-3xl border border-blue-100 bg-white/90 px-6 py-6 shadow-[0_10px_30px_rgba(37,99,235,0.08)] backdrop-blur-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                Welcome back, <span className="text-blue-600">{user?.email?.split("@")[0] || "Customer"}</span>!
              </h1>
              <p className="mt-2 text-sm md:text-base text-slate-500">
                One customer space - buy, sell, build and finance in a single view
              </p>
            </div>

            <Button
              onClick={handleSignOut}
              variant="outline"
              className="border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {SECTIONS.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                size="sm"
                onClick={() => scrollToSection(s.id)}
                className="rounded-full border-blue-200 bg-white text-slate-700 shadow-sm hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                <s.icon className="mr-2 h-4 w-4 text-blue-600" />
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky top-16 z-20 border-y border-blue-100 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant="outline"
                onClick={() => scrollToSection(s.id)}
                className="rounded-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                <s.icon className="mr-2 h-4 w-4" />
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <SectionCard className="p-0 overflow-hidden">
          <div className="p-5 md:p-6">
            <CustomerOverview onNavigateTab={scrollToSection} />
          </div>
        </SectionCard>

        <section className="space-y-5">
          <SectionHeader
            id="buying"
            title="Buy & Explore"
            description="Search properties, saved homes, visits and hotel bookings"
            icon={Search}
          />
          <SectionCard>
            <Suspense fallback={<CardGridSkeleton />}>
              <BuyerDashboard embedded />
            </Suspense>
          </SectionCard>
        </section>

        <section className="space-y-5">
          <SectionHeader
            id="selling"
            title="Sell & Track"
            description="Your listings, enquiries and selling activity"
            icon={Sparkles}
          />
          <SectionCard>
            <Suspense fallback={<CardGridSkeleton />}>
              <SellerDashboard embedded />
            </Suspense>
          </SectionCard>
        </section>

        <section className="space-y-5">
          <SectionHeader
            id="builder"
            title="Projects"
            description="Projects, builder profile and leads"
            icon={Building2}
          />
          <SectionCard>
            <Suspense fallback={<CardGridSkeleton />}>
              <BuilderDashboard embedded />
            </Suspense>
          </SectionCard>
        </section>

        <section className="space-y-5">
          <SectionHeader
            id="loans"
            title="Loans"
            description="Home loan applications and their live status"
            icon={Banknote}
          />
          <SectionCard>
            <Suspense fallback={<CardGridSkeleton />}>
              <MyLoanApplications />
            </Suspense>
          </SectionCard>
        </section>
      </main>
    </div>
  );
}
