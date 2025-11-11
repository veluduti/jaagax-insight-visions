import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MobileNav from "./components/MobileNav";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import PropertyDetail from "./pages/PropertyDetail";
import Transactions from "./pages/Transactions";
import TransactionsCity from "./pages/TransactionsCity";
import TransactionsLocality from "./pages/TransactionsLocality";
import TrustScore from "./pages/TrustScore";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import PropertyValuation from "./pages/PropertyValuation";
import Communities from "./pages/Communities";
import CommunitiesCity from "./pages/CommunitiesCity";
import CommunitiesLocality from "./pages/CommunitiesLocality";
import Guides from "./pages/Guides";
import Events from "./pages/Events";
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
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/:city" element={<TransactionsCity />} />
          <Route path="/transactions/:city/:locality" element={<TransactionsLocality />} />
          <Route path="/trustscore" element={<TrustScore />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agent/:id" element={<AgentDetail />} />
          <Route path="/valuation" element={<PropertyValuation />} />
          <Route path="/communities" element={<Communities />} />
          <Route path="/communities/:city" element={<CommunitiesCity />} />
          <Route path="/communities/:city/:locality" element={<CommunitiesLocality />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/events" element={<Events />} />
          <Route path="/map" element={<Map />} />
          <Route path="/sell-property" element={<SellProperty />} />
          
          {/* AI Advisor Routes */}
          <Route path="/ai-advisor" element={<AIAdvisor />} />
          <Route path="/ai-advisor/results" element={<AIAdvisorResults />} />
          <Route path="/ai-advisor/:propertyId" element={<AIAdvisorProperty />} />
          
          {/* Role-based Dashboards */}
          <Route
            path="/dashboard/buyer"
            element={
              <ProtectedRoute allowedRole="buyer">
                <BuyerDashboard />
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
            path="/dashboard/builder"
            element={
              <ProtectedRoute allowedRole="builder">
                <BuilderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <MobileNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
