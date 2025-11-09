import { motion } from "framer-motion";
import { Phone, MessageCircle, Mail, Award, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AgentCardProps {
  agent: {
    id: number;
    agency_name: string;
    languages: string;
    sales_count: number;
    name: string;
    photo_url: string;
  };
  propertyId: number;
}

const AgentCard = ({ agent, propertyId }: AgentCardProps) => {
  const navigate = useNavigate();

  const handleCall = () => {
    window.location.href = `tel:+919876543210`;
    toast.success("Opening dialer...");
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Hi ${agent.name}, I'm interested in property ID: ${propertyId}`
    );
    window.open(`https://wa.me/919876543210?text=${message}`, "_blank");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-panel rounded-xl p-6 sticky top-[400px]"
    >
      <h3 className="text-lg font-bold mb-4">Contact Agent</h3>

      <div className="flex items-start gap-4 mb-4">
        <Avatar className="h-16 w-16 ring-2 ring-primary">
          <AvatarImage src={agent.photo_url} alt={agent.name} />
          <AvatarFallback>{agent.name?.charAt(0) || 'A'}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h4 className="font-semibold text-lg">{agent.name}</h4>
          <p className="text-sm text-muted-foreground">{agent.agency_name}</p>
          <div className="flex items-center gap-1 mt-1">
            <Award className="h-3 w-3 text-primary" />
            <span className="text-xs text-primary font-medium">{agent.sales_count} sales</span>
          </div>
        </div>
      </div>

      {/* Languages */}
      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
        <Languages className="h-4 w-4" />
        <span>{agent.languages}</span>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button className="w-full gap-2" size="lg" onClick={handleCall}>
          <Phone className="h-4 w-4" />
          Call Agent
        </Button>
        <Button 
          variant="outline" 
          className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600" 
          size="lg"
          onClick={handleWhatsApp}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
        <Button 
          variant="ghost" 
          className="w-full gap-2"
          onClick={() => navigate(`/agent/${agent.id}`)}
        >
          <Mail className="h-4 w-4" />
          View Profile
        </Button>
      </div>

      {/* Trust Badge */}
      <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
        <p className="text-xs text-muted-foreground">Verified by JaagaX</p>
        <p className="text-sm font-semibold text-primary">Trusted Agent</p>
      </div>
    </motion.div>
  );
};

export default AgentCard;
