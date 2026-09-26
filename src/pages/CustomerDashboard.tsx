import { lazy, Suspense, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Search, Sparkles, Building2, Banknote, Hotel } from "lucide-react";
import { CardGridSkeleton } from "@/components/shared";
import CustomerOverview from "@/features/customer/CustomerOverview";
import { useHotelManagerAccess } from "@/hooks/useHotelManagerAccess";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Assuming you have shadcn tabs

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

export default function CustomerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isHotelManager } = useHotelManagerAccess();

  // Use state to control the active tab, default to 'buying'
  const [activeTab, setActiveTab] = useState<string>("buying");

  // Sync tab with URL params (e.g., ?view=selling)
  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam && SECTIONS.some((s) => s.id === viewParam)) {
      setActiveTab(viewParam);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ view: value }); // Update URL without full reload
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />

      {/* Header Section */}
      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome back, <span className="text-primary">{user?.email?.split("@")[0] || "Customer"}!</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              One customer space — buy, sell, build and finance in a single view
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isHotelManager && (
              <Button
                size="sm"
                variant="outline"
                className="gap-2 rounded-full"
                onClick={() => navigate("/partners/dashboard")}
              >
                <Hotel className="h-4 w-4" />
                Hotel Dashboard
              </Button>
            )}
            <Button onClick={handleSignOut} variant="ghost" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
        {/* 1. Customer Overview (Summary Cards) - Renders once at the top */}
        <CustomerOverview onNavigateTab={handleTabChange} />

        {/* 2. Tabbed Interface for Detailed Views - Replaces stacked sections */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 border-b pb-2 justify-start w-full">
            {SECTIONS.map((s) => (
              <TabsTrigger
                key={s.id}
                value={s.id}
                className="gap-2 rounded-full px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <s.icon className="h-4 w-4" />
                {s.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="pt-2">
            <TabsContent value="buying" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <Suspense fallback={<CardGridSkeleton />}>
                <BuyerDashboard embedded />
              </Suspense>
            </TabsContent>

            <TabsContent value="selling" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <Suspense fallback={<CardGridSkeleton />}>
                <SellerDashboard embedded />
              </Suspense>
            </TabsContent>

            <TabsContent value="builder" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <Suspense fallback={<CardGridSkeleton />}>
                <BuilderDashboard embedded />
              </Suspense>
            </TabsContent>

            <TabsContent value="loans" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <Suspense fallback={<CardGridSkeleton />}>
                <MyLoanApplications />
              </Suspense>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
