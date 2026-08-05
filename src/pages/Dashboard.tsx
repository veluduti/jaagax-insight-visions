import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const { user, role, loading, approvalStatus, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (role) {
        switch (role) {
          case "buyer":
          case "customer":
          case "seller":
          case "builder":
            navigate("/dashboard/customer");
            break;
          case "agent":
            navigate("/dashboard/agent");
            break;

          case "admin":
            navigate("/dashboard/admin");
            break;
          case "country_admin":
            navigate("/dashboard/admin/country");
            break;
          case "state_admin":
            navigate("/dashboard/admin/state");
            break;
          case "district_admin":
            navigate("/dashboard/admin/district");
            break;
          case "hotel_manager":
            navigate("/partners/dashboard");
            break;
          default:
            navigate("/");
        }
      }
    }
  }, [user, role, loading, navigate]);

  // User is logged in but has no role — pending approval
  if (!loading && user && !role && approvalStatus === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
        <Card className="glass-panel border-primary/20 p-8 max-w-md w-full text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Account Pending Approval</h2>
          <p className="text-muted-foreground mb-6">
            Your account is awaiting admin approval. You'll be able to access your dashboard once approved.
          </p>
          <Button variant="outline" onClick={() => signOut()} className="w-full">
            Sign Out
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    </div>
  );
};

export default Dashboard;
