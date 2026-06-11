import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";
import Navigation from "@/components/Navigation";
import SEO from "@/components/SEO";

const ComingSoon = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const featureName = (location.state as { featureName?: string } | null)?.featureName;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Feature Not Developed Yet — JAAGA X" description="This feature is under development." canonicalPath={location.pathname} />
      <Navigation />
      <main className="container mx-auto px-4 py-24 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Feature Not Developed Yet</h1>
        {featureName && (
          <p className="text-sm uppercase tracking-wider text-primary mb-2">{featureName}</p>
        )}
        <p className="text-muted-foreground max-w-md mb-8">
          This feature is currently under development and will be available in a future release.
        </p>
        <Button onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Button>
      </main>
    </div>
  );
};

export default ComingSoon;
