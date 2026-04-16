import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Search from "./pages/Search";
import AgentLeaderboard from "./pages/AgentLeaderboard";
import AgentVisitsDashboard from "./pages/AgentVisitsDashboard";
import AgentVerificationDashboard from "./pages/AgentVerificationDashboard";
import AdminFRMDashboard from "./pages/AdminFRMDashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import PropertyDetail from "./pages/PropertyDetail";
import Transactions from "./pages/Transactions";
import TransactionsCity from "./pages/TransactionsCity";
import TransactionsLocality from "./pages/TransactionsLocality";
import TrustScore from "./pages/TrustScore";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import AgentComparison from "./pages/AgentComparison";
import PropertyValuation from "./pages/PropertyValuation";
import Communities from "./pages/Communities";
import CommunitiesCity from "./pages/CommunitiesCity";
import CommunitiesLocality from "./pages/CommunitiesLocality";
import Guides from "./pages/Guides";
import EventsNew from "./pages/EventsNew";
import EventCreate from "./pages/EventCreate";
import EventDetail from "./pages/EventDetail";
import Map from "./pages/Map";
import BuyerDashboard from "./pages/BuyerDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import SellProperty from "./pages/SellProperty";
import BuilderDashboard from "./pages/BuilderDashboard";
import AgentDashboard from "./pages/AgentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AIAdvisor from "./pages/AIAdvisor";
import AIAdvisorResults from "./pages/AIAdvisorResults";
import AIAdvisorProperty from "./pages/AIAdvisorProperty";
import VisitSchedule from "./pages/VisitSchedule";
import VisitConfirm from "./pages/VisitConfirm";
import VisitManage from "./pages/VisitManage";
import BuilderVisitsDashboard from "./pages/BuilderVisitsDashboard";
import LiveVisitTracking from "./pages/LiveVisitTracking";
import VisitVerify from "./pages/VisitVerify";
import AgentLocationShare from "./pages/AgentLocationShare";
import VisitStory from "./pages/VisitStory";
import VisitSummary from "./pages/VisitSummary";
import VisitAnalytics from "./pages/VisitAnalytics";
import AgentStoryUpload from "./pages/AgentStoryUpload";
import BuyerOnboarding from "./pages/BuyerOnboarding";
import BuyerOnboardingGuard from "./components/BuyerOnboardingGuard";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import NaturalLiving from "./pages/NaturalLiving";
import Hotels from "./pages/Hotels";
import HotelDetail from "./pages/HotelDetail";
import Promotions from "./pages/Promotions";
import PropertyReels from "./pages/PropertyReels";
import InnovationHub from "./pages/InnovationHub";
import HotelManagerDashboard from "./pages/HotelManagerDashboard";
import AddBuilderProfile from "./pages/AddBuilderProfile";
import EditBuilderProfile from "./pages/EditBuilderProfile";
import BuilderProfileDetail from "./pages/BuilderProfileDetail";
import { LocationProvider } from "./contexts/LocationContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <LocationProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding/buyer" element={<BuyerOnboarding />} />
          <Route path="/search" element={
            <BuyerOnboardingGuard>
              <Search />
            </BuyerOnboardingGuard>
          } />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/:city" element={<TransactionsCity />} />
          <Route path="/transactions/:city/:locality" element={<TransactionsLocality />} />
          <Route path="/trust-score" element={<TrustScore />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agent/:id" element={<AgentDetail />} />
          <Route path="/agents/compare" element={<AgentComparison />} />
          <Route path="/agents/leaderboard" element={<AgentLeaderboard />} />
          <Route path="/valuation" element={<PropertyValuation />} />
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
          <Route path="/hotels/:id" element={<HotelDetail />} />
          <Route path="/promotions" element={<Promotions />} />
          <Route path="/reels" element={<PropertyReels />} />
          <Route path="/add-builder-profile" element={<AddBuilderProfile />} />
          <Route path="/edit-builder-profile/:id" element={<EditBuilderProfile />} />
          <Route path="/builder-profile/:id" element={<BuilderProfileDetail />} />
          <Route path="/innovation" element={<InnovationHub />} />
          
          {/* AI Advisor Routes */}
          <Route path="/ai-advisor" element={<AIAdvisor />} />
          <Route path="/ai-advisor/results" element={<AIAdvisorResults />} />
          <Route path="/ai-advisor/:propertyId" element={<AIAdvisorProperty />} />
          
          {/* Visit Scheduling Routes */}
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
          
          {/* Role-based Dashboards - Authentication temporarily disabled for testing */}
          <Route path="/dashboard/buyer" element={
            <BuyerOnboardingGuard>
              <BuyerDashboard />
            </BuyerOnboardingGuard>
          } />
          <Route path="/dashboard/agent" element={<AgentDashboard />} />
          <Route path="/dashboard/agent/visits" element={<AgentVisitsDashboard />} />
          <Route path="/dashboard/agent/verifications" element={<AgentVerificationDashboard />} />
          <Route path="/dashboard/builder" element={<BuilderDashboard />} />
          <Route path="/dashboard/builder/visits" element={<BuilderVisitsDashboard />} />
          <Route path="/builder-visits" element={<BuilderVisitsDashboard />} />
          <Route path="/dashboard/seller" element={<SellerDashboard />} />
          <Route path="/dashboard/admin" element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/admin/frm" element={
            <ProtectedRoute allowedRole="admin">
              <AdminFRMDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/hotel-manager" element={<HotelManagerDashboard />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </LocationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
