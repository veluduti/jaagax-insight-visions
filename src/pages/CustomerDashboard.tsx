import { lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Search, Sparkles, Building2 } from "lucide-react";
import { CardGridSkeleton } from "@/components/shared";

const BuyerDashboard = lazy(() => import("./BuyerDashboard"));
const SellerDashboard = lazy(() => import("./SellerDashboard"));
const BuilderDashboard = lazy(() => import("./BuilderDashboard"));

/**
 * Unified Customer Dashboard — merges the former Buyer, Seller and Builder
 * dashboards into a single destination.
 */
export default function CustomerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const viewParam = searchParams.get("view");
  const view = viewParam === "selling" || viewParam === "builder" ? viewParam : "buying";

  const setView = (v: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("view", v);
    if (v !== "buying") next.delete("tab");
    setSearchParams(next);
  };

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
            <p className="text-muted-foreground mt-1">Everything you buy, sell and track — in one place</p>
          </div>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pb-12">
        <Tabs value={view} onValueChange={setView} className="space-y-8">
          <TabsList className="h-auto p-1 gap-1">
            <TabsTrigger value="buying" className="px-6 py-2">
              <Search className="h-4 w-4 mr-2" />
              Buying
            </TabsTrigger>
            <TabsTrigger value="selling" className="px-6 py-2">
              <Sparkles className="h-4 w-4 mr-2" />
              Selling
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buying" className="mt-0">
            <Suspense fallback={<CardGridSkeleton />}>
              <BuyerDashboard embedded />
            </Suspense>
          </TabsContent>

          <TabsContent value="selling" className="mt-0">
            <Suspense fallback={<CardGridSkeleton />}>
              <SellerDashboard embedded />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
