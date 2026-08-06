import { lazy, Suspense, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  LogOut,
  Search,
  Sparkles,
  Building2,
  Banknote,
  Home,
  Calendar,
  Hotel,
  Wallet,
  Plus,
  FileText,
  MapPin,
  BarChart3,
  GitCompare,
  UserCircle2,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  FileEdit,
  ShoppingBag,
} from "lucide-react";
import { CardGridSkeleton } from "@/components/shared";
import CustomerOverview from "@/features/customer/CustomerOverview";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

// Quick stats cards data
const QUICK_STATS = [
  {
    id: "saved",
    label: "Saved properties",
    count: 0,
    change: "+2 this week",
    icon: Home,
    color: "blue",
  },
  {
    id: "visits",
    label: "Scheduled visits",
    count: 0,
    subtext: "1 upcoming",
    icon: Calendar,
    color: "green",
  },
  {
    id: "hotels",
    label: "Hotel bookings",
    count: 0,
    subtext: "1 active",
    icon: Hotel,
    color: "purple",
  },
  {
    id: "wallet",
    label: "Wallet",
    count: 0,
    subtext: "0 transactions",
    icon: Wallet,
    color: "amber",
  },
];

// Quick action buttons
const QUICK_ACTIONS = [
  { id: "search", label: "Search properties", icon: Search },
  { id: "list", label: "List a property", icon: Plus },
  { id: "project", label: "Add a project", icon: Building2 },
  { id: "manage", label: "Manage listings", icon: FileText },
];

// Activity timeline data
const ACTIVITY = {
  title: "Activity Timeline",
  items: [],
  emptyMessage: "No activity yet. Start exploring properties!",
};

// Market insights
const MARKET_INSIGHTS = {
  priceGrowth: "+12%",
  liquidity: 1,
  avgDaysToMarket: "45 Days",
};

// Sell & Track data
const SELL_TRACK = {
  freePostingQuota: "0/1 used",
  freePostRemaining: "You have 1 free post remaining",
  progress: 0,
};

// KYC Verification
const KYC = {
  title: "KYC Verification",
  benefits: [
    "Verified badge on profile",
    "Higher trust score (up to 100)",
    "Faster property approvals",
    "Better visibility in search",
  ],
  buttonText: "Complete KYC",
};

// Listing status tabs
const LISTING_TABS = [
  { id: "all", label: "All", count: 0 },
  { id: "pending", label: "Pending", count: 0 },
  { id: "live", label: "Live", count: 0 },
  { id: "redirected", label: "Redirected", count: 0 },
  { id: "drafts", label: "Drafts", count: 0 },
  { id: "sold", label: "Sold", count: 0 },
];

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

// Quick Stats Card Component
function QuickStatCard({ stat }: { stat: (typeof QUICK_STATS)[0] }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.count}</p>
            {stat.change && <p className="text-xs text-green-600 font-medium mt-1">{stat.change}</p>}
            {stat.subtext && <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>}
          </div>
          <div className={`rounded-xl p-3 ${colorMap[stat.color]}`}>
            <stat.icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Activity Timeline Component
function ActivityTimeline() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No activity yet. Start exploring properties!</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Market Insights Component
function MarketInsights() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Market Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{MARKET_INSIGHTS.priceGrowth}</p>
            <p className="text-xs text-muted-foreground">Price Growth (%)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{MARKET_INSIGHTS.liquidity}</p>
            <p className="text-xs text-muted-foreground">Market Liquidity</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{MARKET_INSIGHTS.avgDaysToMarket}</p>
            <p className="text-xs text-muted-foreground">Avg. Days to Market</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Sell & Track Component
function SellTrack() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Sell & Track
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Free Posting Quota</span>
          <span className="font-medium">{SELL_TRACK.freePostingQuota}</span>
        </div>
        <Progress value={SELL_TRACK.progress} className="h-2" />
        <p className="text-sm text-muted-foreground">{SELL_TRACK.freePostRemaining}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            List Property
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Manage Listings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Buy & Explore Component
function BuyExplore() {
  const actions = [
    { icon: MapPin, label: "Explore Map" },
    { icon: BarChart3, label: "Visit Analytics" },
    { icon: GitCompare, label: "Compare" },
    { icon: UserCircle2, label: "Find Agent" },
    { icon: Home, label: "Property Value" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-5 w-5" />
          Buy & Explore
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {actions.map((action) => (
            <Button key={action.label} variant="outline" size="sm" className="gap-2">
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Recommended Properties Component
function RecommendedProperties() {
  // Mock data - replace with real data
  const properties = Array(5).fill({
    title: "3 BHK • Independent House",
    specs: "3 BHK + 3 Baths • 1000 sq ft",
    verified: true,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recommended Properties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {properties.map((property, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="font-medium">{property.title}</p>
              <p className="text-sm text-muted-foreground">{property.specs}</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
              <Button variant="ghost" size="sm" className="text-primary">
                View Details →
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// KYC Verification Component
function KYCVerification() {
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCircle2 className="h-5 w-5 text-blue-600" />
          {KYC.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 mb-4">
          {KYC.benefits.map((benefit, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              {benefit}
            </li>
          ))}
        </ul>
        <Button className="w-full bg-blue-600 hover:bg-blue-700">{KYC.buttonText}</Button>
      </CardContent>
    </Card>
  );
}

// Total Owed Component
function TotalOwed() {
  const statuses = [
    { label: "TOTAL O", value: 0, color: "bg-gray-600" },
    { label: "LIVE O", value: 0, color: "bg-green-600" },
    { label: "PENDING O", value: 0, color: "bg-yellow-600" },
    { label: "REJECTED O", value: 0, color: "bg-red-600" },
    { label: "DRAUGHT O", value: 0, color: "bg-blue-600" },
    { label: "SOLD O", value: 0, color: "bg-purple-600" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Total Owed
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {statuses.map((status) => (
            <div key={status.label} className="text-center">
              <div className={`h-2 w-full rounded-full ${status.color} mb-2`} />
              <p className="text-xl font-bold">{status.value}</p>
              <p className="text-xs text-muted-foreground">{status.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// My Listings Component
function MyListings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          My Listings
        </CardTitle>
        <p className="text-sm text-muted-foreground">Track verification and manage</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-4">
          {LISTING_TABS.map((tab) => (
            <Button key={tab.id} variant="outline" size="sm">
              {tab.label} ({tab.count})
            </Button>
          ))}
        </div>
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No projects yet</p>
          <p className="text-sm">No items yet</p>
        </div>
      </CardContent>
    </Card>
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
            <Button key={s.id} variant="outline" size="sm" className="gap-2" onClick={() => scrollToSection(s.id)}>
              <s.icon className="h-4 w-4" />
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="container mx-auto max-w-7xl 3xl:max-w-[1680px] px-4 sm:px-6 lg:px-8 pb-12 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {QUICK_STATS.map((stat) => (
            <QuickStatCard key={stat.id} stat={stat} />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action) => (
            <Button key={action.id} variant="outline" className="justify-start gap-3 h-auto py-4 px-4">
              <action.icon className="h-5 w-5" />
              <span>{action.label}</span>
            </Button>
          ))}
        </div>

        {/* Activity Timeline & Market Insights Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <ActivityTimeline />
          </div>
          <div>
            <MarketInsights />
          </div>
        </div>

        {/* Sell & Track + Buy & Explore Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SellTrack />
          <BuyExplore />
        </div>

        {/* Recommended Properties */}
        <RecommendedProperties />

        {/* KYC + Total Owed Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <KYCVerification />
          <TotalOwed />
        </div>

        {/* My Listings */}
        <MyListings />

        {/* Existing Dashboard Sections */}
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
