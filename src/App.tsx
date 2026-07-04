import { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import ProtectedRoute from "./components/ProtectedRoute";
import BuyerOnboardingGuard from "./components/BuyerOnboardingGuard";
import { LocationProvider } from "./contexts/LocationContext";
import LocationPermissionDialog from "./components/location/LocationPermissionDialog";

import ProfileBootProvider from "./contexts/ProfileBootProvider";
import { WalletProvider } from "./contexts/WalletContext";
import AppErrorBoundary from "./components/shared/AppErrorBoundary";
import { RequireAuthProvider } from "./components/auth/RequireAuthProvider";
const SelectProfile = lazy(() => import("./pages/SelectProfile"));

// Lazy-load all non-landing routes
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
const NaturalLiving = lazy(() => import("./pages/natural-living/NLHome"));
const NLVision = lazy(() => import("./pages/natural-living/NLVision"));
const NLWhy = lazy(() => import("./pages/natural-living/NLWhy"));
const NLAbout = lazy(() => import("./pages/natural-living/NLAbout"));
const NLStorytelling = lazy(() => import("./pages/natural-living/NLStorytelling"));
const NLSustainability = lazy(() => import("./pages/natural-living/NLSustainability"));
const NLImpact = lazy(() => import("./pages/natural-living/NLImpact"));
const NLCommunity = lazy(() => import("./pages/natural-living/NLCommunity"));
const NLPartner = lazy(() => import("./pages/natural-living/NLPartner"));
const NLContact = lazy(() => import("./pages/natural-living/NLContact"));
const NLFaq = lazy(() => import("./pages/natural-living/NLFaq"));
const NLPricing = lazy(() => import("./pages/natural-living/NLPricing"));
const NLBlog = lazy(() => import("./pages/natural-living/NLBlog"));
const NLSuccessStories = lazy(() => import("./pages/natural-living/NLSuccessStories"));
const NLVillages = lazy(() => import("./pages/natural-living/NLVillages"));
const NLFarms = lazy(() => import("./pages/natural-living/NLFarms"));
const NLFarmers = lazy(() => import("./pages/natural-living/NLFarmers"));
const NLFarmStay = lazy(() => import("./pages/natural-living/NLFarmStay"));
const NLWellness = lazy(() => import("./pages/natural-living/NLWellness"));
const NLCorporate = lazy(() => import("./pages/natural-living/NLCorporate"));
const NLSchools = lazy(() => import("./pages/natural-living/NLSchools"));
const Hotels = lazy(() => import("./pages/Hotels"));
const HotelDetail = lazy(() => import("./pages/HotelDetail"));
const HotelCheckout = lazy(() => import("./pages/HotelCheckout"));
const HotelBookingConfirmed = lazy(() => import("./pages/HotelBookingConfirmed"));
const HotelPartnerOnboarding = lazy(() => import("./pages/HotelPartnerOnboarding"));
const HotelPartnerStatus = lazy(() => import("./pages/HotelPartnerStatus"));
const PartnerLanding = lazy(() => import("./pages/partners/PartnerLanding"));
const PartnerRegister = lazy(() => import("./pages/partners/PartnerRegister"));
const PartnerLogin = lazy(() => import("./pages/partners/PartnerLogin"));
const PartnerForgotPassword = lazy(() => import("./pages/partners/PartnerForgotPassword"));
const PartnerVerifyOtp = lazy(() => import("./pages/partners/PartnerVerifyOtp"));
const PartnerWelcome = lazy(() => import("./pages/partners/PartnerWelcome"));
const PartnerKYC = lazy(() => import("./pages/partners/PartnerKYC"));
const PartnerStatus = lazy(() => import("./pages/partners/PartnerStatus"));
const PartnerPmsSetup = lazy(() => import("./pages/partners/PartnerPmsSetup"));
const PartnerDashboard = lazy(() => import("./pages/partners/PartnerDashboard"));
const PartnerRooms = lazy(() => import("./pages/partners/PartnerRooms"));
const PartnerReservations = lazy(() => import("./pages/partners/PartnerReservations"));
const PartnerGuests = lazy(() => import("./pages/partners/PartnerGuests"));
const PartnerAnalytics = lazy(() => import("./pages/partners/PartnerAnalytics"));
const PartnerPayouts = lazy(() => import("./pages/partners/PartnerPayouts"));
const PartnerInbox = lazy(() => import("./pages/partners/PartnerInbox"));
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
const PartnerStaff = lazy(() => import("./pages/partners/PartnerStaff"));
const PartnerPricing = lazy(() => import("./pages/partners/PartnerPricing"));
const PartnerAddons = lazy(() => import("./pages/partners/PartnerAddons"));
const PartnerBookingEngine = lazy(() => import("./pages/partners/PartnerBookingEngine"));
const BookingEngine = lazy(() => import("./pages/public/BookingEngine"));
const GuestPortal = lazy(() => import("./pages/public/GuestPortal"));


const SelectLocation = lazy(() => import("./pages/SelectLocation"));
const AgentAssignedProperties = lazy(() => import("./pages/AgentAssignedProperties"));
const AdminPropertiesPipeline = lazy(() => import("./pages/AdminPropertiesPipeline"));
const AdminKYCVerifications = lazy(() => import("./pages/AdminKYCVerifications"));
const AdminPriceDrops = lazy(() => import("./pages/AdminPriceDrops"));
const AdminLeadsCRM = lazy(() => import("./pages/AdminLeadsCRM"));

// ============================================
// BUILDER PROJECT COMPONENTS
// ============================================
const BuilderProjectsDashboard = lazy(() => import("@/components/builder/projects/BuilderProjectsDashboard"));
const AddProjectForm = lazy(() => import("@/components/builder/projects/AddProjectForm"));
const ProjectDetailPage = lazy(() => import("@/components/builder/projects/ProjectDetail"));
const AddConstructionUpdateWrapper = lazy(() => import("@/components/builder/projects/AddConstructionUpdateWrapper"));

// ============================================
// BUILDER WALLET COMPONENTS
// ============================================
const BuilderWallet = lazy(() => import("@/components/builder/wallet/BuilderWallet"));

// ============================================
// BUILDER CRM & TEAM COMPONENTS
// ============================================
const BuilderCRM = lazy(() =>
  import("@/components/builder/crm/BuilderCRM").catch(() => ({ default: () => <div>Failed to load CRM</div> })),
);
const BuilderTeamDashboard = lazy(() => import("@/components/builder/team/BuilderTeamDashboard"));

// ============================================
// BUILDER NOTIFICATIONS COMPONENTS
// ============================================
const NotificationCenter = lazy(() => import("@/components/builder/notifications/NotificationCenter"));
const BadgeDashboard = lazy(() => import("@/components/builder/badges/BadgeDashboard"));
const ReferralDashboard = lazy(() => import("@/components/builder/referral/ReferralDashboard"));
const HotelBookings = lazy(() => import("@/components/builder/hotels/HotelBookings"));
const FinancialEnquiries = lazy(() => import("@/components/builder/financial/FinancialEnquiries"));
const PreferredLocations = lazy(() => import("@/components/builder/preferences/PreferredLocations"));
const SuccessScore = lazy(() => import("@/components/builder/success/SuccessScore"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,
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
              <WalletProvider>
              <RequireAuthProvider>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/verify-otp" element={<VerifyOtp />} />
                  <Route path="/select-profile" element={<SelectProfile />} />
                  <Route path="/onboarding/buyer" element={<BuyerOnboarding />} />
                  <Route
                    path="/search"
                    element={
                      <BuyerOnboardingGuard>
                        <Search />
                      </BuyerOnboardingGuard>
                    }
                  />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/project/:slug" element={<ProjectDetail />} />

                  {/* ============================================
                      BUILDER ROUTES (Protected)
                      ============================================ */}

                  {/* Builder Dashboard */}
                  <Route
                    path="/dashboard/builder"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <BuilderDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder Profile */}
                  <Route
                    path="/add-builder-profile"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <AddBuilderProfile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/edit-builder-profile/:id"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <EditBuilderProfile />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder Projects */}
                  <Route
                    path="/builder/projects"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <BuilderProjectsDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/add-project"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <AddProjectForm />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/edit-project/:id"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <AddProjectForm />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/project/:id"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <ProjectDetailPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/builder/projects/:id/update"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <AddConstructionUpdateWrapper />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder Wallet */}
                  <Route
                    path="/builder/wallet"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <BuilderWallet />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder CRM */}
                  <Route
                    path="/builder/crm"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <BuilderCRM />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder Team */}
                  <Route
                    path="/builder/team"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <BuilderTeamDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder Notifications */}
                  <Route
                    path="/builder/notifications"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <NotificationCenter />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder Badges */}
                  <Route
                    path="/builder/badges"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <BadgeDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder Referrals */}
                  <Route
                    path="/builder/referrals"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <ReferralDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder Hotel Bookings */}
                  <Route
                    path="/builder/hotels"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <HotelBookings />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder Financial Enquiries */}
                  <Route
                    path="/builder/financial"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <FinancialEnquiries />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder Preferred Locations */}
                  <Route
                    path="/builder/locations"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <PreferredLocations />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder Success Score */}
                  <Route
                    path="/builder/success-score"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <SuccessScore />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder Visits */}
                  <Route
                    path="/builder-visits"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <BuilderVisitsDashboard />
                      </ProtectedRoute>
                    }
                  />

                  {/* Builder Promotions */}
                  <Route
                    path="/builder/promotions"
                    element={
                      <ProtectedRoute allowedRole="builder">
                        <BuilderPromotions />
                      </ProtectedRoute>
                    }
                  />

                  {/* Legacy Builder Routes */}
                  <Route path="/builder/add-project" element={<AddProject />} />
                  <Route path="/builder-profile/:slug" element={<BuilderProfileDetail />} />

                  {/* ============================================
                      OTHER ROUTES
                      ============================================ */}
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
                  <Route path="/natural-living/vision" element={<NLVision />} />
                  <Route path="/natural-living/why" element={<NLWhy />} />
                  <Route path="/natural-living/about" element={<NLAbout />} />
                  <Route path="/natural-living/stories" element={<NLStorytelling />} />
                  <Route path="/natural-living/sustainability" element={<NLSustainability />} />
                  <Route path="/natural-living/impact" element={<NLImpact />} />
                  <Route path="/natural-living/community" element={<NLCommunity />} />
                  <Route path="/natural-living/partner" element={<NLPartner />} />
                  <Route path="/natural-living/contact" element={<NLContact />} />
                  <Route path="/natural-living/faq" element={<NLFaq />} />
                  <Route path="/natural-living/pricing" element={<NLPricing />} />
                  <Route path="/natural-living/blog" element={<NLBlog />} />
                  <Route path="/natural-living/success-stories" element={<NLSuccessStories />} />
                  <Route path="/natural-living/villages" element={<NLVillages />} />
                  <Route path="/natural-living/farms" element={<NLFarms />} />
                  <Route path="/natural-living/farmers" element={<NLFarmers />} />
                  <Route path="/natural-living/farm-stay" element={<NLFarmStay />} />
                  <Route path="/natural-living/wellness" element={<NLWellness />} />
                  <Route path="/natural-living/corporate" element={<NLCorporate />} />
                  <Route path="/natural-living/schools" element={<NLSchools />} />
                  <Route path="/hotels" element={<Hotels />} />
                  <Route path="/hotels/partner" element={<Navigate to="/partners/register" replace />} />
                  <Route path="/hotels/partner/status" element={<Navigate to="/partners/status" replace />} />
                  <Route path="/hotels/:id" element={<HotelDetail />} />
                  <Route path="/hotels/:id/checkout" element={<HotelCheckout />} />
                  <Route path="/hotels/booking/:bookingId/confirmed" element={<HotelBookingConfirmed />} />
                  <Route path="/partners" element={<PartnerLanding />} />
                  <Route path="/partners/register" element={<PartnerRegister />} />
                  <Route path="/partners/login" element={<PartnerLogin />} />
                  <Route path="/partners/forgot-password" element={<PartnerForgotPassword />} />
                  <Route path="/partners/verify-otp" element={<PartnerVerifyOtp />} />
                  <Route path="/partners/welcome" element={<PartnerWelcome />} />
                  <Route path="/partners/kyc" element={<PartnerKYC />} />
                  <Route path="/partners/status" element={<PartnerStatus />} />
                  <Route path="/partners/pms-setup" element={<PartnerPmsSetup />} />
                  <Route path="/partners/dashboard" element={<PartnerDashboard />} />
                  <Route path="/partners/rooms" element={<PartnerRooms />} />
                  <Route path="/partners/reservations" element={<PartnerReservations />} />
                  <Route path="/partners/guests" element={<PartnerGuests />} />
                  <Route path="/partners/analytics" element={<PartnerAnalytics />} />
                  <Route path="/partners/payouts" element={<PartnerPayouts />} />
                  <Route path="/partners/inbox" element={<PartnerInbox />} />
                  <Route path="/partners/staff" element={<PartnerStaff />} />
                  <Route path="/partners/pricing" element={<PartnerPricing />} />
                  <Route path="/partners/addons" element={<PartnerAddons />} />
                  <Route path="/partners/booking-engine" element={<PartnerBookingEngine />} />
                  <Route path="/book/:hotelId" element={<BookingEngine />} />
                  <Route path="/stay/:token" element={<GuestPortal />} />

                  <Route path="/promotions" element={<Promotions />} />
                  <Route path="/reels" element={<PropertyReels />} />
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
                  <Route
                    path="/dashboard/buyer"
                    element={
                      <ProtectedRoute allowedRole="buyer">
                        <BuyerOnboardingGuard>
                          <BuyerDashboard />
                        </BuyerOnboardingGuard>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/agent"
                    element={
                      <ProtectedRoute allowedRole="agent">
                        <AgentDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/agent/add-property"
                    element={
                      <ProtectedRoute allowedRole="agent">
                        <AgentAddProperty />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/agent/visits"
                    element={
                      <ProtectedRoute allowedRole="agent">
                        <AgentVisitsDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/agent/verifications"
                    element={
                      <ProtectedRoute allowedRole="agent">
                        <AgentVerificationDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/agent/assigned"
                    element={
                      <ProtectedRoute allowedRole="agent">
                        <AgentAssignedProperties />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/seller"
                    element={
                      <ProtectedRoute allowedRole="seller">
                        <SellerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/seller/analytics"
                    element={
                      <ProtectedRoute allowedRole="seller">
                        <SellerAnalytics />
                      </ProtectedRoute>
                    }
                  />
                  {/* Admin routes */}
                  <Route
                    path="/dashboard/admin"
                    element={
                      <ProtectedRoute allowedRole="admin">
                        <AdminPanel />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute allowedRole="admin">
                        <AdminPanel />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/admin/frm"
                    element={
                      <ProtectedRoute allowedRole="admin">
                        <AdminFRMDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/properties-pipeline"
                    element={
                      <ProtectedRoute allowedRole="admin">
                        <AdminPropertiesPipeline />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/kyc-verifications"
                    element={
                      <ProtectedRoute allowedRole="admin">
                        <AdminKYCVerifications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/price-drops"
                    element={
                      <ProtectedRoute allowedRole="admin">
                        <AdminPriceDrops />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/leads"
                    element={
                      <ProtectedRoute allowedRole="admin">
                        <AdminLeadsCRM />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/partners/dashboard"
                    element={
                      <ProtectedRoute allowedRole="hotel_manager">
                        <HotelManagerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/hotel"
                    element={
                      <ProtectedRoute allowedRole="hotel_manager">
                        <HotelManagerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/smart-financing" element={<SmartFinancing />} />
                  <Route path="/financing" element={<SmartFinancing />} />
                  <Route path="/financial/register" element={<FinancialRegistration />} />
                  <Route
                    path="/dashboard/financial"
                    element={
                      <ProtectedRoute allowedRole="financial">
                        <FinancialDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/financial/leads"
                    element={
                      <ProtectedRoute allowedRole="financial">
                        <FinancialLeads />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/financial/applications"
                    element={
                      <ProtectedRoute allowedRole="financial">
                        <FinancialApplications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/financial/wallet"
                    element={
                      <ProtectedRoute allowedRole="financial">
                        <FinancialWallet />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/financial/promotions"
                    element={
                      <ProtectedRoute allowedRole="financial">
                        <FinancialPromotions />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/financial/notifications"
                    element={
                      <ProtectedRoute allowedRole="financial">
                        <FinancialNotifications />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/financial/settings"
                    element={
                      <ProtectedRoute allowedRole="financial">
                        <FinancialSettings />
                      </ProtectedRoute>
                    }
                  />

                  <Route path="/coming-soon" element={<ComingSoon />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <LocationPermissionDialog />
              </RequireAuthProvider>
              </WalletProvider>
            </LocationProvider>
          </ProfileBootProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
