import { useNavigate } from "react-router-dom";
import { Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, setWorkspacePreference, getWorkspacePreference } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const ADMIN_ROUTE: Record<string, string> = {
  admin: "/dashboard/admin",
  country_admin: "/dashboard/admin/country",
  state_admin: "/dashboard/admin/state",
  district_admin: "/dashboard/admin/district",
};

const ADMIN_LABEL: Record<string, string> = {
  admin: "Global Admin",
  country_admin: "Country Admin",
  state_admin: "State Admin",
  district_admin: "District Admin",
};

/**
 * Shown only for users who are BOTH an agent and an admin (approved level upgrade).
 * Lets them jump between the agent workspace and their admin workspace without
 * losing either set of features.
 */
export default function WorkspaceSwitcher({ className }: { className?: string }) {
  const { isAgentAdmin, adminRole } = useAuth();
  const navigate = useNavigate();

  if (!isAgentAdmin || !adminRole) return null;

  const current = getWorkspacePreference() === "admin" ? "admin" : "agent";

  const go = (workspace: "agent" | "admin") => {
    setWorkspacePreference(workspace);
    navigate(workspace === "agent" ? "/dashboard/agent" : ADMIN_ROUTE[adminRole] ?? "/dashboard/admin");
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2",
        className,
      )}
    >
      <Badge variant="secondary" className="gap-1">
        <Shield className="h-3 w-3" /> Agent + {ADMIN_LABEL[adminRole] ?? "Admin"}
      </Badge>
      <div className="ml-auto flex items-center gap-1">
        <Button
          size="sm"
          variant={current === "agent" ? "default" : "ghost"}
          className="gap-1"
          onClick={() => go("agent")}
        >
          <Users className="h-3.5 w-3.5" /> Agent workspace
        </Button>
        <Button
          size="sm"
          variant={current === "admin" ? "default" : "ghost"}
          className="gap-1"
          onClick={() => go("admin")}
        >
          <Shield className="h-3.5 w-3.5" /> Admin workspace
        </Button>
      </div>
    </div>
  );
}
