import { useNavigate } from "react-router-dom";
import { ArrowLeft, Luggage } from "lucide-react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import PackageBuilder from "@/components/smartstays/PackageBuilder";

export default function AgentSmartStays() {
  const { user } = useAuth() as any;
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <Button variant="ghost" size="sm" onClick={() => nav("/dashboard/agent")} className="mb-3"><ArrowLeft className="h-4 w-4 mr-1" />Agent dashboard</Button>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-4"><Luggage className="h-6 w-6 text-primary" />My Smart Stays</h1>
        {user?.id ? <PackageBuilder userId={user.id} /> : <p className="text-muted-foreground">Loading…</p>}
      </main>
    </div>
  );
}
