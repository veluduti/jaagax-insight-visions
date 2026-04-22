import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Lock } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AddBuilderProfileForm from "@/components/builder/AddBuilderProfileForm";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const EditBuilderProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "ok" | "denied" | "missing">("loading");

  useEffect(() => {
    const check = async () => {
      if (!id) {
        setState("missing");
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState("denied");
        return;
      }

      const [profileRes, roleRes] = await Promise.all([
        supabase.from("builder_profiles").select("user_id").eq("id", id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const profile = profileRes.data as { user_id: string | null } | null;
      const isAdmin = (roleRes.data || []).some((r: any) => r.role === "admin");

      if (!profile) {
        setState("missing");
        return;
      }
      if (isAdmin || profile.user_id === user.id) {
        setState("ok");
      } else {
        setState("denied");
      }
    };
    void check();
  }, [id]);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (state !== "ok") {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-20 flex items-center justify-center">
          <Card className="max-w-md w-full p-8 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-xl font-bold">
              {state === "missing" ? "Profile not found" : "You can't edit this profile"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {state === "missing"
                ? "This builder profile no longer exists."
                : "Only the builder who created this profile (or an admin) can edit it."}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>Go back</Button>
              <Button onClick={() => navigate("/")}>Home</Button>
            </div>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <AddBuilderProfileForm editId={id} />
      <Footer />
    </div>
  );
};

export default EditBuilderProfile;
