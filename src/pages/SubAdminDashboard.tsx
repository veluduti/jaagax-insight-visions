import AdminHierarchyPanel from "@/components/admin/AdminHierarchyPanel";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  title: string;
  subtitle?: string;
}

export default function SubAdminDashboard({ title, subtitle }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Dashboard scope is coming soon. Use the panel below to manage your sub-admins.
          </CardContent>
        </Card>
        <AdminHierarchyPanel />
      </div>
    </div>
  );
}

export const CountryAdminDashboard = () => (
  <SubAdminDashboard title="Country Admin Dashboard" subtitle="Manage state admins in your country." />
);
export const StateAdminDashboard = () => (
  <SubAdminDashboard title="State Admin Dashboard" subtitle="Manage district admins in your state." />
);
export const DistrictAdminDashboard = () => (
  <SubAdminDashboard title="District Admin Dashboard" subtitle="Your district scope." />
);
