import AdminHierarchyPanel from "@/components/admin/AdminHierarchyPanel";
import AssignAgentPanel from "@/components/admin/AssignAgentPanel";
import VerificationPanel from "@/components/admin/VerificationPanel";
import AgentVerifiedReviewPanel from "@/components/admin/AgentVerifiedReviewPanel";
import PropertyDocumentsPanel from "@/components/admin/PropertyDocumentsPanel";
import PriceDropQueue from "@/components/admin/PriceDropQueue";
import ReportedListingsPanel from "@/components/admin/ReportedListingsPanel";
import AllListingsPanel from "@/components/admin/AllListingsPanel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { Shield, Home, CheckCircle, FileText, TrendingDown, AlertCircle, List, Users } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function DashboardShell({ title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * DISTRICT ADMIN — operational owner for property workflow.
 * Full capabilities identical to Global Admin, RLS auto-scopes to their district.
 */
export const DistrictAdminDashboard = () => (
  <AdminPanel
    title="District Admin Dashboard"
    subtitle="You are the operational owner for properties in your district."
  />
);

/**
 * COUNTRY / STATE ADMIN — read-only monitoring dashboards.
 * They can View, run Reports and Monitor. They cannot assign, approve or reject.
 */
function ReadOnlyMonitoringDashboard({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <DashboardShell title={title} subtitle={subtitle}>
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 text-sm text-muted-foreground">
          You have <strong>View, Reports and Monitoring</strong> access for your scope. All operational property
          actions — Assign Agent, Approve, Reject — are performed by the District Admin.
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5"><List className="h-4 w-4" />Listings</TabsTrigger>
          <TabsTrigger value="agent-verified" className="gap-1.5"><CheckCircle className="h-4 w-4" />Agent-Verified</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5"><FileText className="h-4 w-4" />Reports</TabsTrigger>
          <TabsTrigger value="projects" className="gap-1.5"><Home className="h-4 w-4" />Projects</TabsTrigger>
          <TabsTrigger value="admins" className="gap-1.5"><Users className="h-4 w-4" />Admins</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4"><AllListingsPanel /></TabsContent>
        <TabsContent value="agent-verified" className="mt-4"><AgentVerifiedReviewPanel readOnly /></TabsContent>
        <TabsContent value="reports" className="mt-4"><ReportedListingsPanel /></TabsContent>
        <TabsContent value="projects" className="mt-4"><VerificationPanel readOnly /></TabsContent>
        <TabsContent value="admins" className="mt-4"><AdminHierarchyPanel /></TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

import AdminPanel from "@/pages/AdminPanel";

export const CountryAdminDashboard = () => (
  <AdminPanel
    title="Country Admin Dashboard"
    subtitle="Monitor property activity across your country. Operational actions are performed by District Admins."
  />
);

export const StateAdminDashboard = () => (
  <AdminPanel
    title="State Admin Dashboard"
    subtitle="Monitor property activity across your state. Operational actions are performed by District Admins."
  />
);

// Kept for backward compatibility with older imports.
export default function SubAdminDashboard({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <DashboardShell title={title} subtitle={subtitle}>
      <AdminHierarchyPanel />
    </DashboardShell>
  );
}
