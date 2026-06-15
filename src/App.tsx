import { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import ProtectedRoute from "./components/ProtectedRoute";
import BuyerOnboardingGuard from "./components/BuyerOnboardingGuard";
import { LocationProvider } from "./contexts/LocationContext";
import LocationPermissionDialog from "./components/location/LocationPermissionDialog";

import ProfileBootProvider from "./contexts/ProfileBootProvider";
import AppErrorBoundary from "./components/shared/AppErrorBoundary";
const SelectProfile = lazy(() => import("./pages/SelectProfile"));

// Lazy-load all non-landing routes for fast initial paint + smaller chunks per page
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Auth = lazy(() => import("./pages/Auth"));
const VerifyOtp = lazy(() => import("./pages/VerifyOtp"));
const Search = lazy(() => import("./pages/Search"));
const AgentLeaderboard = lazy(() => import("./pages/AgentLeaderboard"));
const AgentVisitsDashboard = lazy(() => import("./pages/AgentVisitsDashboard"));
const AgentVerificationDashboard = lazy(() => import("./pages/AgentVerificationDashboard"));
const AdminFRMDashboard = lazy(() => import("./pages/AdminFRMDashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const Transactions = lazy(() => import("./pages/Transactions"));
const TransactionsCity = lazy(() => import("./pages/TransactionsCity"));
const TransactionsLocality = lazy(() => import("./pages/TransactionsLocality"));
const TrustScore = lazy(() => import("./pages/TrustScore"));
const Agents = lazy(() => import("./pages/Agents"));
const AgentDetail = lazy(() => import("./pages/AgentDetail"));
const AgentComparison = lazy(() => import("./pages/AgentComparison"));
const PropertyValuation = lazy(() => import("./pages/PropertyValuation"));
const ValuationPage = lazy(() => import("./pages/ValuationPage"));
const Communities = lazy(() => import("./pages/Communities"));
const CommunitiesCity = lazy(() => import("./pages/CommunitiesCity"));
const CommunitiesLocality = lazy(() => import("./pages/CommunitiesLocality"));
const Guides = lazy(() => import("./pages/Guides"));
const EventsNew = lazy(() => import("./pages/EventsNew"));
const EventCreate = lazy(() => import("./pages/EventCreate"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Map = lazy(() => import("./pages/Map"));
const BuyerDashboard = lazy(() => import("./pages/BuyerDashboard"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const SellerAnalytics = lazy(() => import("./pages/SellerAnalytics"));
const SellProperty = lazy(() => import("./pages/SellProperty"));
const BuilderDashboard = lazy(() => import("./pages/BuilderDashboard"));
const AddProject = lazy(() => import("./pages/AddProject"));
const BuilderPromotions = lazy(() => import("./pages/BuilderPromotions"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const AgentAddProperty = lazy(() => import("./pages/AgentAddProperty"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const AIAdvisor = lazy(() => import("./pages/AIAdvisor"));
const AIAdvisorResults = lazy(() => import("./pages/AIAdvisorResults"));
const AIAdvisorProperty = lazy(() => import("./pages/AIAdvisorProperty"));
const VisitSchedule = lazy(() => import("./pages/VisitSchedule"));
const VisitConfirm = lazy(() => import("./pages/VisitConfirm"));
const VisitManage = lazy(() => import("./pages/VisitManage"));
const BuilderVisitsDashboard = lazy(() => import("./pages/BuilderVisitsDashboard"));
const LiveVisitTracking = lazy(() => import("./pages/LiveVisitTracking"));
const VisitVerify = lazy(() => import("./pages/VisitVerify"));
const AgentLocationShare = lazy(() => import("./pages/AgentLocationShare"));
const VisitStory = lazy(() => import("./pages/VisitStory"));
const VisitSummary = lazy(() => import("./pages/VisitSummary"));
const VisitAnalytics = lazy(() => import("./pages/VisitAnalytics"));
const AgentStoryUpload = lazy(() => import("./pages/AgentStoryUpload"));
const BuyerOnboarding = lazy(() => import("./pages/BuyerOnboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const NaturalLiving = lazy(() => import("./pages/NaturalLiving"));
const Hotels = lazy(() => import("./pages/Hotels"));
const HotelDetail = lazy(() => import("./pages/HotelDetail"));
const HotelPartnerOnboarding = lazy(() => import("./pages/HotelPartnerOnboarding"));
const HotelPartnerStatus = lazy(() => import("./pages/HotelPartnerStatus"));
const Promotions = lazy(() => import("./pages/Promotions"));
const PropertyReels = lazy(() => import("./pages/PropertyReels"));
const InnovationHub = lazy(() => import("./pages/InnovationHub"));
const ComingSoon = lazy(() => import("./pages/ComingSoon"));
const HotelManagerDashboard = lazy(() => import("./pages/HotelManagerDashboard"));
const CompareProperties = lazy(() => import("./pages/CompareProperties"));
const AddBuilderProfile = lazy(() => import("./pages/AddBuilderProfile"));
const EditBuilderProfile = lazy(() => import("./pages/EditBuilderProfile"));
const BuilderProfileDetail = lazy(() => import("./pages/BuilderProfileDetail"));
const PlanVisitStay = lazy(() => import("./pages/PlanVisitStay"));
const FeaturedPropertiesPage = lazy(() => import("./pages/FeaturedPropertiesPage"));
const FinancialDashboard = lazy(() => import("./pages/FinancialDashboard"));
const FinancialRegistration = lazy(() => import("./pages/FinancialRegistration"));
const FinancialLeads = lazy(() => import("./pages/financial/Leads"));
const FinancialApplications = lazy(() => import("./pages/financial/Applications"));
const FinancialWallet = lazy(() => import("./pages/financial/Wallet"));
const FinancialPromotions = lazy(() => import("./pages/financial/Promotions"));
const FinancialNotifications = lazy(() => import("./pages/financial/Notifications"));
const FinancialSettings = lazy(() => import("./pages/financial/Settings"));
const SmartFinancing = lazy(() => import("./pages/SmartFinancing"));

const SelectLocation = lazy(() => import("./pages/SelectLocation"));
const AgentAssignedProperties = lazy(() => import("./pages/AgentAssignedProperties"));
const AdminPropertiesPipeline = lazy(() => import("./pages/AdminPropertiesPipeline"));
const AdminKYCVerifications = lazy(() => import("./pages/AdminKYCVerifications"));
const AdminPriceDrops = lazy(() => import("./pages/AdminPriceDrops"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data "fresh" for 2 min so tab/page switches don't refetch.
      staleTime: 2 * 60_000,
      // Hold cached data in memory for 10 min after last observer unmounts.
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-3">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">Loading page…</p>
  </div>
);

const App = () => (
  <AppErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ProfileBootProvider>
        <LocationProvider>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/select-profile" element={<SelectProfile />} />
          <Route path="/onboarding/buyer" element={<BuyerOnboarding />} />
          <Route path="/search" element={
            <BuyerOnboardingGuard>
              <Search />
            </BuyerOnboardingGuard>
          } />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/project/:slug" element={<ProjectDetail />} />
          <Route path="/builder/add-project" element={<AddProject />} />
          <Route path="/builder/promotions" element={<BuilderPromotions />} />
          <Route path="/property/:slug" element={<PropertyDetail />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/:city" element={<TransactionsCity />} />
          <Route path="/transactions/:city/:locality" element={<TransactionsLocality />} />
          <Route path="/trust-score" element={<TrustScore />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agent/:id" element={<AgentDetail />} />
          <Route path="/agents/compare" element={<AgentComparison />} />
          <Route path="/agents/leaderboard" element={<AgentLeaderboard />} />
          <Route path="/valuation" element={<ValuationPage />} />
          <Route path="/valuation/detailed" element={<PropertyValuation />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/communities/:city" element={<CommunitiesCity />} />
          <Route path="/communities/:city/:locality" element={<CommunitiesLocality />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/events" element={<EventsNew />} />
          <Route path="/events/create" element={<EventCreate />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/map" element={<Map />} />
          <Route path="/sell-property" element={<SellProperty />} />
          <Route path="/natural-living" element={<NaturalLiving />} />
          <Route path="/hotels" element={<Hotels />} />
          <Route path="/hotels/partner" element={<HotelPartnerOnboarding />} />
          <Route path="/hotels/partner/status" element={<HotelPartnerStatus />} />
          <Route path="/hotels/:id" element={<HotelDetail />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/reels" element={<PropertyReels />} />
          <Route path="/add-builder-profile" element={<AddBuilderProfile />} />
          <Route path="/edit-builder-profile/:id" element={<EditBuilderProfile />} />
          <Route path="/builder-profile/:slug" element={<BuilderProfileDetail />} />
          <Route path="/innovation" element={<InnovationHub />} />
          <Route path="/compare" element={<CompareProperties />} />
          <Route path="/featured-properties" element={<FeaturedPropertiesPage />} />
          <Route path="/select-location" element={<SelectLocation />} />

          {/* AI Advisor Routes */}
          <Route path="/ai-advisor" element={<AIAdvisor />} />
          <Route path="/ai-advisor/results" element={<AIAdvisorResults />} />
          <Route path="/ai-advisor/:propertyId" element={<AIAdvisorProperty />} />

          {/* Visit Scheduling Routes */}
          <Route path="/plan-visit-stay" element={<PlanVisitStay />} />
          <Route path="/visit/schedule/:propertyId" element={<VisitSchedule />} />
          <Route path="/visit/confirm/:bookingId" element={<VisitConfirm />} />
          <Route path="/visit/manage" element={<VisitManage />} />
          <Route path="/visit/live/:bookingId" element={<LiveVisitTracking />} />
          <Route path="/visit/story/:bookingId" element={<VisitStory />} />
          <Route path="/visit/summary/:bookingId" element={<VisitSummary />} />
          <Route path="/visit/verify" element={<VisitVerify />} />
          <Route path="/visit/analytics" element={<VisitAnalytics />} />
          <Route path="/agent/location/:bookingId" element={<AgentLocationShare />} />
          <Route path="/agent/visit/story/:bookingId" element={<AgentStoryUpload />} />

          {/* Role-based Dashboards */}
          <Route path="/dashboard/buyer" element={
            <ProtectedRoute allowedRole="buyer">
              <BuyerOnboardingGuard>
                <BuyerDashboard />
              </BuyerOnboardingGuard>
            </ProtectedRoute>
          } />
          <Route path="/dashboard/agent" element={
            <ProtectedRoute allowedRole="agent">
              <AgentDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/agent/add-property" element={
            <ProtectedRoute allowedRole="agent">
              <AgentAddProperty />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/agent/visits" element={
            <ProtectedRoute allowedRole="agent">
              <AgentVisitsDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/agent/verifications" element={
            <ProtectedRoute allowedRole="agent">
              <AgentVerificationDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/agent/assigned" element={
            <ProtectedRoute allowedRole="agent">
              <AgentAssignedProperties />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/builder" element={
            <ProtectedRoute allowedRole="builder">
              <BuilderDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/builder/visits" element={
            <ProtectedRoute allowedRole="builder">
              <BuilderVisitsDashboard />
            </ProtectedRoute>
          } />
          <Route path="/builder-visits" element={
            <ProtectedRoute allowedRole="builder">
              <BuilderVisitsDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/seller" element={
            <ProtectedRoute allowedRole="seller">
              <SellerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/seller/analytics" element={
            <ProtectedRoute allowedRole="seller">
              <SellerAnalytics />
            </ProtectedRoute>
          } />
          {/* Admin routes — require admin authentication */}
          <Route path="/dashboard/admin" element={
            <ProtectedRoute allowedRole="admin">
              <AdminPanel />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute allowedRole="admin">
              <AdminPanel />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/admin/frm" element={
            <ProtectedRoute allowedRole="admin">
              <AdminFRMDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/properties-pipeline" element={
            <ProtectedRoute allowedRole="admin">
              <AdminPropertiesPipeline />
            </ProtectedRoute>
          } />
          <Route path="/admin/kyc-verifications" element={
            <ProtectedRoute allowedRole="admin">
              <AdminKYCVerifications />
            </ProtectedRoute>
          } />
          <Route path="/admin/price-drops" element={
            <ProtectedRoute allowedRole="admin">
              <AdminPriceDrops />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/hotel-manager" element={
            <ProtectedRoute allowedRole="hotel_manager">
              <HotelManagerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/smart-financing" element={<SmartFinancing />} />
          <Route path="/financing" element={<SmartFinancing />} />
          <Route path="/financial/register" element={<FinancialRegistration />} />
          <Route path="/dashboard/financial" element={
            <ProtectedRoute allowedRole="financial"><FinancialDashboard /></ProtectedRoute>
          } />
          <Route path="/dashboard/financial/leads" element={
            <ProtectedRoute allowedRole="financial"><FinancialLeads /></ProtectedRoute>
          } />
          <Route path="/dashboard/financial/applications" element={
            <ProtectedRoute allowedRole="financial"><FinancialApplications /></ProtectedRoute>
          } />
          <Route path="/dashboard/financial/wallet" element={
            <ProtectedRoute allowedRole="financial"><FinancialWallet /></ProtectedRoute>
          } />
          <Route path="/dashboard/financial/promotions" element={
            <ProtectedRoute allowedRole="financial"><FinancialPromotions /></ProtectedRoute>
          } />
          <Route path="/dashboard/financial/notifications" element={
            <ProtectedRoute allowedRole="financial"><FinancialNotifications /></ProtectedRoute>
          } />
          <Route path="/dashboard/financial/settings" element={
            <ProtectedRoute allowedRole="financial"><FinancialSettings /></ProtectedRoute>
          } />

          <Route path="/coming-soon" element={<ComingSoon />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <LocationPermissionDialog />
        
        </LocationProvider>
        </ProfileBootProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
