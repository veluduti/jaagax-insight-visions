import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuthGateProps {
  isAuthenticated: boolean;
  children: ReactNode;
  label?: string;
}

const AuthGate = ({ isAuthenticated, children, label = "Sign in to view full details" }: AuthGateProps) => {
  const navigate = useNavigate();

  if (isAuthenticated) return <>{children}</>;

  return (
    <div className="relative rounded-xl overflow-hidden">
      <div className="filter blur-md pointer-events-none select-none" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-10">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground text-center px-4">{label}</p>
        <Button onClick={() => navigate("/auth")} size="sm" variant="premium">
          Sign In to Unlock
        </Button>
      </div>
    </div>
  );
};

export default AuthGate;
