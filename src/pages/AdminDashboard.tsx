import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Shield, CheckCircle, BarChart3, Settings, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      setUser(data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-midnight via-midnight-light to-midnight">
      <nav className="glass-panel border-b border-glass px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-cyan">JaagaX Admin</h1>
          <Button onClick={handleSignOut} variant="ghost" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Admin Control Panel
          </h2>
          <p className="text-muted-foreground">Manage platform and verifications</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          <Card className="glass-panel border-glass p-6 hover:shadow-glow-cyan transition-all cursor-pointer">
            <CheckCircle className="w-8 h-8 text-cyan mb-4" />
            <h3 className="text-xl font-semibold mb-2">Verify Properties</h3>
            <p className="text-muted-foreground text-sm">Review pending listings</p>
          </Card>

          <Card className="glass-panel border-glass p-6 hover:shadow-glow-cyan transition-all cursor-pointer">
            <Shield className="w-8 h-8 text-cyan mb-4" />
            <h3 className="text-xl font-semibold mb-2">RERA Verification</h3>
            <p className="text-muted-foreground text-sm">Approve builder docs</p>
          </Card>

          <Card className="glass-panel border-glass p-6 hover:shadow-glow-cyan transition-all cursor-pointer">
            <BarChart3 className="w-8 h-8 text-cyan mb-4" />
            <h3 className="text-xl font-semibold mb-2">Analytics</h3>
            <p className="text-muted-foreground text-sm">Platform insights</p>
          </Card>

          <Card className="glass-panel border-glass p-6 hover:shadow-glow-cyan transition-all cursor-pointer">
            <Settings className="w-8 h-8 text-cyan mb-4" />
            <h3 className="text-xl font-semibold mb-2">Settings</h3>
            <p className="text-muted-foreground text-sm">Configure platform</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
