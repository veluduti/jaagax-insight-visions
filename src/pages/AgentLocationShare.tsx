import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import AgentLocationSharing from "@/components/agents/AgentLocationSharing";

const AgentLocationShare = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <AgentLocationSharing />
      <Footer />
    </div>
  );
};

export default AgentLocationShare;
